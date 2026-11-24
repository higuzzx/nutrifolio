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
  validCpf,
  formatCpf,
  maskCpf,
  mealTypeList,
  dayAdherence,
  adherenceSeries,
  dietTotals,
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
test('CPF validation checks digits and rejects repeated sequences', () => {
  assert.equal(validCpf('529.982.247-25'), true);
  assert.equal(validCpf('52998224725'), true);
  assert.equal(validCpf('529.982.247-24'), false);
  assert.equal(validCpf('111.111.111-11'), false);
  assert.equal(validCpf('123'), false);
  assert.equal(formatCpf('52998224725'), '529.982.247-25');
  assert.equal(formatCpf('5299'), '529.9');
  assert.equal(maskCpf('52998224725'), '***.982.247-**');
});
test('custom meal types extend defaults without duplicates', () => {
  const list = mealTypeList(['Pré-treino', 'almoco', '  '], ['pre-treino']);
  assert.equal(list.filter((t) => normalize(t) === 'almoco').length, 1);
  assert.equal(list.filter((t) => normalize(t) === 'pre-treino').length, 1);
  assert.ok(list.includes('Café da manhã'));
  assert.ok(!list.includes(''));
});
test('diet adherence matches logged meals by name on the same day', () => {
  const diet = {
    meals: [
      {
        id: 'a',
        name: 'Café da manhã',
        time: '07:00',
        items: [{ food: catalogue[4], grams: 100 }],
        substitutions: '',
        notes: '',
      },
      {
        id: 'b',
        name: 'Almoço',
        time: '12:00',
        items: [{ food: catalogue[0], grams: 150 }],
        substitutions: '',
        notes: '',
      },
    ],
  };
  const meals = [
    {
      ...meal('2026-09-08', [{ food: catalogue[0], grams: 150 }]),
      name: 'almoco',
    },
    meal('2026-09-07'),
  ];
  const day = dayAdherence(diet, meals, '2026-09-08');
  assert.deepEqual(day.done, ['b']);
  assert.equal(day.ratio, 0.5);
  assert.equal(Math.round(day.consumed.calories), 248);
  assert.equal(Math.round(dietTotals(diet).calories), 346);
  assert.deepEqual(
    adherenceSeries(diet, meals, ['2026-09-06', '2026-09-07', '2026-09-08']),
    [0, 0.5, 0.5],
  );
  assert.equal(dayAdherence({ meals: [] }, meals, '2026-09-08').ratio, 0);
});
