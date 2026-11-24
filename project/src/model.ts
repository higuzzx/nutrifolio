export type Nutrients = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};
export type Food = Nutrients & {
  id: string;
  name: string;
  emoji: string;
  barcode?: string;
  /** Foto do produto (Open Food Facts), sempre https. */
  image?: string;
  /** Origem: tabela TACO, Open Food Facts ou cadastro manual. */
  source?: 'taco' | 'off';
  category?: string;
};
export type Portion = { food: Food; grams: number };
export type Meal = {
  id: string;
  date: string;
  name: string;
  time: string;
  items: Portion[];
};
export type Measurement = {
  id: string;
  date: string;
  weight: number;
  waist?: number;
};
export type Data = {
  version: 1;
  profile: { name: string; email: string };
  goals: Nutrients & { weekly: number; weight: number; objective: string };
  meals: Meal[];
  measurements: Measurement[];
  foods: Food[];
  favorites: string[];
  reminder: string;
  onboarded: boolean;
  /** Tipos de refeição criados pelo usuário, além dos padrões. */
  mealTypes?: string[];
};
export type Role = 'patient' | 'nutritionist';
export type DietMeal = {
  id: string;
  name: string;
  time: string;
  items: Portion[];
  substitutions: string;
  notes: string;
};
export type Diet = {
  id: string;
  nutritionistId: string;
  patientId: string;
  title: string;
  notes: string;
  meals: DietMeal[];
  updatedAt: string;
};
export const defaultMealTypes = [
  'Café da manhã',
  'Almoço',
  'Lanche',
  'Jantar',
  'Ceia',
];
export const today = () => localDate(new Date());
export function localDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
export function shiftDate(date: string, days: number) {
  const d = new Date(`${date}T12:00:00`);
  d.setDate(d.getDate() + days);
  return localDate(d);
}
export const uid = () =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
export const number = (value: string) => Number(value.replace(',', '.'));
export const validDate = (value: string) =>
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  !Number.isNaN(new Date(`${value}T12:00:00`).getTime()) &&
  localDate(new Date(`${value}T12:00:00`)) === value;
export const validTime = (value: string) =>
  /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
export const normalize = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
export const zero = (): Nutrients => ({
  calories: 0,
  protein: 0,
  carbs: 0,
  fat: 0,
});
export function totals(items: Portion[]): Nutrients {
  return items.reduce(
    (a, { food, grams }) => ({
      calories: a.calories + (food.calories * grams) / 100,
      protein: a.protein + (food.protein * grams) / 100,
      carbs: a.carbs + (food.carbs * grams) / 100,
      fat: a.fat + (food.fat * grams) / 100,
    }),
    zero(),
  );
}
export function daily(meals: Meal[], date: string) {
  return totals(meals.filter((m) => m.date === date).flatMap((m) => m.items));
}
export function streak(meals: Meal[], date = today()) {
  const dates = new Set(meals.map((m) => m.date));
  let day = dates.has(date) ? date : shiftDate(date, -1),
    count = 0;
  while (dates.has(day)) {
    count++;
    day = shiftDate(day, -1);
  }
  return count;
}
export function longestStreak(meals: Meal[]) {
  const days = [...new Set(meals.map((m) => m.date))].sort();
  let best = 0,
    run = 0,
    previous = '';
  for (const day of days) {
    run = previous && shiftDate(previous, 1) === day ? run + 1 : 1;
    best = Math.max(best, run);
    previous = day;
  }
  return best;
}
export const catalogue: Food[] = [
  {
    id: 'chicken',
    name: 'Peito de frango grelhado',
    emoji: '🍗',
    calories: 165,
    protein: 31,
    carbs: 0,
    fat: 3.6,
  },
  {
    id: 'rice',
    name: 'Arroz branco cozido',
    emoji: '🍚',
    calories: 130,
    protein: 2.7,
    carbs: 28.2,
    fat: 0.3,
  },
  {
    id: 'beans',
    name: 'Feijão carioca cozido',
    emoji: '🫘',
    calories: 76,
    protein: 4.8,
    carbs: 13.6,
    fat: 0.5,
  },
  {
    id: 'egg',
    name: 'Ovo inteiro cozido',
    emoji: '🥚',
    calories: 146,
    protein: 13.3,
    carbs: 0.6,
    fat: 9.5,
  },
  {
    id: 'banana',
    name: 'Banana prata',
    emoji: '🍌',
    calories: 98,
    protein: 1.3,
    carbs: 26,
    fat: 0.1,
  },
  {
    id: 'oats',
    name: 'Aveia em flocos',
    emoji: '🥣',
    calories: 394,
    protein: 13.9,
    carbs: 66.6,
    fat: 8.5,
  },
  {
    id: 'milk',
    name: 'Leite integral',
    emoji: '🥛',
    calories: 61,
    protein: 2.9,
    carbs: 4.5,
    fat: 3.2,
  },
  {
    id: 'bread',
    name: 'Pão integral',
    emoji: '🍞',
    calories: 253,
    protein: 9.4,
    carbs: 49.9,
    fat: 3.7,
  },
  {
    id: 'apple',
    name: 'Maçã com casca',
    emoji: '🍎',
    calories: 56,
    protein: 0.3,
    carbs: 15.2,
    fat: 0,
  },
  {
    id: 'salad',
    name: 'Salada de folhas e tomate',
    emoji: '🥗',
    calories: 20,
    protein: 1.2,
    carbs: 3.5,
    fat: 0.2,
  },
  {
    id: 'potato',
    name: 'Batata-doce cozida',
    emoji: '🍠',
    calories: 77,
    protein: 0.6,
    carbs: 18.4,
    fat: 0.1,
  },
  {
    id: 'yogurt',
    name: 'Iogurte natural',
    emoji: '🥛',
    calories: 61,
    protein: 3.5,
    carbs: 4.7,
    fat: 3.3,
  },
];
export const initialData = (): Data => ({
  version: 1,
  profile: { name: '', email: '' },
  goals: {
    calories: 2300,
    protein: 150,
    carbs: 300,
    fat: 70,
    weekly: 5,
    weight: 72,
    objective: 'Manter peso',
  },
  meals: [],
  measurements: [],
  foods: [],
  favorites: [],
  reminder: '',
  onboarded: false,
});

/** Une tipos padrão, personalizados e extras sem repetir (ignora acento/caixa). */
export function mealTypeList(...groups: (string[] | undefined)[]) {
  const seen = new Set<string>(),
    out: string[] = [];
  for (const name of [defaultMealTypes, ...groups].flatMap((g) => g || [])) {
    const clean = name.trim(),
      key = normalize(clean);
    if (clean && !seen.has(key)) {
      seen.add(key);
      out.push(clean);
    }
  }
  return out;
}
export const sameMealName = (a: string, b: string) =>
  normalize(a.trim()) === normalize(b.trim());
export const cleanCpf = (value: string) => value.replace(/\D/g, '');
export function validCpf(value: string) {
  const d = cleanCpf(value);
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  const digit = (len: number) => {
    let sum = 0;
    for (let i = 0; i < len; i++) sum += Number(d[i]) * (len + 1 - i);
    const r = (sum * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return digit(9) === Number(d[9]) && digit(10) === Number(d[10]);
}
export function formatCpf(value: string) {
  const d = cleanCpf(value).slice(0, 11);
  return d
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}
/** Mostra só o miolo do CPF, como em comprovantes: ***.456.789-** */
export function maskCpf(value: string) {
  const d = cleanCpf(value);
  return d.length === 11 ? `***.${d.slice(3, 6)}.${d.slice(6, 9)}-**` : '***';
}
export const dietTotals = (diet: Pick<Diet, 'meals'>) =>
  totals(diet.meals.flatMap((m) => m.items));
/** Compara o plano com o que foi registrado em uma data. */
export function dayAdherence(
  diet: Pick<Diet, 'meals'>,
  meals: Meal[],
  date: string,
) {
  const logged = meals.filter((m) => m.date === date);
  const done = diet.meals
    .filter((dm) => logged.some((m) => sameMealName(m.name, dm.name)))
    .map((dm) => dm.id);
  return {
    planned: diet.meals.length,
    done,
    ratio: diet.meals.length ? done.length / diet.meals.length : 0,
    consumed: totals(logged.flatMap((m) => m.items)),
    target: dietTotals(diet),
  };
}
export const adherenceSeries = (
  diet: Pick<Diet, 'meals'>,
  meals: Meal[],
  days: string[],
) => days.map((d) => dayAdherence(diet, meals, d).ratio);
