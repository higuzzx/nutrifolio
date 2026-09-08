import { exportText } from '../src/export';
import { validateData } from '../src/validation';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  TextInput,
  View,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import {
  ArrowLeft,
  BarChart3,
  Bell,
  BookOpen,
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  Flame,
  Heart,
  Home,
  Menu,
  Plus,
  Settings,
  Target,
  Trash2,
  Trophy,
  UserRound,
  Utensils,
  X,
} from 'lucide-react-native';
import {
  catalogue,
  daily,
  Data,
  Food,
  initialData,
  Meal,
  normalize,
  number,
  Portion,
  shiftDate,
  streak,
  longestStreak,
  today,
  totals,
  uid,
  validDate,
  validTime,
} from '../src/model';
import { readData, writeData } from '../src/storage';
import {
  Button,
  BrandMark,
  Card,
  Chart,
  Empty,
  Field,
  fmt,
  Heading,
  IconButton,
  muted,
  orange,
  Ring,
  s,
  Txt,
} from '../src/ui';
type Page = 'Início' | 'Diário' | 'Progresso' | 'Perfil';
type Sheet =
  | 'meal'
  | 'goals'
  | 'account'
  | 'measurement'
  | 'reminder'
  | 'settings'
  | 'help'
  | 'subscription'
  | 'scanner'
  | 'custom'
  | 'report'
  | null;
const dateLabel = (d: string) =>
  new Date(`${d}T12:00:00`).toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'long',
  });
export default function App() {
  const [data, setData] = useState<Data>(initialData),
    [ready, setReady] = useState(false),
    [loadError, setLoadError] = useState(''),
    [page, setPage] = useState<Page>('Início'),
    [sheet, setSheet] = useState<Sheet>(null),
    [message, setMessage] = useState(''),
    [error, setError] = useState(''),
    [saving, setSaving] = useState(false);
  const current = useRef(data),
    busy = useRef(false),
    scanned = useRef(false);
  const [date, setDate] = useState(today()),
    [dateInput, setDateInput] = useState(today()),
    [query, setQuery] = useState(''),
    [onlyFavorites, setOnlyFavorites] = useState(false),
    [items, setItems] = useState<Portion[]>([]),
    [mealId, setMealId] = useState(''),
    [mealName, setMealName] = useState('Almoço'),
    [mealTime, setMealTime] = useState('12:00'),
    [mealDate, setMealDate] = useState(today()),
    [selected, setSelected] = useState<Food | null>(null),
    [grams, setGrams] = useState('100'),
    [editingItem, setEditingItem] = useState<number | null>(null);
  const [form, setForm] = useState<Record<string, string>>({}),
    [confirm, setConfirm] = useState<null | 'meal' | 'reset' | 'restore'>(null),
    [period, setPeriod] = useState(7),
    [progressTab, setProgressTab] = useState('Resumo');
  const [permission, requestPermission] = useCameraPermissions();
  const load = () => {
    setLoadError('');
    readData()
      .then((d) => {
        current.current = d;
        setData(d);
        setReady(true);
      })
      .catch(() =>
        setLoadError(
          'Não foi possível carregar seus dados. Tente novamente para preservar os registros.',
        ),
      );
  };
  useEffect(load, []);
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(''), 4000);
    return () => clearTimeout(timer);
  }, [message]);
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (sheet) {
        close();
        return true;
      }
      if (page !== 'Início') {
        setPage('Início');
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [sheet, page]);
  async function commit(next: Data, success = 'Salvo com sucesso') {
    if (busy.current) return false;
    busy.current = true;
    setSaving(true);
    setError('');
    try {
      await writeData(next);
      current.current = next;
      setData(next);
      setMessage(success);
      return true;
    } catch {
      setError(
        'Não foi possível salvar. Seus dados anteriores foram preservados. Tente novamente.',
      );
      return false;
    } finally {
      busy.current = false;
      setSaving(false);
    }
  }
  function close() {
    if (busy.current) return;
    setSheet(null);
    setSelected(null);
    setConfirm(null);
    setError('');
  }
  function open(value: Sheet) {
    setError('');
    setConfirm(null);
    setSheet(value);
    if (value === 'account') setForm({ ...data.profile });
    if (value === 'goals')
      setForm(
        Object.fromEntries(
          Object.entries(data.goals).map(([k, v]) => [k, String(v)]),
        ),
      );
    if (value === 'measurement')
      setForm({ date: today(), weight: '', waist: '' });
    if (value === 'reminder') setForm({ time: data.reminder || '12:00' });
    if (value === 'custom')
      setForm({
        name: '',
        calories: '',
        protein: '',
        carbs: '',
        fat: '',
        barcode: '',
      });
    if (value === 'scanner') {
      scanned.current = false;
      setForm({ barcode: '' });
    }
  }
  function startMeal(meal?: Meal) {
    setItems(meal ? meal.items.map((i) => ({ ...i })) : []);
    setMealId(meal?.id || '');
    setMealName(meal?.name || 'Almoço');
    setMealTime(meal?.time || new Date().toTimeString().slice(0, 5));
    setMealDate(meal?.date || (page === 'Diário' ? date : today()));
    setQuery('');
    setSelected(null);
    setEditingItem(null);
    setOnlyFavorites(false);
    open('meal');
  }
  const field = (k: string) => (v: string) =>
    setForm((f) => ({ ...f, [k]: v }));
  const activeDate = page === 'Diário' ? date : today(),
    dayMeals = data.meals
      .filter((m) => m.date === activeDate)
      .sort((a, b) => a.time.localeCompare(b.time)),
    sum = daily(data.meals, activeDate),
    foods = [...catalogue, ...data.foods];
  const days = Array.from({ length: period }, (_, i) =>
      shiftDate(today(), i - period + 1),
    ),
    recorded = days.filter((d) => data.meals.some((m) => m.date === d)),
    dayValues = days.map((d) => daily(data.meals, d).calories),
    sequence = streak(data.meals);
  const measures = data.measurements
    .filter((m) => m.date >= days[0] && m.date <= today())
    .sort((a, b) => a.date.localeCompare(b.date));
  const periodTotals = totals(
    data.meals.filter((m) => days.includes(m.date)).flatMap((m) => m.items),
  );
  const macroEnergy =
    periodTotals.protein * 4 + periodTotals.carbs * 4 + periodTotals.fat * 9;
  const weekly = new Set(
    data.meals
      .filter((m) => m.date >= shiftDate(today(), -6) && m.date <= today())
      .map((m) => m.date),
  ).size;
  async function saveMeal() {
    if (
      !mealName.trim() ||
      !validTime(mealTime) ||
      !validDate(mealDate) ||
      mealDate > today() ||
      !items.length
    ) {
      setError(
        'Informe nome, horário HH:MM, data válida até hoje e pelo menos um alimento.',
      );
      return;
    }
    const meal = {
      id: mealId || uid(),
      name: mealName.trim(),
      time: mealTime,
      date: mealDate,
      items,
    };
    if (
      await commit(
        {
          ...current.current,
          meals: [
            ...current.current.meals.filter((m) => m.id !== meal.id),
            meal,
          ],
        },
        'Refeição salva no diário',
      )
    ) {
      setDate(mealDate);
      setDateInput(mealDate);
      setPage('Diário');
      close();
    }
  }
  async function saveForm() {
    let next = { ...current.current };
    if (sheet === 'account') {
      if (!form.name?.trim()) {
        setError('Informe seu nome.');
        return;
      }
      if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
        setError('Informe um e-mail válido ou deixe vazio.');
        return;
      }
      next.profile = { name: form.name.trim(), email: form.email.trim() };
      next.onboarded = true;
    }
    if (sheet === 'goals') {
      const keys = ['calories', 'protein', 'carbs', 'fat', 'weekly', 'weight'];
      if (
        keys.some(
          (k) =>
            !form[k]?.trim() ||
            !Number.isFinite(number(form[k])) ||
            number(form[k]) <= 0,
        ) ||
        number(form.weekly) > 7 ||
        !Number.isInteger(number(form.weekly))
      ) {
        setError(
          'Use valores positivos e uma meta semanal inteira de 1 a 7 dias.',
        );
        return;
      }
      next.goals = {
        calories: number(form.calories),
        protein: number(form.protein),
        carbs: number(form.carbs),
        fat: number(form.fat),
        weekly: number(form.weekly),
        weight: number(form.weight),
        objective: form.objective,
      };
    }
    if (sheet === 'measurement') {
      if (
        !validDate(form.date) ||
        form.date > today() ||
        !form.weight?.trim() ||
        !Number.isFinite(number(form.weight)) ||
        number(form.weight) < 20 ||
        number(form.weight) > 500 ||
        (form.waist &&
          (!Number.isFinite(number(form.waist)) ||
            number(form.waist) <= 0 ||
            number(form.waist) > 300))
      ) {
        setError(
          'Informe data até hoje, peso entre 20 e 500 kg e cintura válida.',
        );
        return;
      }
      next.measurements = [
        ...next.measurements.filter((m) => m.date !== form.date),
        {
          id: uid(),
          date: form.date,
          weight: number(form.weight),
          ...(form.waist ? { waist: number(form.waist) } : {}),
        },
      ];
    }
    if (sheet === 'custom') {
      if (
        !form.name?.trim() ||
        ['calories', 'protein', 'carbs', 'fat'].some(
          (k) =>
            !form[k]?.trim() ||
            !Number.isFinite(number(form[k])) ||
            number(form[k]) < 0,
        ) ||
        (form.barcode && !/^\d{8,14}$/.test(form.barcode))
      ) {
        setError(
          'Preencha os nutrientes por 100 g com valores não negativos e um código válido, se houver.',
        );
        return;
      }
      const food: Food = {
        id: uid(),
        name: form.name.trim(),
        emoji: '🍽️',
        calories: number(form.calories),
        protein: number(form.protein),
        carbs: number(form.carbs),
        fat: number(form.fat),
        barcode: form.barcode || undefined,
      };
      if (food.barcode && foods.some((f) => f.barcode === food.barcode)) {
        setError('Este código já está cadastrado.');
        return;
      }
      next.foods = [...next.foods, food];
      if (await commit(next, 'Alimento cadastrado')) {
        setSheet('meal');
        setEditingItem(null);
        setSelected(food);
        setGrams('100');
      }
      return;
    }
    if (await commit(next)) close();
  }
  async function exportReport() {
    const rows = [
      'data;refeicao;horario;kcal;proteinas_g;carboidratos_g;gorduras_g',
      ...data.meals
        .filter((m) => days.includes(m.date))
        .sort((a, b) => a.date.localeCompare(b.date))
        .map((m) => {
          const t = totals(m.items);
          return [
            m.date,
            `"${m.name.replace(/"/g, '""')}"`,
            m.time,
            ...[t.calories, t.protein, t.carbs, t.fat].map((n) => n.toFixed(1)),
          ].join(';');
        }),
    ].join('\n');
    try {
      await exportText(
        'nutrifolio-relatorio.csv',
        rows,
        'text/csv;charset=utf-8',
      );
    } catch {
      setError('Não foi possível compartilhar o relatório.');
    }
  }
  async function saveReminder(enabled: boolean) {
    if (enabled && !validTime(form.time)) {
      setError('Informe um horário válido, como 12:00.');
      return;
    }
    try {
      if (Platform.OS === 'web') {
        setError(
          'Lembretes do sistema estão disponíveis no aplicativo Android ou iOS.',
        );
        return;
      }
      const N = await import('expo-notifications');
      if (enabled) {
        const p = await N.requestPermissionsAsync();
        if (!p.granted) {
          setError('Permita notificações nas configurações do aparelho.');
          return;
        }
      }
      const old = await N.getAllScheduledNotificationsAsync();
      let id: string | undefined;
      if (enabled) {
        if (Platform.OS === 'android')
          await N.setNotificationChannelAsync('meals', {
            name: 'Refeições',
            importance: N.AndroidImportance.DEFAULT,
          });
        const [hour, minute] = form.time.split(':').map(Number);
        id = await N.scheduleNotificationAsync({
          content: {
            title: 'Hora de cuidar de você 🧡',
            body: 'Registre sua refeição no Nutrifolio.',
            data: { nutrifolio: true },
          },
          trigger: {
            type: N.SchedulableTriggerInputTypes.DAILY,
            hour,
            minute,
            channelId: 'meals',
          },
        });
      }
      if (
        await commit({ ...current.current, reminder: enabled ? form.time : '' })
      ) {
        await Promise.all(
          old
            .filter((n) => n.content.data?.nutrifolio)
            .map((n) => N.cancelScheduledNotificationAsync(n.identifier)),
        );
        close();
      } else if (id) await N.cancelScheduledNotificationAsync(id);
    } catch {
      setError(
        'Não foi possível atualizar o lembrete. Tente novamente no aplicativo instalado.',
      );
    }
  }
  function barcode(code: string) {
    if (scanned.current) return;
    scanned.current = true;
    const food = foods.find((f) => f.barcode === code);
    if (food) {
      setEditingItem(null);
      setSelected(food);
      setGrams('100');
      setSheet('meal');
    } else {
      setForm({
        name: '',
        calories: '',
        protein: '',
        carbs: '',
        fat: '',
        barcode: code,
      });
      setSheet('custom');
      setMessage('Código lido. Cadastre os valores do rótulo.');
    }
  }
  const mealList = (
    <>
      {dayMeals.length ? (
        dayMeals.map((m) => (
          <Pressable
            accessibilityRole="button"
            key={m.id}
            style={s.listRow}
            onPress={() => startMeal(m)}
          >
            <View style={s.foodIcon}>
              <Utensils size={20} color={orange} />
            </View>
            <View style={{ flex: 1 }}>
              <Txt style={{ fontWeight: '500' }}>{m.name}</Txt>
              <Txt style={[s.small, { marginTop: 4 }]}>
                {m.time} · {m.items.length} alimento
                {m.items.length > 1 ? 's' : ''}
              </Txt>
            </View>
            <Txt style={s.small}>{fmt(totals(m.items).calories)} kcal</Txt>
            <ChevronRight size={18} color={muted} />
          </Pressable>
        ))
      ) : (
        <Empty
          title="Seu diário começa aqui"
          copy="Adicione sua primeira refeição e acompanhe cada passo da sua evolução."
        />
      )}
    </>
  );
  if (!ready)
    return (
      <SafeAreaView style={s.safe}>
        <View style={[s.shell, s.empty]}>
          {loadError ? (
            <>
              <Txt>{loadError}</Txt>
              <Button title="Tentar novamente" onPress={load} />
            </>
          ) : (
            <ActivityIndicator color={orange} />
          )}
        </View>
      </SafeAreaView>
    );
  return (
    <SafeAreaView style={s.safe}>
      <View style={s.shell}>
        <View style={s.header}>
          <IconButton label="Abrir perfil" onPress={() => setPage('Perfil')}>
            <Menu color="#eee" size={23} />
          </IconButton>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <BrandMark size={28} />
            <Txt style={{ fontSize: 23, fontWeight: '700' }}>
              nutri<Txt style={{ color: orange, fontSize: 23 }}>folio</Txt>
            </Txt>
          </View>
          <IconButton
            label="Abrir scanner"
            onPress={() => {
              startMeal();
              open('scanner');
            }}
          >
            <Camera color="#eee" size={23} />
          </IconButton>
        </View>
        <ScrollView
          contentContainerStyle={s.content}
          keyboardShouldPersistTaps="handled"
        >
          {page === 'Início' && (
            <>
              <View
                style={[s.row, { alignItems: 'flex-start', marginBottom: 28 }]}
              >
                <View style={{ flex: 1 }}>
                  <Txt style={s.title}>
                    Olá, {data.profile.name.split(' ')[0] || 'visitante'}{' '}
                    <Txt style={{ color: '#F8B52B' }}>✦</Txt>
                  </Txt>
                  <Txt style={[s.small, { lineHeight: 23, marginTop: 8 }]}>
                    Vamos cuidar da sua melhor{'\n'}versão hoje?
                  </Txt>
                </View>
                <IconButton label="Lembretes" onPress={() => open('reminder')}>
                  <Bell size={22} color="#eee" />
                </IconButton>
              </View>
              <Card>
                <Heading
                  title="Resumo diário"
                  action="Editar metas"
                  onPress={() => open('goals')}
                />
                <View style={[s.row, { gap: 18, marginBottom: 24 }]}>
                  <Ring value={sum.calories} goal={data.goals.calories} />
                  <View style={{ flex: 1, gap: 18 }}>
                    <View>
                      <Txt style={s.stat}>{fmt(sum.calories)}</Txt>
                      <Txt style={s.small}>Consumidas</Txt>
                    </View>
                    <View>
                      <Txt style={s.stat}>{fmt(data.goals.calories)}</Txt>
                      <Txt style={s.small}>Meta diária</Txt>
                    </View>
                  </View>
                </View>
                {(['protein', 'carbs', 'fat'] as const).map((k, i) => (
                  <View key={k} style={{ marginBottom: 14 }}>
                    <View style={s.row}>
                      <Txt style={s.small}>
                        {['Proteínas', 'Carboidratos', 'Gorduras'][i]}
                      </Txt>
                      <Txt style={s.small}>
                        {fmt(sum[k])} / {data.goals[k]} g
                      </Txt>
                    </View>
                    <View style={s.track}>
                      <View
                        style={{
                          height: 5,
                          width: `${Math.min((sum[k] / data.goals[k]) * 100, 100)}%`,
                          backgroundColor: [orange, '#EEECE8', '#73C89E'][i],
                          borderRadius: 4,
                        }}
                      />
                    </View>
                  </View>
                ))}
              </Card>
              <Heading
                title="Refeições de hoje"
                action="Ver diário"
                onPress={() => {
                  setDate(today());
                  setDateInput(today());
                  setPage('Diário');
                }}
              />
              <View style={s.list}>{mealList}</View>
              <View style={s.insight}>
                <Flame color={orange} size={25} />
                <View style={{ flex: 1 }}>
                  <Txt style={{ fontWeight: '600' }}>
                    {sequence
                      ? `${sequence} dia${sequence > 1 ? 's' : ''} de constância`
                      : 'Um registro, um novo começo'}
                  </Txt>
                  <Txt style={[s.small, { marginTop: 5 }]}>
                    Sua meta semanal: {weekly} de {data.goals.weekly} dias
                    registrados.
                  </Txt>
                </View>
              </View>
              <Button
                title="＋ Adicionar refeição"
                onPress={() => startMeal()}
              />
            </>
          )}
          {page === 'Diário' && (
            <>
              <Heading title="Diário alimentar" />
              <View style={[s.row, { marginBottom: 18 }]}>
                <IconButton
                  label="Dia anterior"
                  onPress={() => {
                    setDate(shiftDate(date, -1));
                    setDateInput(shiftDate(date, -1));
                  }}
                >
                  <ChevronLeft color="#eee" />
                </IconButton>
                <View>
                  <Txt style={{ textAlign: 'center', fontWeight: '600' }}>
                    {date === today() ? 'Hoje' : dateLabel(date)}
                  </Txt>
                  <Txt style={s.small}>{date}</Txt>
                </View>
                <IconButton
                  label="Próximo dia"
                  onPress={() => {
                    if (date < today()) {
                      setDate(shiftDate(date, 1));
                      setDateInput(shiftDate(date, 1));
                    }
                  }}
                >
                  <ChevronRight color={date >= today() ? '#444' : '#eee'} />
                </IconButton>
              </View>
              <View style={[s.row, { gap: 10, marginBottom: 20 }]}>
                <TextInput
                  accessibilityLabel="Data do diário"
                  value={dateInput}
                  onChangeText={setDateInput}
                  placeholder="AAAA-MM-DD"
                  placeholderTextColor={muted}
                  style={[s.input, { flex: 1 }]}
                />
                <Button
                  title="Ir"
                  secondary
                  onPress={() => {
                    if (validDate(dateInput) && dateInput <= today()) {
                      setDate(dateInput);
                      setError('');
                    } else
                      setError(
                        'Use uma data válida até hoje no formato AAAA-MM-DD.',
                      );
                  }}
                />
              </View>
              <View style={s.list}>{mealList}</View>
              <Card>
                <Heading title="Total do dia" />
                <Txt style={s.stat}>
                  {fmt(sum.calories)} <Txt style={s.small}>kcal</Txt>
                </Txt>
                <View style={[s.row, { marginTop: 16 }]}>
                  {(['protein', 'carbs', 'fat'] as const).map((k, i) => (
                    <View key={k}>
                      <Txt style={s.small}>
                        {['Proteínas', 'Carboidratos', 'Gorduras'][i]}
                      </Txt>
                      <Txt>{fmt(sum[k])} g</Txt>
                    </View>
                  ))}
                </View>
              </Card>
              <Button
                title="＋ Registrar refeição neste dia"
                onPress={() => startMeal()}
              />
            </>
          )}
          {page === 'Progresso' && (
            <>
              <Heading title="Seu progresso" />
              <View style={s.tabs}>
                {['Resumo', 'Peso', 'Medidas'].map((t) => (
                  <Pressable
                    key={t}
                    onPress={() => setProgressTab(t)}
                    style={[s.chip, progressTab === t && s.chipActive]}
                  >
                    <Txt style={progressTab === t ? s.accent : s.small}>
                      {t}
                    </Txt>
                  </Pressable>
                ))}
              </View>
              <View style={[s.row, { marginBottom: 20 }]}>
                <Txt style={s.small}>Período</Txt>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {[7, 30, 90].map((n) => (
                    <Pressable
                      key={n}
                      onPress={() => setPeriod(n)}
                      style={[s.chip, period === n && s.chipActive]}
                    >
                      <Txt style={period === n ? s.accent : s.small}>
                        {n} dias
                      </Txt>
                    </Pressable>
                  ))}
                </View>
              </View>
              {progressTab === 'Resumo' ? (
                <>
                  <Card>
                    <Txt style={s.small}>
                      Média de calorias · dias registrados
                    </Txt>
                    <Txt style={[s.stat, { marginTop: 8 }]}>
                      {recorded.length
                        ? fmt(
                            dayValues.reduce((a, b) => a + b, 0) /
                              recorded.length,
                          )
                        : '—'}{' '}
                      <Txt style={s.small}>kcal</Txt>
                    </Txt>
                    {recorded.length ? (
                      <Chart values={dayValues} />
                    ) : (
                      <Empty
                        title="Vamos construir seu histórico"
                        copy="Registre refeições para visualizar sua evolução."
                      />
                    )}
                    <Txt style={[s.small, { marginTop: 12 }]}>
                      De {dateLabel(days[0])} a {dateLabel(today())}. Dias sem
                      registro aparecem como zero.
                    </Txt>
                  </Card>
                  <Card>
                    <Heading title="Constância" />
                    <View style={s.row}>
                      <View>
                        <Txt style={s.stat}>{sequence} 🔥</Txt>
                        <Txt style={s.small}>dias seguidos</Txt>
                      </View>
                      <View>
                        <Txt style={s.stat}>
                          {recorded.length}/{period}
                        </Txt>
                        <Txt style={s.small}>dias registrados</Txt>
                      </View>
                    </View>
                    <View style={s.track}>
                      <View
                        style={{
                          height: 5,
                          width: `${Math.min((weekly / data.goals.weekly) * 100, 100)}%`,
                          backgroundColor: orange,
                        }}
                      />
                    </View>
                    <Txt style={s.small}>
                      Meta semanal: {weekly}/{data.goals.weekly} dias
                    </Txt>
                  </Card>
                  <Card>
                    <Heading title="Macronutrientes do período" />
                    {(['protein', 'carbs', 'fat'] as const).map((key, i) => {
                      const pct = macroEnergy
                        ? ((periodTotals[key] * (i === 2 ? 9 : 4)) /
                            macroEnergy) *
                          100
                        : 0;
                      return (
                        <View key={key} style={{ marginBottom: 16 }}>
                          <View style={s.row}>
                            <Txt style={s.small}>
                              {['Proteínas', 'Carboidratos', 'Gorduras'][i]}
                            </Txt>
                            <Txt style={s.small}>
                              {fmt(pct)}% ·{' '}
                              {fmt(
                                recorded.length
                                  ? periodTotals[key] / recorded.length
                                  : 0,
                              )}{' '}
                              g/dia
                            </Txt>
                          </View>
                          <View style={s.track}>
                            <View
                              style={{
                                height: 5,
                                width: `${pct}%`,
                                backgroundColor: [orange, '#EEECE8', '#73C89E'][
                                  i
                                ],
                              }}
                            />
                          </View>
                        </View>
                      );
                    })}
                    <Txt style={s.small}>
                      Percentuais de energia dos macros; médias por dia
                      registrado.
                    </Txt>
                  </Card>
                  <Card>
                    <Heading title="Saldo em relação à meta" />
                    <Txt style={s.stat}>
                      {recorded.length
                        ? fmt(
                            recorded.length * data.goals.calories -
                              periodTotals.calories,
                          )
                        : '—'}{' '}
                      kcal
                    </Txt>
                    <Txt style={[s.small, { lineHeight: 21, marginTop: 12 }]}>
                      Meta atual menos consumo nos dias registrados. Este saldo
                      não representa seu gasto energético.
                    </Txt>
                  </Card>
                  <Card>
                    <Heading title="Suas conquistas" />
                    {[
                      {
                        name: 'Primeiro passo',
                        ok: data.meals.length > 0,
                        copy: 'Registre sua primeira refeição',
                      },
                      {
                        name: 'Uma semana de cuidado',
                        ok: longestStreak(data.meals) >= 7,
                        copy: 'Mantenha 7 dias consecutivos',
                      },
                      {
                        name: 'Diário em dia',
                        ok: data.meals.length >= 30,
                        copy: 'Registre 30 refeições',
                      },
                    ].map((b) => (
                      <View
                        key={b.name}
                        style={[
                          s.listRow,
                          { opacity: b.ok ? 1 : 0.5, paddingHorizontal: 0 },
                        ]}
                      >
                        <Trophy color={b.ok ? '#F8B52B' : muted} />
                        <View style={{ flex: 1 }}>
                          <Txt>{b.name}</Txt>
                          <Txt style={s.small}>
                            {b.ok ? 'Conquistado' : b.copy}
                          </Txt>
                        </View>
                        {b.ok && <Check color={orange} size={20} />}
                      </View>
                    ))}
                  </Card>
                </>
              ) : (
                <>
                  <Card>
                    <Heading
                      title={
                        progressTab === 'Peso' ? 'Evolução do peso' : 'Cintura'
                      }
                    />
                    <Txt style={s.stat}>
                      {progressTab === 'Peso'
                        ? (measures[measures.length - 1]?.weight ?? '—')
                        : (measures.filter((m) => m.waist).slice(-1)[0]
                            ?.waist ?? '—')}{' '}
                      <Txt style={s.small}>
                        {progressTab === 'Peso' ? 'kg' : 'cm'}
                      </Txt>
                    </Txt>
                    <Chart
                      values={measures
                        .filter((m) => progressTab === 'Peso' || m.waist)
                        .map((m) =>
                          progressTab === 'Peso' ? m.weight : m.waist!,
                        )}
                      color={progressTab === 'Peso' ? orange : '#73C89E'}
                    />
                    <Txt style={[s.small, { marginTop: 12 }]}>
                      Meta de peso: {data.goals.weight} kg
                    </Txt>
                  </Card>
                  <Button
                    title="Registrar peso e medidas"
                    onPress={() => open('measurement')}
                  />
                  <View style={{ marginTop: 20 }}>
                    {measures.map((m) => (
                      <View key={m.id} style={s.listRow}>
                        <View style={{ flex: 1 }}>
                          <Txt>{dateLabel(m.date)}</Txt>
                          <Txt style={s.small}>
                            {m.weight} kg {m.waist ? `· ${m.waist} cm` : ''}
                          </Txt>
                        </View>
                        <IconButton
                          label="Editar medida"
                          onPress={() => {
                            open('measurement');
                            setForm({
                              date: m.date,
                              weight: String(m.weight),
                              waist: m.waist ? String(m.waist) : '',
                            });
                          }}
                        >
                          <Settings size={19} color={orange} />
                        </IconButton>
                        <IconButton
                          label="Excluir medida"
                          onPress={() =>
                            commit(
                              {
                                ...current.current,
                                measurements:
                                  current.current.measurements.filter(
                                    (x) => x.id !== m.id,
                                  ),
                              },
                              'Medida excluída',
                            )
                          }
                        >
                          <Trash2 size={19} color={muted} />
                        </IconButton>
                      </View>
                    ))}
                  </View>
                </>
              )}
            </>
          )}
          {page === 'Perfil' && (
            <>
              <Heading title="Perfil" />
              <Pressable
                style={[
                  s.row,
                  { justifyContent: 'flex-start', gap: 16, marginBottom: 28 },
                ]}
                onPress={() => open('account')}
              >
                <View style={s.avatar}>
                  <Txt
                    style={{
                      color: '#703F22',
                      fontSize: 24,
                      fontWeight: '800',
                    }}
                  >
                    {data.profile.name
                      ? data.profile.name
                          .split(' ')
                          .map((n) => n[0])
                          .slice(0, 2)
                          .join('')
                          .toUpperCase()
                      : 'N'}
                  </Txt>
                </View>
                <View style={{ flex: 1 }}>
                  <Txt style={s.heading}>
                    {data.profile.name || 'Seu perfil'}
                  </Txt>
                  <Txt style={s.small}>
                    {data.profile.email || 'Personalize sua experiência'}
                  </Txt>
                </View>
                <ChevronRight color={muted} />
              </Pressable>
              <View style={s.list}>
                {(
                  [
                    { title: 'Minha conta', key: 'account', Icon: UserRound },
                    {
                      title: 'Metas e preferências',
                      key: 'goals',
                      Icon: Target,
                    },
                    { title: 'Lembretes', key: 'reminder', Icon: Bell },
                    { title: 'Assinatura', key: 'subscription', Icon: Trophy },
                    { title: 'Relatórios', key: 'report', Icon: BarChart3 },
                    {
                      title: 'Configurações e privacidade',
                      key: 'settings',
                      Icon: Settings,
                    },
                    { title: 'Ajuda e suporte', key: 'help', Icon: BookOpen },
                  ] as const
                ).map(({ title, key, Icon }) => (
                  <Pressable
                    accessibilityRole="button"
                    key={key}
                    style={s.listRow}
                    onPress={() => open(key)}
                  >
                    <Icon size={21} color={orange} />
                    <Txt style={{ flex: 1 }}>{title}</Txt>
                    <ChevronRight color={muted} size={18} />
                  </Pressable>
                ))}
              </View>
              <Txt style={[s.small, { textAlign: 'center', marginTop: 25 }]}>
                nutrifolio · registre. acompanhe. evolua.{'\n'}Versão 1.0.0 ·
                Dados neste dispositivo
              </Txt>
            </>
          )}
          {!!error && !sheet && <Txt style={s.error}>{error}</Txt>}
        </ScrollView>
        <View style={s.nav}>
          {(
            [
              { name: 'Início', Icon: Home },
              { name: 'Diário', Icon: BookOpen },
              { name: 'Progresso', Icon: BarChart3 },
              { name: 'Perfil', Icon: UserRound },
            ] as const
          ).map(({ name, Icon }) => (
            <Pressable
              accessibilityRole="tab"
              accessibilityState={{ selected: page === name }}
              key={name}
              onPress={() => {
                setPage(name);
                setError('');
              }}
              style={s.navItem}
            >
              <Icon size={23} color={page === name ? orange : muted} />
              <Txt
                style={{
                  fontSize: 10,
                  marginTop: 6,
                  color: page === name ? orange : muted,
                }}
              >
                {name}
              </Txt>
            </Pressable>
          ))}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Adicionar refeição"
            style={s.fab}
            onPress={() => startMeal()}
          >
            <Plus size={31} color="#080808" />
          </Pressable>
        </View>
        {!!message && (
          <View accessibilityLiveRegion="polite" style={s.toast}>
            <Check size={18} color={orange} />
            <Txt style={{ flex: 1, fontSize: 13 }}>{message}</Txt>
          </View>
        )}
      </View>
      <Modal
        visible={!data.onboarded && !sheet}
        animationType="fade"
        onRequestClose={() => {}}
      >
        <SafeAreaView style={s.safe}>
          <View style={[s.shell, { justifyContent: 'center', padding: 28 }]}>
            <BrandMark size={76} />
            <Txt style={{ fontSize: 40, fontWeight: '700', marginBottom: 14 }}>
              nutri<Txt style={{ fontSize: 40, color: orange }}>folio</Txt>
            </Txt>
            <Txt style={[s.title, { marginTop: 25 }]}>
              Sua nutrição,{'\n'}na palma da mão.
            </Txt>
            <Txt style={[s.small, { lineHeight: 25, marginVertical: 22 }]}>
              Registre suas refeições, acompanhe sua evolução e construa uma
              rotina com mais cuidado.
            </Txt>
            <Button
              title="Personalizar meu perfil"
              onPress={() => open('account')}
            />
            <View style={{ height: 12 }} />
            <Button
              title="Continuar como convidado"
              secondary
              disabled={saving}
              onPress={() =>
                commit(
                  { ...current.current, onboarded: true },
                  'Bem-vindo ao Nutrifolio',
                )
              }
            />
            <Txt style={[s.small, { fontSize: 12, marginTop: 24 }]}>
              Seus registros ficam salvos neste dispositivo. Você pode
              exportá-los ou apagá-los quando quiser.
            </Txt>
            {!!error && <Txt style={s.error}>{error}</Txt>}
          </View>
        </SafeAreaView>
      </Modal>
      <Modal visible={!!sheet} animationType="slide" onRequestClose={close}>
        <SafeAreaView style={s.safe}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={s.shell}
          >
            <View style={s.header}>
              <IconButton
                label="Voltar"
                onPress={() => {
                  if (selected) {
                    setSelected(null);
                    setError('');
                  } else if (sheet === 'custom' || sheet === 'scanner') {
                    setSheet('meal');
                    setError('');
                  } else close();
                }}
              >
                <ArrowLeft color="#eee" />
              </IconButton>
              <Txt style={{ fontWeight: '600' }}>
                {selected
                  ? 'Detalhes do alimento'
                  : (
                      {
                        meal: mealId ? 'Editar refeição' : 'Nova refeição',
                        goals: 'Metas e preferências',
                        account: 'Meu perfil',
                        measurement: 'Peso e medidas',
                        reminder: 'Lembretes',
                        settings: 'Configurações',
                        help: 'Ajuda e suporte',
                        subscription: 'Assinatura',
                        scanner: 'Scanner de alimento',
                        custom: 'Cadastrar alimento',
                        report: 'Relatórios',
                      } as any
                    )[sheet || '']}
              </Txt>
              <IconButton label="Fechar" onPress={close}>
                <X color="#eee" />
              </IconButton>
            </View>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={s.content}
            >
              {sheet === 'meal' &&
                (selected ? (
                  <>
                    <View style={{ alignItems: 'center', paddingVertical: 24 }}>
                      <Txt style={{ fontSize: 85 }}>{selected.emoji}</Txt>
                    </View>
                    <Heading title={selected.name} />
                    <Pressable
                      style={s.listRow}
                      onPress={() =>
                        commit(
                          {
                            ...current.current,
                            favorites: data.favorites.includes(selected.id)
                              ? data.favorites.filter(
                                  (id) => id !== selected.id,
                                )
                              : [...data.favorites, selected.id],
                          },
                          'Favoritos atualizados',
                        )
                      }
                    >
                      <Heart
                        size={22}
                        color={orange}
                        fill={
                          data.favorites.includes(selected.id)
                            ? orange
                            : 'transparent'
                        }
                      />
                      <Txt>
                        {data.favorites.includes(selected.id)
                          ? 'Remover dos favoritos'
                          : 'Salvar nos favoritos'}
                      </Txt>
                    </Pressable>
                    <Card>
                      <Txt style={[s.small, { marginBottom: 16 }]}>
                        Informações nutricionais · por 100 g
                      </Txt>
                      {(['calories', 'protein', 'carbs', 'fat'] as const).map(
                        (k, i) => (
                          <View key={k} style={s.listRow}>
                            <Txt style={{ flex: 1 }}>
                              {
                                [
                                  'Calorias',
                                  'Proteínas',
                                  'Carboidratos',
                                  'Gorduras',
                                ][i]
                              }
                            </Txt>
                            <Txt>
                              {selected[k]} {i ? 'g' : 'kcal'}
                            </Txt>
                          </View>
                        ),
                      )}
                    </Card>
                    <Field
                      label="Quantidade (g)"
                      value={grams}
                      onChange={setGrams}
                      numeric
                    />
                    <Txt style={{ marginBottom: 18 }}>
                      Total:{' '}
                      {Number.isFinite(number(grams))
                        ? fmt((selected.calories * number(grams)) / 100)
                        : '—'}{' '}
                      kcal
                    </Txt>
                    <Button
                      title="Adicionar à refeição"
                      onPress={() => {
                        const g = number(grams);
                        if (!Number.isFinite(g) || g <= 0 || g > 10000) {
                          setError(
                            'Informe uma quantidade positiva de até 10.000 g.',
                          );
                          return;
                        }
                        setItems((v) =>
                          editingItem === null
                            ? [...v, { food: selected, grams: g }]
                            : v.map((item, i) =>
                                i === editingItem
                                  ? { food: selected, grams: g }
                                  : item,
                              ),
                        );
                        setEditingItem(null);
                        setSelected(null);
                        setError('');
                      }}
                    />
                  </>
                ) : (
                  <>
                    <Field
                      label="Nome da refeição"
                      value={mealName}
                      onChange={setMealName}
                    />
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      style={{ marginBottom: 16 }}
                    >
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        {[
                          'Café da manhã',
                          'Almoço',
                          'Lanche',
                          'Jantar',
                          'Ceia',
                        ].map((n) => (
                          <Pressable
                            key={n}
                            style={[s.chip, mealName === n && s.chipActive]}
                            onPress={() => setMealName(n)}
                          >
                            <Txt style={s.small}>{n}</Txt>
                          </Pressable>
                        ))}
                      </View>
                    </ScrollView>
                    <View style={{ flexDirection: 'row', gap: 12 }}>
                      <View style={{ flex: 1 }}>
                        <Field
                          label="Data (AAAA-MM-DD)"
                          value={mealDate}
                          onChange={setMealDate}
                        />
                      </View>
                      <View style={{ width: 110 }}>
                        <Field
                          label="Horário (HH:MM)"
                          value={mealTime}
                          onChange={setMealTime}
                        />
                      </View>
                    </View>
                    <View style={[s.row, { gap: 10, marginBottom: 16 }]}>
                      <TextInput
                        accessibilityLabel="Buscar alimento"
                        placeholder="Buscar alimento"
                        placeholderTextColor={muted}
                        value={query}
                        onChangeText={setQuery}
                        style={[s.input, { flex: 1 }]}
                      />
                      <IconButton
                        label="Ler código de barras"
                        onPress={() => open('scanner')}
                      >
                        <Camera color={orange} />
                      </IconButton>
                    </View>
                    <View style={s.row}>
                      <Txt style={s.small}>
                        {onlyFavorites
                          ? 'Seus favoritos'
                          : 'Sugestões populares'}
                      </Txt>
                      <IconButton
                        label="Filtrar favoritos"
                        onPress={() => setOnlyFavorites(!onlyFavorites)}
                      >
                        <Heart
                          size={19}
                          color={orange}
                          fill={onlyFavorites ? orange : 'transparent'}
                        />
                      </IconButton>
                    </View>
                    {foods
                      .filter(
                        (f) =>
                          normalize(f.name).includes(normalize(query)) &&
                          (!onlyFavorites || data.favorites.includes(f.id)),
                      )
                      .slice(0, query || onlyFavorites ? 100 : 5)
                      .map((f) => (
                        <Pressable
                          key={f.id}
                          style={s.listRow}
                          onPress={() => {
                            setSelected(f);
                            setEditingItem(null);
                            setGrams('100');
                            setError('');
                          }}
                        >
                          <Txt style={{ fontSize: 30 }}>{f.emoji}</Txt>
                          <View style={{ flex: 1 }}>
                            <Txt>{f.name}</Txt>
                            <Txt style={[s.small, { marginTop: 4 }]}>
                              100 g · {f.calories} kcal
                            </Txt>
                          </View>
                          <Plus size={22} color={orange} />
                        </Pressable>
                      ))}
                    {!foods.some(
                      (f) =>
                        normalize(f.name).includes(normalize(query)) &&
                        (!onlyFavorites || data.favorites.includes(f.id)),
                    ) && (
                      <Empty
                        title="Nenhum alimento encontrado"
                        copy="Tente outra busca ou cadastre um alimento abaixo."
                      />
                    )}
                    <Button
                      title="Cadastrar outro alimento"
                      secondary
                      onPress={() => open('custom')}
                    />
                    <View style={{ height: 24 }} />
                    <Heading
                      title={`Alimentos adicionados (${items.length})`}
                    />
                    {items.map((item, i) => (
                      <View key={i} style={s.listRow}>
                        <View style={{ flex: 1 }}>
                          <Txt>{item.food.name}</Txt>
                          <Txt style={s.small}>
                            {item.grams} g ·{' '}
                            {fmt((item.food.calories * item.grams) / 100)} kcal
                          </Txt>
                        </View>
                        <IconButton
                          label={`Alterar quantidade de ${item.food.name}`}
                          onPress={() => {
                            setSelected(item.food);
                            setGrams(String(item.grams));
                            setEditingItem(i);
                          }}
                        >
                          <Settings color={orange} size={20} />
                        </IconButton>
                        <IconButton
                          label={`Remover ${item.food.name}`}
                          onPress={() =>
                            setItems((v) => v.filter((_, j) => j !== i))
                          }
                        >
                          <Trash2 color={muted} size={21} />
                        </IconButton>
                      </View>
                    ))}
                    <View style={[s.row, { marginVertical: 20 }]}>
                      <Txt>Total da refeição</Txt>
                      <Txt style={{ fontWeight: '700' }}>
                        {fmt(totals(items).calories)} kcal
                      </Txt>
                    </View>
                    <Button
                      title={saving ? 'Salvando…' : 'Salvar refeição'}
                      disabled={saving || !items.length}
                      onPress={saveMeal}
                    />
                    {mealId && (
                      <View style={{ marginTop: 12 }}>
                        <Button
                          title="Excluir refeição"
                          secondary
                          onPress={() => setConfirm('meal')}
                        />
                      </View>
                    )}
                  </>
                ))}
              {sheet === 'account' && (
                <>
                  <Txt style={[s.small, { lineHeight: 22, marginBottom: 24 }]}>
                    Seu perfil personaliza o aplicativo. Os dados ficam neste
                    dispositivo, sem necessidade de senha.
                  </Txt>
                  <Field
                    label="Nome"
                    value={form.name || ''}
                    onChange={field('name')}
                  />
                  <Field
                    label="E-mail (opcional)"
                    value={form.email || ''}
                    onChange={field('email')}
                  />
                  <Button
                    title="Salvar perfil"
                    disabled={saving}
                    onPress={saveForm}
                  />
                </>
              )}
              {sheet === 'goals' && (
                <>
                  <Card>
                    <Txt style={[s.small, { lineHeight: 22 }]}>
                      Defina suas metas pessoais ou os valores orientados pelo
                      seu nutricionista. O aplicativo acompanha os registros e
                      não prescreve dietas.
                    </Txt>
                  </Card>
                  {[
                    { k: 'calories', label: 'Meta diária (kcal)' },
                    { k: 'protein', label: 'Proteínas (g)' },
                    { k: 'carbs', label: 'Carboidratos (g)' },
                    { k: 'fat', label: 'Gorduras (g)' },
                    { k: 'weekly', label: 'Meta semanal (dias de registro)' },
                    { k: 'weight', label: 'Meta de peso (kg)' },
                  ].map((f) => (
                    <Field
                      key={f.k}
                      label={f.label}
                      value={form[f.k] || ''}
                      onChange={field(f.k)}
                      numeric
                    />
                  ))}
                  <Txt style={{ marginBottom: 12 }}>Objetivo</Txt>
                  {['Perder peso', 'Manter peso', 'Ganhar peso'].map((o) => (
                    <Pressable
                      key={o}
                      style={s.listRow}
                      onPress={() => field('objective')(o)}
                    >
                      <Txt style={{ flex: 1 }}>{o}</Txt>
                      {form.objective === o && <Check color={orange} />}
                    </Pressable>
                  ))}
                  <Button
                    title="Salvar metas"
                    disabled={saving}
                    onPress={saveForm}
                  />
                </>
              )}
              {sheet === 'measurement' && (
                <>
                  <Field
                    label="Data (AAAA-MM-DD)"
                    value={form.date || ''}
                    onChange={field('date')}
                  />
                  <Field
                    label="Peso (kg)"
                    value={form.weight || ''}
                    onChange={field('weight')}
                    numeric
                  />
                  <Field
                    label="Cintura (cm, opcional)"
                    value={form.waist || ''}
                    onChange={field('waist')}
                    numeric
                  />
                  <Txt style={[s.small, { marginBottom: 20 }]}>
                    Um registro por dia. Salvar uma data existente atualiza suas
                    medidas.
                  </Txt>
                  <Button
                    title="Salvar medidas"
                    disabled={saving}
                    onPress={saveForm}
                  />
                </>
              )}
              {sheet === 'custom' && (
                <>
                  <Txt style={[s.small, { marginBottom: 20 }]}>
                    Copie os valores do rótulo por 100 g. Para líquidos, use a
                    equivalência em gramas informada pelo fabricante.
                  </Txt>
                  <Field
                    label="Nome do alimento"
                    value={form.name || ''}
                    onChange={field('name')}
                  />
                  {[
                    { k: 'calories', label: 'Calorias (kcal / 100 g)' },
                    { k: 'protein', label: 'Proteínas (g / 100 g)' },
                    { k: 'carbs', label: 'Carboidratos (g / 100 g)' },
                    { k: 'fat', label: 'Gorduras (g / 100 g)' },
                    { k: 'barcode', label: 'Código de barras (opcional)' },
                  ].map((f) => (
                    <Field
                      key={f.k}
                      label={f.label}
                      value={form[f.k] || ''}
                      onChange={field(f.k)}
                      numeric
                    />
                  ))}
                  <Button
                    title="Salvar alimento"
                    disabled={saving}
                    onPress={saveForm}
                  />
                </>
              )}
              {sheet === 'scanner' && (
                <>
                  <Txt style={[s.small, { lineHeight: 22, marginBottom: 24 }]}>
                    Posicione o código no quadro. Produtos cadastrados abrem
                    diretamente; novos produtos precisam dos dados do rótulo.
                  </Txt>
                  {permission?.granted ? (
                    <View
                      style={{
                        height: 340,
                        borderRadius: 24,
                        overflow: 'hidden',
                        borderColor: orange,
                        borderWidth: 2,
                      }}
                    >
                      <CameraView
                        style={{ flex: 1 }}
                        facing="back"
                        barcodeScannerSettings={{
                          barcodeTypes: [
                            'ean13',
                            'ean8',
                            'upc_a',
                            'upc_e',
                            'code128',
                          ],
                        }}
                        onBarcodeScanned={(r) => barcode(r.data)}
                      />
                    </View>
                  ) : (
                    <Button
                      title="Permitir acesso à câmera"
                      onPress={() =>
                        requestPermission()
                          .then((p) => {
                            if (!p.granted)
                              setError(
                                'Acesso não permitido. Você pode digitar o código abaixo.',
                              );
                          })
                          .catch(() =>
                            setError(
                              'Câmera indisponível. Digite o código abaixo.',
                            ),
                          )
                      }
                    />
                  )}
                  <View style={{ height: 24 }} />
                  <Field
                    label="Ou digite o código de barras"
                    value={form.barcode || ''}
                    onChange={field('barcode')}
                    numeric
                  />
                  <Button
                    title="Buscar código"
                    onPress={() => {
                      if (!/^\d{8,14}$/.test(form.barcode || '')) {
                        setError('Informe de 8 a 14 dígitos.');
                        return;
                      }
                      barcode(form.barcode);
                    }}
                  />
                </>
              )}
              {sheet === 'reminder' && (
                <>
                  <Card>
                    <Bell color={orange} size={30} />
                    <Txt style={[s.heading, { marginVertical: 15 }]}>
                      Um momento para cuidar de você
                    </Txt>
                    <Txt style={[s.small, { lineHeight: 22 }]}>
                      Receba um lembrete diário para registrar suas refeições no
                      aplicativo instalado.
                    </Txt>
                  </Card>
                  <Field
                    label="Horário diário (HH:MM)"
                    value={form.time || ''}
                    onChange={field('time')}
                  />
                  <Button
                    title="Ativar / atualizar lembrete"
                    disabled={saving}
                    onPress={() => saveReminder(true)}
                  />
                  {!!data.reminder && (
                    <View style={{ marginTop: 16 }}>
                      <Txt style={[s.small, { marginBottom: 12 }]}>
                        Lembrete ativo às {data.reminder}
                      </Txt>
                      <Button
                        title="Desativar lembrete"
                        secondary
                        onPress={() => saveReminder(false)}
                      />
                    </View>
                  )}
                </>
              )}
              {sheet === 'report' && (
                <>
                  <Heading title="Seu histórico em números" />
                  <View style={s.tabs}>
                    {[7, 30, 90].map((n) => (
                      <Pressable
                        key={n}
                        onPress={() => setPeriod(n)}
                        style={[s.chip, period === n && s.chipActive]}
                      >
                        <Txt>{n} dias</Txt>
                      </Pressable>
                    ))}
                  </View>
                  <Card>
                    <Txt style={s.stat}>{recorded.length} dias registrados</Txt>
                    <Txt style={[s.small, { marginTop: 12 }]}>
                      {data.meals.filter((m) => days.includes(m.date)).length}{' '}
                      refeições · {dateLabel(days[0])} a {dateLabel(today())}
                    </Txt>
                    <Txt style={[s.small, { marginTop: 12 }]}>
                      Média:{' '}
                      {recorded.length
                        ? fmt(
                            dayValues.reduce((a, b) => a + b, 0) /
                              recorded.length,
                          )
                        : 0}{' '}
                      kcal por dia registrado
                    </Txt>
                  </Card>
                  <Button
                    title="Compartilhar relatório (CSV)"
                    disabled={!recorded.length}
                    onPress={exportReport}
                  />
                </>
              )}
              {sheet === 'subscription' && (
                <Card>
                  <Trophy size={36} color={orange} />
                  <Txt style={[s.title, { marginVertical: 20 }]}>
                    Seu cuidado vem primeiro.
                  </Txt>
                  <Txt style={[s.small, { lineHeight: 24 }]}>
                    Todos os recursos deste MVP estão disponíveis gratuitamente.
                    A assinatura Premium é uma proposta para versões futuras;
                    não há cobrança ou contratação nesta versão.
                  </Txt>
                </Card>
              )}
              {sheet === 'help' && (
                <>
                  {[
                    {
                      q: 'Como registrar uma refeição?',
                      a: 'Toque no +, escolha os alimentos, informe as quantidades em gramas e salve. Você pode escolher a categoria, data e horário.',
                    },
                    {
                      q: 'Como editar ou excluir?',
                      a: 'Abra uma refeição no Início ou Diário. Ajuste os dados e salve, ou use Excluir refeição.',
                    },
                    {
                      q: 'De onde vêm os nutrientes?',
                      a: 'O catálogo inicial contém valores médios aproximados por 100 g. Marcas e preparos variam. Cadastre os valores do rótulo quando precisar de maior precisão.',
                    },
                    {
                      q: 'Meus dados ficam online?',
                      a: 'Não. Esta versão mantém os dados no dispositivo. Desinstalar o app ou limpar os dados do navegador pode apagá-los. Use a exportação em Configurações para guardar uma cópia.',
                    },
                    {
                      q: 'O aplicativo recomenda dietas?',
                      a: 'Não. As metas são preenchidas por você e não substituem acompanhamento profissional.',
                    },
                  ].map((x) => (
                    <Card key={x.q}>
                      <Txt style={[s.heading, { marginBottom: 12 }]}>{x.q}</Txt>
                      <Txt style={[s.small, { lineHeight: 23 }]}>{x.a}</Txt>
                    </Card>
                  ))}
                </>
              )}
              {sheet === 'settings' && (
                <>
                  <Card>
                    <Heading title="Privacidade e seus dados" />
                    <Txt style={[s.small, { lineHeight: 23 }]}>
                      Perfil, refeições, metas e medidas são armazenados
                      localmente. Não enviamos esses registros para servidores.
                      A câmera é usada apenas para ler códigos de barras e
                      nenhuma imagem é salva. Notificações dependem da sua
                      permissão.
                    </Txt>
                  </Card>
                  <Button
                    title="Exportar todos os dados (JSON)"
                    secondary
                    onPress={async () => {
                      try {
                        await exportText(
                          'nutrifolio-dados.json',
                          JSON.stringify(data, null, 2),
                          'application/json',
                        );
                      } catch {
                        setError('Não foi possível exportar. Tente novamente.');
                      }
                    }}
                  />
                  <View style={{ height: 20 }} />
                  <Button
                    title="Apagar todos os meus dados"
                    secondary
                    onPress={() => setConfirm('reset')}
                  />
                  <View style={{ height: 28 }} />
                  <Heading title="Restaurar uma cópia" />
                  <Txt style={[s.small, { lineHeight: 21, marginBottom: 12 }]}>
                    Cole o conteúdo do arquivo JSON exportado. A restauração
                    substitui os registros atuais. O lembrete deste aparelho
                    será mantido.
                  </Txt>
                  <TextInput
                    accessibilityLabel="Conteúdo do backup JSON"
                    multiline
                    value={form.backup || ''}
                    onChangeText={field('backup')}
                    style={[
                      s.input,
                      {
                        minHeight: 120,
                        textAlignVertical: 'top',
                        marginBottom: 12,
                      },
                    ]}
                  />
                  <Button
                    title="Verificar e restaurar"
                    secondary
                    onPress={() => {
                      try {
                        const backup = JSON.parse(form.backup || '');
                        if (!validateData(backup)) throw new Error();
                        setConfirm('restore');
                        setError('');
                      } catch {
                        setError(
                          'Cópia inválida ou incompatível. Nenhum dado foi alterado.',
                        );
                      }
                    }}
                  />
                </>
              )}
              {!!confirm && (
                <View
                  style={[s.card, { borderColor: '#9B4439', marginTop: 20 }]}
                >
                  <Txt style={s.heading}>
                    {confirm === 'restore'
                      ? 'Substituir pelos dados da cópia?'
                      : confirm === 'meal'
                        ? 'Excluir esta refeição?'
                        : 'Apagar todos os dados?'}
                  </Txt>
                  <Txt style={[s.small, { marginVertical: 16 }]}>
                    Esta ação não pode ser desfeita.
                  </Txt>
                  <Button
                    title={
                      confirm === 'restore'
                        ? 'Confirmar restauração'
                        : 'Confirmar exclusão'
                    }
                    disabled={saving}
                    onPress={async () => {
                      if (confirm === 'restore') {
                        try {
                          const backup = JSON.parse(form.backup || '');
                          if (!validateData(backup)) throw new Error();
                          if (
                            await commit(
                              { ...backup, reminder: current.current.reminder },
                              'Cópia restaurada',
                            )
                          )
                            close();
                        } catch {
                          setError('Cópia inválida. Nenhum dado foi alterado.');
                        }
                        return;
                      }
                      if (confirm === 'meal') {
                        if (
                          await commit(
                            {
                              ...current.current,
                              meals: current.current.meals.filter(
                                (m) => m.id !== mealId,
                              ),
                            },
                            'Refeição excluída',
                          )
                        )
                          close();
                      } else {
                        if (Platform.OS !== 'web') {
                          try {
                            const N = await import('expo-notifications');
                            const reminders =
                              await N.getAllScheduledNotificationsAsync();
                            await Promise.all(
                              reminders
                                .filter((n) => n.content.data?.nutrifolio)
                                .map((n) =>
                                  N.cancelScheduledNotificationAsync(
                                    n.identifier,
                                  ),
                                ),
                            );
                          } catch {
                            setError(
                              'Não foi possível desativar os lembretes. Tente novamente.',
                            );
                            return;
                          }
                        }
                        if (await commit(initialData(), 'Dados apagados')) {
                          setPage('Início');
                          close();
                        }
                      }
                    }}
                  />
                  <View style={{ height: 10 }} />
                  <Button
                    title="Cancelar"
                    secondary
                    onPress={() => setConfirm(null)}
                  />
                </View>
              )}
              {!!error && (
                <Txt accessibilityLiveRegion="polite" style={s.error}>
                  {error}
                </Txt>
              )}
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
