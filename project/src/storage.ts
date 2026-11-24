import AsyncStorage from '@react-native-async-storage/async-storage';
import { Data, initialData } from './model';
import { validateData } from './validation';
const KEY = '@nutrifolio/data/v1';
/** O convidado mantém a chave original; cada conta tem a sua. */
const keyFor = (accountId?: string | null) =>
  accountId ? `${KEY}:${accountId}` : KEY;
export async function readData(accountId?: string | null): Promise<Data> {
  const raw = await AsyncStorage.getItem(keyFor(accountId));
  if (!raw) return initialData();
  const d = JSON.parse(raw);
  if (!validateData(d))
    throw new Error('Os dados salvos não puderam ser lidos.');
  return d;
}
let queue = Promise.resolve();
export function writeData(data: Data, accountId?: string | null) {
  const next = queue
    .catch(() => {})
    .then(() => AsyncStorage.setItem(keyFor(accountId), JSON.stringify(data)));
  queue = next;
  return next;
}
