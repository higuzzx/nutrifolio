import test from 'node:test';
import assert from 'node:assert/strict';
import {
  catalogue,
  totals,
  daily,
  streak,
  shiftDate,
  validDate,
  validTime,
  normalize,
  initialData,
} from '../src/model.ts';
const meal = (date, items = []) => ({
  id: date,
  date,
  name: 'Almoço',
  time: '12:00',
  items,
});
test('proportional nutrients aggregate without rounding each portion', () => {
  const t = totals([
    { food: catalogue[0], grams: 150 },
    { food: catalogue[1], grams: 150 },
  ]);
  assert.equal(t.calories, 442.5);
  assert.equal(t.protein, 50.55);
  assert.equal(t.carbs, 42.3);
  assert.ok(Math.abs(t.fat - 5.85) < 0.0001);
});
test('daily totals exclude other dates and return zero for empty dates', () => {
  const meals = [
    meal('2026-09-08', [{ food: catalogue[0], grams: 100 }]),
    meal('2026-09-07', [{ food: catalogue[1], grams: 100 }]),
  ];
  assert.equal(daily(meals, '2026-09-08').calories, 165);
  assert.equal(daily(meals, '2026-09-06').calories, 0);
});
test('streak tolerates today not yet registered and ignores duplicates', () => {
  const meals = ['2026-09-07', '2026-09-07', '2026-09-06', '2026-09-04'].map(
    (d) => meal(d),
  );
  assert.equal(streak(meals, '2026-09-08'), 2);
  assert.equal(streak(meals, '2026-09-09'), 0);
});
test('calendar calculations handle leap days and year boundaries', () => {
  assert.equal(shiftDate('2024-03-01', -1), '2024-02-29');
  assert.equal(shiftDate('2026-01-01', -1), '2025-12-31');
  assert.equal(validDate('2026-02-30'), false);
  assert.equal(validDate('2024-02-29'), true);
  assert.equal(validDate('08/09/2026'), false);
});
test('time and accent-insensitive search', () => {
  assert.equal(validTime('23:59'), true);
  assert.equal(validTime('24:00'), false);
  assert.equal(validTime('9:00'), false);
  assert.equal(normalize('Feijão'), 'feijao');
});
test('new profiles contain no fabricated records and are independent', () => {
  const a = initialData(),
    b = initialData();
  a.meals.push(meal('2026-09-08'));
  assert.equal(b.meals.length, 0);
  assert.equal(b.measurements.length, 0);
});
