import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { Data, Diet, Food, Meal, Measurement, Role } from './model';

/**
 * Cliente da API do Nutrifolio (server/index.mjs). As regras de acesso — quem
 * vê o quê — ficam no servidor; o app só guarda o token da sessão.
 */
export type Account = {
  id: string;
  role: Role;
  name: string;
  email: string;
  /** Apenas dígitos. Vazio para nutricionistas. */
  cpf: string;
  /** Registro profissional do nutricionista (CRN). */
  crn: string;
  createdAt: string;
};
export type LinkStatus = 'pending' | 'active' | 'declined' | 'ended';
export type Link = {
  id: string;
  nutritionistId: string;
  nutritionistName: string;
  nutritionistCrn: string;
  patientCpf: string;
  /** Preenchidos somente após o aceite do paciente. */
  patientId?: string;
  patientName?: string;
  status: LinkStatus;
  createdAt: string;
  updatedAt: string;
};
export type PatientLog = {
  meals: Meal[];
  measurements: Measurement[];
  goals: Data['goals'];
  updatedAt: string;
};
export type NewAccount = {
  role: Role;
  name: string;
  email: string;
  password: string;
  cpf?: string;
  crn?: string;
};

export class BackendError extends Error {}
/** Sessão ausente, expirada ou inválida. */
export class AuthError extends BackendError {}

/**
 * Endereço da API. Defina EXPO_PUBLIC_API_URL para fixar; senão usa o mesmo
 * computador que serve o app (navegador ou Expo Go) na porta 4000.
 */
export function apiUrl() {
  const fixed = process.env.EXPO_PUBLIC_API_URL;
  if (fixed) return fixed.replace(/\/$/, '');
  if (Platform.OS === 'web' && typeof location !== 'undefined')
    return `http://${location.hostname}:4000`;
  const host = Constants.expoConfig?.hostUri?.split(':')[0];
  return `http://${host || 'localhost'}:4000`;
}

// Sessão: token da conta, ou convidado (sem servidor).
export type Session = { token: string } | { guest: true };
const SESSION = '@nutrifolio/session/v2';
let token: string | null = null;
export async function getSession(): Promise<Session | null> {
  const raw = await AsyncStorage.getItem(SESSION);
  const session: Session | null = raw ? JSON.parse(raw) : null;
  token = session && 'token' in session ? session.token : null;
  return session;
}
export async function setSession(session: Session | null) {
  token = session && 'token' in session ? session.token : null;
  if (session) await AsyncStorage.setItem(SESSION, JSON.stringify(session));
  else await AsyncStorage.removeItem(SESSION);
}

async function call<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  let res: Response;
  try {
    res = await fetch(`${apiUrl()}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
  } catch {
    throw new BackendError(
      `Não foi possível conectar ao servidor (${apiUrl()}). Verifique se ele está rodando e se o aparelho está na mesma rede.`,
    );
  } finally {
    clearTimeout(timer);
  }
  const payload = await res.json().catch(() => ({}));
  if (res.status === 401)
    throw new AuthError(payload.error || 'Faça login novamente.');
  if (!res.ok) throw new BackendError(payload.error || 'Erro no servidor.');
  return payload as T;
}

async function enter(path: string, body: unknown) {
  const r = await call<{ token: string; account: Account }>('POST', path, body);
  await setSession({ token: r.token });
  return r.account;
}

export const backend = {
  register: (input: NewAccount) => enter('/auth/register', input),
  login: (email: string, password: string) =>
    enter('/auth/login', { email, password }),
  async logout() {
    try {
      if (token) await call('POST', '/auth/logout');
    } finally {
      await setSession(null);
    }
  },
  /** Conta da sessão salva; `null` se não houver sessão válida. */
  async me() {
    if (!token) return null;
    try {
      return (await call<{ account: Account }>('GET', '/me')).account;
    } catch (e) {
      if (e instanceof AuthError) {
        await setSession(null);
        return null;
      }
      throw e;
    }
  },
  changePassword: (current: string, next: string) =>
    call('POST', '/auth/password', { current, next }),
  links: async () => (await call<{ links: Link[] }>('GET', '/links')).links,
  invitePatient: async (cpf: string) =>
    (await call<{ link: Link }>('POST', '/links', { cpf })).link,
  respondInvite: (linkId: string, accept: boolean) =>
    call('POST', `/links/${linkId}/respond`, { accept }),
  endLink: (linkId: string) => call('POST', `/links/${linkId}/end`),
  saveDiet: async (diet: Diet) =>
    (await call<{ diet: Diet }>('PUT', `/diets/${diet.patientId}`, { diet }))
      .diet,
  getDiet: async (patientId: string) =>
    (await call<{ diet: Diet | null }>('GET', `/diets/${patientId}`)).diet,
  /** Envia o diário completo do paciente (o nutricionista vê só parte dele). */
  pushData: (data: Data) => call('PUT', '/me/data', { data }),
  pullData: async () =>
    (await call<{ data: Data | null }>('GET', '/me/data')).data,
  getLog: async (patientId: string) =>
    (
      await call<{ log: PatientLog | null }>(
        'GET',
        `/patients/${patientId}/log`,
      )
    ).log,
};

export type FoodSearch = {
  taco: Food[];
  products: Food[];
  online: boolean;
  notice?: string;
};
/** Busca na TACO e na Open Food Facts (via servidor). Não exige login. */
export const foodsApi = {
  /** `products: false` responde na hora, só com a TACO. */
  search: (q: string, products = true) =>
    call<FoodSearch>(
      'GET',
      `/foods/search?q=${encodeURIComponent(q)}${products ? '' : '&products=0'}`,
    ),
  barcode: async (code: string) =>
    (await call<{ food: Food | null }>('GET', `/foods/barcode/${code}`)).food,
};

export const errorMessage = (e: unknown, fallback: string) =>
  e instanceof BackendError ? e.message : fallback;
