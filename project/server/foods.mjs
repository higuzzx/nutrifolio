// Base de alimentos do servidor:
// - TACO 4ª ed. (NEPA-UNICAMP): alimentos brasileiros genéricos, em data/taco.json.
// - Open Food Facts (br.openfoodfacts.org): produtos industrializados com foto e
//   código de barras. Respostas ficam em cache no SQLite e as buscas respeitam o
//   limite público de 10 por minuto.
import { readFileSync } from 'node:fs';

const USER_AGENT =
  process.env.OFF_USER_AGENT || 'Nutrifolio/1.1 (projeto academico)';
const CACHE_DAYS = 7;
const SEARCH_PER_MINUTE = 9;

const normalize = (s) =>
  String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const round = (n) => Math.round(n * 100) / 100;

const taco = JSON.parse(
  readFileSync(new URL('./data/taco.json', import.meta.url), 'utf8'),
).map((f) => ({ ...f, key: normalize(f.name) }));

/** Todas as palavras precisam aparecer; nomes que começam com a 1ª vêm antes. */
export function searchTaco(query, limit = 25) {
  const words = normalize(query)
    .split(/[\s,]+/)
    .filter(Boolean);
  if (!words.length) return [];
  return taco
    .filter((f) => words.every((w) => f.key.includes(w)))
    .sort(
      (a, b) =>
        Number(!a.key.startsWith(words[0])) -
          Number(!b.key.startsWith(words[0])) || a.name.length - b.name.length,
    )
    .slice(0, limit)
    .map(({ key, ...f }) => f);
}

/** Converte um produto da Open Food Facts para o formato `Food` do app. */
export function fromOff(p) {
  const n = p?.nutriments || {};
  const kcal =
    n['energy-kcal_100g'] ??
    (n['energy-kj_100g'] != null ? n['energy-kj_100g'] / 4.184 : undefined);
  const name = String(p?.product_name_pt || p?.product_name || '').trim();
  if (!name || typeof kcal !== 'number' || !Number.isFinite(kcal) || kcal < 0)
    return null;
  const brand = String(p.brands || '')
    .split(',')[0]
    .trim();
  const value = (k) => {
    const v = Number(n[k]);
    return Number.isFinite(v) && v >= 0 ? round(v) : 0;
  };
  const image = p.image_front_small_url || p.image_front_url;
  return {
    id: `off-${p.code}`,
    name:
      brand && !normalize(name).includes(normalize(brand))
        ? `${name} · ${brand}`
        : name,
    emoji: '🛒',
    calories: round(kcal),
    protein: value('proteins_100g'),
    carbs: value('carbohydrates_100g'),
    fat: value('fat_100g'),
    ...(/^\d{8,14}$/.test(p.code || '') ? { barcode: p.code } : {}),
    ...(typeof image === 'string' && image.startsWith('https://')
      ? { image }
      : {}),
    source: 'off',
  };
}

export function createFoodService(db) {
  db.exec(`CREATE TABLE IF NOT EXISTS off_cache (
    key TEXT PRIMARY KEY, json TEXT NOT NULL, fetched_at INTEGER NOT NULL)`);
  const recent = [];
  const cached = (key) => {
    const row = db
      .prepare('SELECT json, fetched_at FROM off_cache WHERE key = ?')
      .get(key);
    return row && Date.now() - row.fetched_at < CACHE_DAYS * 864e5
      ? JSON.parse(row.json)
      : undefined;
  };
  const store = (key, value) =>
    db
      .prepare(
        `INSERT INTO off_cache (key, json, fetched_at) VALUES (?, ?, ?)
         ON CONFLICT (key) DO UPDATE SET json = excluded.json, fetched_at = excluded.fetched_at`,
      )
      .run(key, JSON.stringify(value), Date.now());
  async function get(url) {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok)
      throw Object.assign(new Error(`Open Food Facts ${res.status}`), {
        status: res.status,
      });
    return res.json();
  }
  const fields =
    'code,product_name,product_name_pt,brands,nutriments,image_front_small_url';

  async function searchProducts(query) {
    const q = normalize(query).trim();
    if (q.length < 3) return { products: [], online: true };
    const key = `search:${q}`;
    const hit = cached(key);
    if (hit) return { products: hit, online: true };
    while (recent.length && Date.now() - recent[0] > 60000) recent.shift();
    if (recent.length >= SEARCH_PER_MINUTE)
      return {
        products: [],
        online: false,
        notice: 'Limite de buscas de produtos atingido. Tente em 1 minuto.',
      };
    recent.push(Date.now());
    let products = await legacySearch(q).catch(() => null);
    if (!products) products = await fallbackSearch(q).catch(() => null);
    if (!products)
      return {
        products: [],
        online: false,
        notice:
          'Base de produtos indisponível agora. Mostrando só a tabela TACO.',
      };
    store(key, products);
    return { products, online: true };
  }
  /** Busca clássica filtrada pelo Brasil; o serviço às vezes responde 503. */
  async function legacySearch(q) {
    const url =
      `https://br.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(q)}` +
      `&search_simple=1&json=1&page_size=15&fields=${fields}`;
    // Nova tentativa só para 503 (instabilidade); tempo esgotado vai ao plano B.
    const d = await get(url).catch(async (e) => {
      if (e.status !== 503) throw e;
      await new Promise((r) => setTimeout(r, 800));
      return get(url);
    });
    return (d.products || []).map(fromOff).filter(Boolean).slice(0, 12);
  }
  /** Plano B: o índice novo acha os códigos; os dados vêm da consulta por código. */
  async function fallbackSearch(q) {
    const params = new URLSearchParams({
      q: `${q} lang:pt`,
      langs: 'pt',
      page_size: '8',
      fields: 'code',
    });
    const d = await get(`https://search.openfoodfacts.org/search?${params}`);
    const codes = (d.hits || [])
      .map((h) => h.code)
      .filter((c) => /^\d{8,14}$/.test(c));
    const found = await Promise.all(codes.map((c) => byBarcode(c)));
    return found.map((r) => r.food).filter(Boolean);
  }

  async function byBarcode(code) {
    if (!/^\d{8,14}$/.test(code)) return { food: null };
    const key = `barcode:${code}`;
    const hit = cached(key);
    if (hit !== undefined) return { food: hit };
    try {
      const d = await get(
        `https://world.openfoodfacts.org/api/v2/product/${code}.json?fields=${fields}`,
      );
      const food = d.status === 1 ? fromOff({ ...d.product, code }) : null;
      store(key, food);
      return { food };
    } catch {
      return { food: null, notice: 'Base de produtos indisponível agora.' };
    }
  }
  return { searchProducts, byBarcode, legacySearch, fallbackSearch };
}
