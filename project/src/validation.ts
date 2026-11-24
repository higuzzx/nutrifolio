import { Data, validDate, validTime } from './model';
const text = (x: unknown): x is string => typeof x === 'string';
const finite = (x: unknown): x is number =>
  typeof x === 'number' && Number.isFinite(x) && x >= 0;
const nutrients = (x: any) =>
  x && ['calories', 'protein', 'carbs', 'fat'].every((k) => finite(x[k]));
export const food = (x: any) =>
  x &&
  text(x.id) &&
  text(x.name) &&
  text(x.emoji) &&
  nutrients(x) &&
  (!x.barcode || /^\d{8,14}$/.test(x.barcode)) &&
  (x.image === undefined || (text(x.image) && x.image.startsWith('https://')));
export function validateData(d: unknown): d is Data {
  const x = d as any;
  return (
    !!x &&
    x.version === 1 &&
    x.profile &&
    text(x.profile.name) &&
    text(x.profile.email) &&
    typeof x.onboarded === 'boolean' &&
    nutrients(x.goals) &&
    ['calories', 'protein', 'carbs', 'fat', 'weight'].every(
      (k) => finite(x.goals[k]) && x.goals[k] > 0,
    ) &&
    Number.isInteger(x.goals.weekly) &&
    x.goals.weekly >= 1 &&
    x.goals.weekly <= 7 &&
    text(x.goals.objective) &&
    Array.isArray(x.meals) &&
    x.meals.every(
      (m: any) =>
        m &&
        text(m.id) &&
        text(m.name) &&
        validDate(m.date) &&
        validTime(m.time) &&
        Array.isArray(m.items) &&
        m.items.length > 0 &&
        m.items.every(
          (i: any) =>
            food(i.food) && finite(i.grams) && i.grams > 0 && i.grams <= 10000,
        ),
    ) &&
    Array.isArray(x.measurements) &&
    x.measurements.every(
      (m: any) =>
        m &&
        text(m.id) &&
        validDate(m.date) &&
        finite(m.weight) &&
        m.weight >= 20 &&
        m.weight <= 500 &&
        (m.waist === undefined ||
          (finite(m.waist) && m.waist > 0 && m.waist <= 300)),
    ) &&
    Array.isArray(x.foods) &&
    x.foods.every(food) &&
    Array.isArray(x.favorites) &&
    x.favorites.every(text) &&
    text(x.reminder) &&
    (!x.reminder || validTime(x.reminder)) &&
    (x.mealTypes === undefined ||
      (Array.isArray(x.mealTypes) &&
        x.mealTypes.every((t: unknown) => text(t) && t.trim().length > 0)))
  );
}
