"""Gera server/data/taco.json a partir dos CSVs da TACO 4ª edição (NEPA-UNICAMP, 2011)
normalizados em https://github.com/raulfdm/taco-api (references/csv).

Uso: python3 scripts/build-taco.py <pasta com food.csv, categories.csv, nutrients.csv>
Valores vazios (traços / não analisado) viram 0; itens sem energia são descartados.
"""
import csv, json, sys, os

src = sys.argv[1]
emoji = {1: '🌾', 2: '🥬', 3: '🍎', 4: '🫒', 5: '🐟', 6: '🥩', 7: '🥛', 8: '🥤',
         9: '🥚', 10: '🍬', 11: '🧂', 12: '🥫', 13: '🍲', 14: '🫘', 15: '🥜'}
cats = {int(r['id']): r['name'] for r in csv.DictReader(open(os.path.join(src, 'categories.csv'), encoding='utf-8'))}
nut = {r['foodId']: r for r in csv.DictReader(open(os.path.join(src, 'nutrients.csv'), encoding='utf-8'))}
num = lambda v: round(float(v), 2) if v else 0
out = []
for f in csv.DictReader(open(os.path.join(src, 'food.csv'), encoding='utf-8')):
    n = nut.get(f['id'])
    if not n or not n['kcal']:
        continue
    c = int(f['categoryId'])
    out.append({
        'id': f"taco-{f['id']}", 'name': f['name'], 'emoji': emoji.get(c, '🍽️'),
        'category': cats[c], 'calories': num(n['kcal']), 'protein': num(n['protein']),
        'carbs': num(n['carbohydrates']), 'fat': num(n['lipids']), 'source': 'taco',
    })
dest = os.path.join(os.path.dirname(__file__), '..', 'server', 'data', 'taco.json')
json.dump(out, open(dest, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
print(f'{len(out)} alimentos -> {os.path.normpath(dest)}')
