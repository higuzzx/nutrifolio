import AsyncStorage from '@react-native-async-storage/async-storage';
import { Data, initialData } from './model';
import { validateData } from './validation';
const KEY = '@nutrifolio/data/v1';
export async function readData(): Promise<Data> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return initialData();
  const d = JSON.parse(raw);
  if (!validateData(d))
    throw new Error('Os dados salvos não puderam ser lidos.');
  return d;
}
let queue = Promise.resolve();
export function writeData(data: Data) {
  const next = queue
    .catch(() => {})
    .then(() => AsyncStorage.setItem(KEY, JSON.stringify(data)));
  queue = next;
  return next;
}
