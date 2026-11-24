// Servidor local do Nutrifolio: API JSON + SQLite, sem dependências externas.
// Uso: npm run api   (porta 4000, banco em server/nutrifolio.db)
// Variáveis: PORT, NUTRIFOLIO_DB (use ":memory:" para testes).
import { createServer } from 'node:http';
import { DatabaseSync } from 'node:sqlite';
import {
  createHash,
  randomBytes,
  randomUUID,
  scryptSync,
  timingSafeEqual,
} from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { networkInterfaces } from 'node:os';
import { createFoodService, searchTaco } from './foods.mjs';

const PORT = Number(process.env.PORT || 4000);
const DB_PATH =
  process.env.NUTRIFOLIO_DB ||
  join(dirname(fileURLToPath(import.meta.url)), 'nutrifolio.db');
const SESSION_DAYS = 30;
const MAX_BODY = 2 * 1024 * 1024;

const db = new DatabaseSync(DB_PATH);
db.exec(`
  PRAGMA foreign_keys = ON;
  CREATE TABLE IF NOT EXISTS accounts (
    id TEXT PRIMARY KEY,
    role TEXT NOT NULL CHECK (role IN ('patient', 'nutritionist')),
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    cpf TEXT NOT NULL DEFAULT '',
    crn TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL
  );
  CREATE UNIQUE INDEX IF NOT EXISTS accounts_patient_cpf
    ON accounts (cpf) WHERE role = 'patient';
  CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    account_id TEXT NOT NULL REFERENCES accounts (id) ON DELETE CASCADE,
    expires_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS links (
    id TEXT PRIMARY KEY,
    nutritionist_id TEXT NOT NULL REFERENCES accounts (id) ON DELETE CASCADE,
    patient_cpf TEXT NOT NULL,
    patient_id TEXT REFERENCES accounts (id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('pending', 'active', 'declined', 'ended')),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS diets (
    patient_id TEXT NOT NULL REFERENCES accounts (id) ON DELETE CASCADE,
    nutritionist_id TEXT NOT NULL REFERENCES accounts (id) ON DELETE CASCADE,
    json TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    PRIMARY KEY (patient_id, nutritionist_id)
  );
  CREATE TABLE IF NOT EXISTS patient_data (
    patient_id TEXT PRIMARY KEY REFERENCES accounts (id) ON DELETE CASCADE,
    json TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
`);

// ---------- utilidades ----------
class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
const now = () => new Date().toISOString();
const digits = (v) => String(v || '').replace(/\D/g, '');
function validCpf(value) {
  const d = digits(value);
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  const dv = (len) => {
    let sum = 0;
    for (let i = 0; i < len; i++) sum += Number(d[i]) * (len + 1 - i);
    const r = (sum * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return dv(9) === Number(d[9]) && dv(10) === Number(d[10]);
}
const validEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
const sha256 = (s) => createHash('sha256').update(s).digest('hex');

function hashPassword(password) {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 64);
  return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`;
}
function checkPassword(password, stored) {
  const [, salt, hash] = stored.split('$');
  const expected = Buffer.from(hash, 'hex');
  const actual = scryptSync(password, Buffer.from(salt, 'hex'), 64);
  return timingSafeEqual(expected, actual);
}
// Hash fixo para gastar o mesmo tempo quando o e-mail não existe.
const DUMMY_HASH = hashPassword(randomBytes(12).toString('hex'));

// Limite simples de tentativas de login (em memória): 5 erros em 15 min.
const attempts = new Map();
function tooManyAttempts(key) {
  const a = attempts.get(key);
  return a && a.count >= 5 && Date.now() - a.first < 15 * 60 * 1000;
}
function failAttempt(key) {
  const a = attempts.get(key);
  if (!a || Date.now() - a.first > 15 * 60 * 1000)
    attempts.set(key, { count: 1, first: Date.now() });
  else a.count++;
}

const publicAccount = (a) => ({
  id: a.id,
  role: a.role,
  name: a.name,
  email: a.email,
  cpf: a.cpf,
  crn: a.crn,
  createdAt: a.created_at,
});
function createSession(accountId) {
  const token = randomBytes(32).toString('base64url');
  const expires = new Date(Date.now() + SESSION_DAYS * 864e5).toISOString();
  db.prepare(
    'INSERT INTO sessions (token_hash, account_id, expires_at) VALUES (?, ?, ?)',
  ).run(sha256(token), accountId, expires);
  return token;
}
function authenticate(req) {
  const token = (req.headers.authorization || '').replace(/^Bearer /, '');
  if (!token) throw new HttpError(401, 'Faça login para continuar.');
  const row = db
    .prepare(
      `SELECT a.* , s.expires_at FROM sessions s
       JOIN accounts a ON a.id = s.account_id WHERE s.token_hash = ?`,
    )
    .get(sha256(token));
  if (!row || row.expires_at < now()) {
    if (row)
      db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(
        sha256(token),
      );
    throw new HttpError(401, 'Sua sessão expirou. Entre novamente.');
  }
  return { account: row, tokenHash: sha256(token) };
}
function requireRole(account, role) {
  if (account.role !== role)
    throw new HttpError(403, 'Operação não permitida.');
}
const activeLink = (nutritionistId, patientId) =>
  db
    .prepare(
      `SELECT * FROM links WHERE status = 'active'
       AND nutritionist_id = ? AND patient_id = ?`,
    )
    .get(nutritionistId, patientId);
function linkView(l) {
  const n = db
    .prepare('SELECT name, crn FROM accounts WHERE id = ?')
    .get(l.nutritionist_id);
  // O nome do paciente só aparece depois do aceite.
  const p =
    l.patient_id && l.status === 'active'
      ? db.prepare('SELECT name FROM accounts WHERE id = ?').get(l.patient_id)
      : null;
  return {
    id: l.id,
    nutritionistId: l.nutritionist_id,
    nutritionistName: n?.name || '',
    nutritionistCrn: n?.crn || '',
    patientCpf: l.patient_cpf,
    ...(p ? { patientId: l.patient_id, patientName: p.name } : {}),
    status: l.status,
    createdAt: l.created_at,
    updatedAt: l.updated_at,
  };
}
function validDiet(d) {
  const num = (x) => typeof x === 'number' && Number.isFinite(x) && x >= 0;
  return (
    d &&
    typeof d.title === 'string' &&
    d.title.trim() &&
    typeof d.notes === 'string' &&
    Array.isArray(d.meals) &&
    d.meals.length > 0 &&
    d.meals.length <= 30 &&
    d.meals.every(
      (m) =>
        m &&
        typeof m.id === 'string' &&
        typeof m.name === 'string' &&
        m.name.trim() &&
        /^([01]\d|2[0-3]):[0-5]\d$/.test(m.time) &&
        typeof m.substitutions === 'string' &&
        typeof m.notes === 'string' &&
        Array.isArray(m.items) &&
        m.items.length > 0 &&
        m.items.every(
          (i) =>
            i &&
            num(i.grams) &&
            i.grams > 0 &&
            i.grams <= 10000 &&
            i.food &&
            typeof i.food.id === 'string' &&
            typeof i.food.name === 'string' &&
            typeof i.food.emoji === 'string' &&
            ['calories', 'protein', 'carbs', 'fat'].every((k) =>
              num(i.food[k]),
            ),
        ),
    )
  );
}
const validData = (d) =>
  d &&
  d.version === 1 &&
  Array.isArray(d.meals) &&
  Array.isArray(d.measurements) &&
  d.goals;

// ---------- rotas ----------
const routes = [];
const route = (method, path, handler) => {
  const keys = [];
  const pattern = new RegExp(
    '^' + path.replace(/:(\w+)/g, (_, k) => (keys.push(k), '([^/]+)')) + '$',
  );
  routes.push({ method, pattern, keys, handler });
};

route('GET', '/health', () => ({ ok: true }));

// Alimentos: públicos (convidados também buscam).
const foods = createFoodService(db);
route('GET', '/foods/search', async ({ query }) => {
  const q = String(query.get('q') || '').slice(0, 80);
  const { products, online, notice } =
    query.get('products') === '0'
      ? { products: [], online: true }
      : await foods.searchProducts(q);
  return {
    taco: searchTaco(q),
    products,
    online,
    ...(notice ? { notice } : {}),
  };
});
route('GET', '/foods/barcode/:code', ({ params }) =>
  foods.byBarcode(params.code),
);

route('POST', '/auth/register', ({ body }) => {
  const role = body.role;
  const name = String(body.name || '').trim();
  const email = String(body.email || '')
    .trim()
    .toLowerCase();
  const password = String(body.password || '');
  const cpf = digits(body.cpf);
  const crn = String(body.crn || '').trim();
  if (!['patient', 'nutritionist'].includes(role))
    throw new HttpError(400, 'Perfil inválido.');
  if (!name) throw new HttpError(400, 'Informe seu nome.');
  if (!validEmail(email)) throw new HttpError(400, 'Informe um e-mail válido.');
  if (password.length < 8)
    throw new HttpError(400, 'A senha precisa ter pelo menos 8 caracteres.');
  if (role === 'patient' && !validCpf(cpf))
    throw new HttpError(400, 'Informe um CPF válido.');
  if (role === 'nutritionist' && !crn)
    throw new HttpError(400, 'Informe seu CRN.');
  if (db.prepare('SELECT 1 FROM accounts WHERE email = ?').get(email))
    throw new HttpError(409, 'Já existe uma conta com este e-mail.');
  if (
    role === 'patient' &&
    db
      .prepare(`SELECT 1 FROM accounts WHERE role = 'patient' AND cpf = ?`)
      .get(cpf)
  )
    throw new HttpError(409, 'Já existe uma conta de paciente com este CPF.');
  const id = randomUUID();
  db.prepare(
    `INSERT INTO accounts (id, role, name, email, password_hash, cpf, crn, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    role,
    name,
    email,
    hashPassword(password),
    role === 'patient' ? cpf : '',
    crn,
    now(),
  );
  const account = db.prepare('SELECT * FROM accounts WHERE id = ?').get(id);
  return { token: createSession(id), account: publicAccount(account) };
});

route('POST', '/auth/login', ({ body }) => {
  const email = String(body.email || '')
    .trim()
    .toLowerCase();
  const password = String(body.password || '');
  if (tooManyAttempts(email))
    throw new HttpError(
      429,
      'Muitas tentativas. Aguarde 15 minutos e tente de novo.',
    );
  const account = db
    .prepare('SELECT * FROM accounts WHERE email = ?')
    .get(email);
  const ok = checkPassword(password, account?.password_hash || DUMMY_HASH);
  if (!account || !ok) {
    failAttempt(email);
    throw new HttpError(401, 'E-mail ou senha incorretos.');
  }
  attempts.delete(email);
  return { token: createSession(account.id), account: publicAccount(account) };
});

route('POST', '/auth/logout', ({ auth }) => {
  db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(auth().tokenHash);
  return { ok: true };
});

route('GET', '/me', ({ auth }) => ({ account: publicAccount(auth().account) }));

route('POST', '/auth/password', ({ auth, body }) => {
  const { account, tokenHash } = auth();
  if (!checkPassword(String(body.current || ''), account.password_hash))
    throw new HttpError(400, 'Senha atual incorreta.');
  if (String(body.next || '').length < 8)
    throw new HttpError(
      400,
      'A nova senha precisa ter pelo menos 8 caracteres.',
    );
  db.prepare('UPDATE accounts SET password_hash = ? WHERE id = ?').run(
    hashPassword(body.next),
    account.id,
  );
  // Encerra as outras sessões.
  db.prepare(
    'DELETE FROM sessions WHERE account_id = ? AND token_hash <> ?',
  ).run(account.id, tokenHash);
  return { ok: true };
});

route('GET', '/links', ({ auth }) => {
  const { account } = auth();
  const rows =
    account.role === 'nutritionist'
      ? db
          .prepare(
            `SELECT * FROM links WHERE nutritionist_id = ? AND status <> 'ended' ORDER BY created_at`,
          )
          .all(account.id)
      : db
          .prepare(
            `SELECT * FROM links WHERE (status = 'pending' AND patient_cpf = ?)
             OR (status = 'active' AND patient_id = ?) ORDER BY created_at`,
          )
          .all(account.cpf, account.id);
  return { links: rows.map(linkView) };
});

route('POST', '/links', ({ auth, body }) => {
  const { account } = auth();
  requireRole(account, 'nutritionist');
  const cpf = digits(body.cpf);
  if (!validCpf(cpf)) throw new HttpError(400, 'Informe um CPF válido.');
  const existing = db
    .prepare(
      `SELECT status FROM links WHERE nutritionist_id = ? AND patient_cpf = ?
       AND status IN ('pending', 'active')`,
    )
    .get(account.id, cpf);
  if (existing)
    throw new HttpError(
      409,
      existing.status === 'active'
        ? 'Este paciente já está vinculado a você.'
        : 'Já existe um convite pendente para este CPF.',
    );
  // Não revela se o CPF já tem conta: o convite espera o paciente.
  const id = randomUUID();
  db.prepare(
    `INSERT INTO links (id, nutritionist_id, patient_cpf, status, created_at, updated_at)
     VALUES (?, ?, ?, 'pending', ?, ?)`,
  ).run(id, account.id, cpf, now(), now());
  return {
    link: linkView(db.prepare('SELECT * FROM links WHERE id = ?').get(id)),
  };
});

route('POST', '/links/:id/respond', ({ auth, body, params }) => {
  const { account } = auth();
  requireRole(account, 'patient');
  const link = db.prepare('SELECT * FROM links WHERE id = ?').get(params.id);
  if (!link || link.patient_cpf !== account.cpf || link.status !== 'pending')
    throw new HttpError(404, 'Convite não encontrado ou já respondido.');
  db.exec('BEGIN');
  try {
    if (body.accept) {
      // Um nutricionista ativo por vez.
      db.prepare(
        `UPDATE links SET status = 'ended', updated_at = ? WHERE patient_id = ? AND status = 'active'`,
      ).run(now(), account.id);
      db.prepare(
        `UPDATE links SET status = 'active', patient_id = ?, updated_at = ? WHERE id = ?`,
      ).run(account.id, now(), link.id);
    } else
      db.prepare(
        `UPDATE links SET status = 'declined', updated_at = ? WHERE id = ?`,
      ).run(now(), link.id);
    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
  return { ok: true };
});

route('POST', '/links/:id/end', ({ auth, params }) => {
  const { account } = auth();
  const link = db.prepare('SELECT * FROM links WHERE id = ?').get(params.id);
  const allowed =
    link &&
    (link.nutritionist_id === account.id ||
      (account.role === 'patient' &&
        (link.patient_id === account.id || link.patient_cpf === account.cpf)));
  if (!allowed) throw new HttpError(404, 'Vínculo não encontrado.');
  db.prepare(
    `UPDATE links SET status = 'ended', updated_at = ? WHERE id = ?`,
  ).run(now(), link.id);
  return { ok: true };
});

route('PUT', '/diets/:patientId', ({ auth, body, params }) => {
  const { account } = auth();
  requireRole(account, 'nutritionist');
  if (!activeLink(account.id, params.patientId))
    throw new HttpError(403, 'Este paciente não está vinculado a você.');
  if (!validDiet(body.diet)) throw new HttpError(400, 'Dieta inválida.');
  const diet = {
    ...body.diet,
    id: body.diet.id || randomUUID(),
    nutritionistId: account.id,
    patientId: params.patientId,
    updatedAt: now(),
  };
  db.prepare(
    `INSERT INTO diets (patient_id, nutritionist_id, json, updated_at) VALUES (?, ?, ?, ?)
     ON CONFLICT (patient_id, nutritionist_id) DO UPDATE SET json = excluded.json, updated_at = excluded.updated_at`,
  ).run(params.patientId, account.id, JSON.stringify(diet), diet.updatedAt);
  return { diet };
});

route('GET', '/diets/:patientId', ({ auth, params }) => {
  const { account } = auth();
  const link =
    account.role === 'nutritionist'
      ? activeLink(account.id, params.patientId)
      : account.id === params.patientId
        ? db
            .prepare(
              `SELECT * FROM links WHERE status = 'active' AND patient_id = ?`,
            )
            .get(account.id)
        : null;
  if (!link) return { diet: null };
  const row = db
    .prepare(
      'SELECT json FROM diets WHERE patient_id = ? AND nutritionist_id = ?',
    )
    .get(params.patientId, link.nutritionist_id);
  return { diet: row ? JSON.parse(row.json) : null };
});

// Diário completo do paciente (para restaurar em outro aparelho).
route('PUT', '/me/data', ({ auth, body }) => {
  const { account } = auth();
  requireRole(account, 'patient');
  if (!validData(body.data)) throw new HttpError(400, 'Dados inválidos.');
  db.prepare(
    `INSERT INTO patient_data (patient_id, json, updated_at) VALUES (?, ?, ?)
     ON CONFLICT (patient_id) DO UPDATE SET json = excluded.json, updated_at = excluded.updated_at`,
  ).run(account.id, JSON.stringify(body.data), now());
  return { ok: true };
});
route('GET', '/me/data', ({ auth }) => {
  const { account } = auth();
  requireRole(account, 'patient');
  const row = db
    .prepare('SELECT json FROM patient_data WHERE patient_id = ?')
    .get(account.id);
  return { data: row ? JSON.parse(row.json) : null };
});

// O nutricionista vê só refeições, medidas e metas — e só com vínculo ativo.
route('GET', '/patients/:id/log', ({ auth, params }) => {
  const { account } = auth();
  requireRole(account, 'nutritionist');
  if (!activeLink(account.id, params.id))
    throw new HttpError(403, 'Paciente não vinculado.');
  const row = db
    .prepare('SELECT json, updated_at FROM patient_data WHERE patient_id = ?')
    .get(params.id);
  if (!row) return { log: null };
  const d = JSON.parse(row.json);
  return {
    log: {
      meals: d.meals,
      measurements: d.measurements,
      goals: d.goals,
      updatedAt: row.updated_at,
    },
  };
});

// ---------- servidor HTTP ----------
function send(res, status, payload) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
  });
  res.end(payload === undefined ? '' : JSON.stringify(payload));
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > MAX_BODY) {
        reject(new HttpError(413, 'Conteúdo muito grande.'));
        req.destroy();
      } else chunks.push(c);
    });
    req.on('end', () => {
      if (!chunks.length) return resolve({});
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      } catch {
        reject(new HttpError(400, 'JSON inválido.'));
      }
    });
    req.on('error', reject);
  });
}

const server = createServer(async (req, res) => {
  if (req.method === 'OPTIONS') return send(res, 204);
  const path = new URL(req.url, 'http://x').pathname;
  try {
    for (const r of routes) {
      const m = r.method === req.method && path.match(r.pattern);
      if (!m) continue;
      const params = Object.fromEntries(
        r.keys.map((k, i) => [k, decodeURIComponent(m[i + 1])]),
      );
      const body = req.method === 'GET' ? {} : await readBody(req);
      return send(
        res,
        200,
        await r.handler({
          req,
          body,
          params,
          query: new URL(req.url, 'http://x').searchParams,
          auth: () => authenticate(req),
        }),
      );
    }
    throw new HttpError(404, 'Rota não encontrada.');
  } catch (e) {
    if (e instanceof HttpError)
      return send(res, e.status, { error: e.message });
    console.error(e);
    send(res, 500, { error: 'Erro interno do servidor.' });
  }
});

server.listen(PORT, '0.0.0.0', () => {
  const ips = Object.values(networkInterfaces())
    .flat()
    .filter((i) => i && i.family === 'IPv4' && !i.internal)
    .map((i) => `http://${i.address}:${PORT}`);
  console.log(`Nutrifolio API em http://localhost:${PORT}`);
  if (ips.length) console.log(`Na rede local: ${ips.join(', ')}`);
  console.log(`Banco: ${DB_PATH}`);
});
