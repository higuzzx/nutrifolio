import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, View } from 'react-native';
import { Plus } from 'lucide-react-native';
import { FoodSearch, foodsApi } from './backend';
import { Food } from './model';
import { muted, orange, s, Txt } from './ui';

/** Busca remota com espera de digitação; só dispara a partir de 3 letras. */
export function useFoodSearch(query: string) {
  const [result, setResult] = useState<FoodSearch | null>(null),
    [loading, setLoading] = useState(false),
    [error, setError] = useState('');
  useEffect(() => {
    const q = query.trim();
    setError('');
    if (q.length < 3) {
      setResult(null);
      setLoading(false);
      return;
    }
    let alive = true;
    setLoading(true);
    setResult(null);
    const timer = setTimeout(() => {
      // TACO (local, imediata) e produtos (internet, mais lentos) em paralelo.
      foodsApi
        .search(q, false)
        .then(
          (r) =>
            alive &&
            setResult((old) => ({ ...r, products: old?.products || [] })),
        )
        .catch(
          () =>
            alive &&
            setError(
              'Sem conexão com o servidor: mostrando só os alimentos deste aparelho.',
            ),
        );
      foodsApi
        .search(q)
        .then((r) => alive && setResult(r))
        .catch(() => {})
        .finally(() => alive && setLoading(false));
    }, 450);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [query]);
  return { result, loading, error };
}

export function FoodThumb({ food, size = 36 }: { food: Food; size?: number }) {
  const [failed, setFailed] = useState(false);
  if (food.image && !failed)
    return (
      <Image
        source={{ uri: food.image }}
        onError={() => setFailed(true)}
        accessibilityIgnoresInvertColors
        style={{
          width: size,
          height: size,
          borderRadius: size / 5,
          backgroundColor: '#fff',
        }}
        resizeMode="contain"
      />
    );
  return (
    <View style={{ width: size, alignItems: 'center' }}>
      <Txt style={{ fontSize: size * 0.8 }}>{food.emoji}</Txt>
    </View>
  );
}

export function FoodRow({
  food,
  onPress,
}: {
  food: Food;
  onPress: () => void;
}) {
  return (
    <Pressable accessibilityRole="button" style={s.listRow} onPress={onPress}>
      <FoodThumb food={food} />
      <View style={{ flex: 1 }}>
        <Txt>{food.name}</Txt>
        <Txt style={[s.small, { marginTop: 4 }]}>
          100 g · {Math.round(food.calories)} kcal
          {food.source === 'taco' ? ' · TACO' : ''}
        </Txt>
      </View>
      <Plus size={22} color={orange} />
    </Pressable>
  );
}

/** Resultados da TACO e da Open Food Facts, abaixo dos alimentos locais. */
export function RemoteFoods({
  query,
  exclude = [],
  onPick,
}: {
  query: string;
  /** IDs já listados localmente. */
  exclude?: string[];
  onPick: (food: Food) => void;
}) {
  const { result, loading, error } = useFoodSearch(query);
  if (query.trim().length < 3) return null;
  const taco = (result?.taco || []).filter((f) => !exclude.includes(f.id));
  const products = (result?.products || []).filter(
    (f) => !exclude.includes(f.id),
  );
  return (
    <View style={{ marginTop: 8 }}>
      {loading && (
        <View
          style={[
            s.row,
            { justifyContent: 'flex-start', gap: 10, paddingVertical: 12 },
          ]}
        >
          <ActivityIndicator color={orange} />
          <Txt style={s.small}>Buscando produtos na Open Food Facts…</Txt>
        </View>
      )}
      {!!taco.length && (
        <>
          <Txt style={[s.small, { marginTop: 14 }]}>
            Tabela TACO (Unicamp) · alimentos in natura e preparados
          </Txt>
          {taco.map((f) => (
            <FoodRow key={f.id} food={f} onPress={() => onPick(f)} />
          ))}
        </>
      )}
      {!!products.length && (
        <>
          <Txt style={[s.small, { marginTop: 14 }]}>
            Produtos · Open Food Facts
          </Txt>
          {products.map((f) => (
            <FoodRow key={f.id} food={f} onPress={() => onPick(f)} />
          ))}
        </>
      )}
      {!!(error || result?.notice) && (
        <Txt style={[s.small, { color: muted, marginTop: 10, lineHeight: 20 }]}>
          {error || result?.notice}
        </Txt>
      )}
    </View>
  );
}
