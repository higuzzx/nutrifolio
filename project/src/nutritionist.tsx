import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Check,
  ChevronRight,
  ClipboardList,
  LogOut,
  Plus,
  Trash2,
  UserPlus,
  UserRound,
  Users,
  X,
} from 'lucide-react-native';
import { Account, backend, errorMessage, Link, PatientLog } from './backend';
import { FoodRow, FoodThumb, RemoteFoods } from './foodSearch';
import { ChangePassword } from './password';
import {
  adherenceSeries,
  catalogue,
  dayAdherence,
  Diet,
  DietMeal,
  dietTotals,
  Food,
  formatCpf,
  maskCpf,
  mealTypeList,
  normalize,
  number,
  shiftDate,
  today,
  totals,
  uid,
  validTime,
} from './model';
import {
  BrandMark,
  Button,
  Card,
  Chart,
  Empty,
  Field,
  fmt,
  Heading,
  IconButton,
  muted,
  orange,
  s,
  Txt,
} from './ui';

type Page = 'Pacientes' | 'Perfil';
type Sheet = 'invite' | 'patient' | 'diet' | 'food' | null;
type Overview = Record<string, { log: PatientLog | null; diet: Diet | null }>;

const defaultTimes: Record<string, string> = {
  'cafe da manha': '07:00',
  almoco: '12:00',
  lanche: '16:00',
  jantar: '19:30',
  ceia: '22:00',
};
const dateLabel = (d: string) =>
  new Date(`${d}T12:00:00`).toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'short',
  });
const macroLine = (n: {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}) =>
  `${fmt(n.calories)} kcal · P ${fmt(n.protein)} g · C ${fmt(n.carbs)} g · G ${fmt(n.fat)} g`;

export function NutritionistApp({
  account,
  onSwitchAccount,
}: {
  account: Account;
  onSwitchAccount: () => void;
}) {
  const [page, setPage] = useState<Page>('Pacientes'),
    [sheet, setSheet] = useState<Sheet>(null),
    [links, setLinks] = useState<Link[] | null>(null),
    [overview, setOverview] = useState<Overview>({}),
    [current, setCurrent] = useState<Link | null>(null),
    [draft, setDraft] = useState<Diet | null>(null),
    [cpf, setCpf] = useState(''),
    [newType, setNewType] = useState(''),
    [confirmEnd, setConfirmEnd] = useState(false),
    [error, setError] = useState(''),
    [message, setMessage] = useState(''),
    [busy, setBusy] = useState(false);
  // Seletor de alimentos do editor de dieta.
  const [target, setTarget] = useState(0),
    [query, setQuery] = useState(''),
    [picked, setPicked] = useState<Food | null>(null),
    [grams, setGrams] = useState('100'),
    [custom, setCustom] = useState<Record<string, string> | null>(null);

  async function refresh() {
    try {
      const all = await backend.links();
      const entries = await Promise.all(
        all
          .filter((l) => l.status === 'active' && l.patientId)
          .map(async (l) => {
            const [log, diet] = await Promise.all([
              backend.getLog(l.patientId!),
              backend.getDiet(l.patientId!),
            ]);
            return [l.patientId!, { log, diet }] as const;
          }),
      );
      setLinks(all);
      setOverview(Object.fromEntries(entries));
    } catch (e) {
      setLinks((l) => l || []);
      setError(errorMessage(e, 'Não foi possível carregar seus pacientes.'));
    }
  }
  useEffect(() => {
    refresh();
  }, []);
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(''), 4000);
    return () => clearTimeout(t);
  }, [message]);
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!sheet) return false;
      back();
      return true;
    });
    return () => sub.remove();
  }, [sheet, picked, custom]);

  async function run(task: () => Promise<void>, fallback: string) {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await task();
    } catch (e) {
      setError(errorMessage(e, fallback));
    } finally {
      setBusy(false);
    }
  }
  function close() {
    setSheet(null);
    setCurrent(null);
    setDraft(null);
    setConfirmEnd(false);
    setError('');
  }
  function back() {
    setError('');
    if (sheet === 'food') {
      if (picked || custom) {
        setPicked(null);
        setCustom(null);
      } else setSheet('diet');
    } else if (sheet === 'diet') setSheet('patient');
    else close();
  }
  function openPatient(link: Link) {
    setCurrent(link);
    setConfirmEnd(false);
    setError('');
    setSheet('patient');
  }
  function openDiet() {
    if (!current?.patientId) return;
    const existing = overview[current.patientId]?.diet;
    setDraft(
      existing
        ? JSON.parse(JSON.stringify(existing))
        : {
            id: '',
            nutritionistId: account.id,
            patientId: current.patientId,
            title: `Plano alimentar de ${current.patientName?.split(' ')[0] || 'paciente'}`,
            notes: '',
            meals: [],
            updatedAt: '',
          },
    );
    setNewType('');
    setError('');
    setSheet('diet');
  }
  const updateMeal = (i: number, patch: Partial<DietMeal>) =>
    setDraft((d) =>
      d
        ? {
            ...d,
            meals: d.meals.map((m, j) => (j === i ? { ...m, ...patch } : m)),
          }
        : d,
    );
  function addMeal(name: string) {
    const clean = name.trim();
    if (!clean) {
      setError('Informe o nome do tipo de refeição.');
      return;
    }
    setDraft((d) =>
      d
        ? {
            ...d,
            meals: [
              ...d.meals,
              {
                id: uid(),
                name: clean,
                time: defaultTimes[normalize(clean)] || '12:00',
                items: [],
                substitutions: '',
                notes: '',
              },
            ],
          }
        : d,
    );
    setNewType('');
    setError('');
  }
  function openFoods(i: number) {
    setTarget(i);
    setQuery('');
    setPicked(null);
    setCustom(null);
    setGrams('100');
    setError('');
    setSheet('food');
  }
  function pickFood(f: Food) {
    setPicked(f);
    setGrams('100');
  }
  function addFood() {
    const g = number(grams);
    if (!picked || !Number.isFinite(g) || g <= 0 || g > 10000) {
      setError('Informe uma quantidade positiva de até 10.000 g.');
      return;
    }
    updateMeal(target, {
      items: [
        ...(draft?.meals[target]?.items || []),
        { food: picked, grams: g },
      ],
    });
    setPicked(null);
    setSheet('diet');
  }
  function createFood() {
    const f = custom || {};
    const keys = ['calories', 'protein', 'carbs', 'fat'];
    if (
      !f.name?.trim() ||
      keys.some(
        (k) =>
          !f[k]?.trim() || !Number.isFinite(number(f[k])) || number(f[k]) < 0,
      )
    ) {
      setError(
        'Informe o nome e os nutrientes por 100 g (valores não negativos).',
      );
      return;
    }
    setPicked({
      id: uid(),
      name: f.name.trim(),
      emoji: '🍽️',
      calories: number(f.calories),
      protein: number(f.protein),
      carbs: number(f.carbs),
      fat: number(f.fat),
    });
    setCustom(null);
    setGrams('100');
    setError('');
  }
  function saveDiet() {
    if (!draft) return;
    if (!draft.title.trim()) return setError('Dê um título para a dieta.');
    if (!draft.meals.length)
      return setError('Adicione pelo menos uma refeição.');
    const bad = draft.meals.find(
      (m) => !m.name.trim() || !validTime(m.time) || !m.items.length,
    );
    if (bad)
      return setError(
        `Revise "${bad.name || 'refeição sem nome'}": precisa de nome, horário HH:MM e pelo menos um alimento.`,
      );
    run(async () => {
      const saved = await backend.saveDiet({
        ...draft,
        title: draft.title.trim(),
        meals: draft.meals.map((m) => ({ ...m, name: m.name.trim() })),
      });
      setOverview((o) => ({
        ...o,
        [saved.patientId]: {
          log: o[saved.patientId]?.log || null,
          diet: saved,
        },
      }));
      setDraft(null);
      setSheet('patient');
      setMessage('Dieta publicada para o paciente');
    }, 'Não foi possível salvar a dieta.');
  }

  const active = (links || []).filter((l) => l.status === 'active'),
    pending = (links || []).filter((l) => l.status === 'pending'),
    declined = (links || []).filter((l) => l.status === 'declined');
  const week = Array.from({ length: 7 }, (_, i) => shiftDate(today(), i - 6));
  const knownFoods = [
    ...catalogue,
    ...Object.values(overview)
      .flatMap(
        (o) => o.diet?.meals.flatMap((m) => m.items.map((i) => i.food)) || [],
      )
      .concat(draft?.meals.flatMap((m) => m.items.map((i) => i.food)) || [])
      .filter(
        (f, i, all) =>
          !catalogue.some((c) => c.id === f.id) &&
          all.findIndex((x) => x.id === f.id) === i,
      ),
  ];

  const patientRow = (l: Link) => {
    const o = l.patientId ? overview[l.patientId] : undefined;
    const today_ =
      o?.diet && o.log ? dayAdherence(o.diet, o.log.meals, today()) : null;
    return (
      <Pressable
        accessibilityRole="button"
        key={l.id}
        style={s.listRow}
        onPress={() => openPatient(l)}
      >
        <View style={s.foodIcon}>
          <UserRound size={20} color={orange} />
        </View>
        <View style={{ flex: 1 }}>
          <Txt style={{ fontWeight: '500' }}>{l.patientName}</Txt>
          <Txt style={[s.small, { marginTop: 4 }]}>
            {!o?.diet
              ? 'Sem dieta publicada'
              : today_
                ? `Hoje: ${today_.done.length}/${today_.planned} refeições do plano`
                : 'Sem registros ainda'}
          </Txt>
        </View>
        <ChevronRight size={18} color={muted} />
      </Pressable>
    );
  };

  function renderPatient() {
    if (!current?.patientId) return null;
    const { log, diet } = overview[current.patientId] || {
      log: null,
      diet: null,
    };
    const series = diet && log ? adherenceSeries(diet, log.meals, week) : [];
    const todayInfo =
      diet && log ? dayAdherence(diet, log.meals, today()) : null;
    const recent = (log?.meals || [])
      .slice()
      .sort((a, b) => `${b.date}${b.time}`.localeCompare(`${a.date}${a.time}`))
      .slice(0, 8);
    const lastWeight = (log?.measurements || [])
      .slice()
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-1)[0];
    return (
      <>
        <Txt style={s.title}>{current.patientName}</Txt>
        <Txt style={[s.small, { marginTop: 6, marginBottom: 24 }]}>
          CPF {maskCpf(current.patientCpf)} · vinculado em{' '}
          {dateLabel(current.updatedAt.slice(0, 10))}
        </Txt>
        <Card>
          <Heading
            title="Dieta"
            action={diet ? 'Editar' : undefined}
            onPress={openDiet}
          />
          {diet ? (
            <>
              <Txt style={{ fontWeight: '600' }}>{diet.title}</Txt>
              <Txt style={[s.small, { marginTop: 6 }]}>
                {diet.meals.length} refeições · {macroLine(dietTotals(diet))}
              </Txt>
              <Txt style={[s.small, { marginTop: 6 }]}>
                Atualizada em {dateLabel(diet.updatedAt.slice(0, 10))}
              </Txt>
            </>
          ) : (
            <>
              <Txt style={[s.small, { lineHeight: 22, marginBottom: 16 }]}>
                Monte o plano por refeição. O paciente recebe na aba Dieta e
                registra cada refeição com um toque.
              </Txt>
              <Button title="Criar dieta" onPress={openDiet} />
            </>
          )}
        </Card>
        {diet && (
          <Card>
            <Heading title="Adesão · últimos 7 dias" />
            {log ? (
              <>
                <Txt style={s.stat}>
                  {fmt((series.reduce((a, b) => a + b, 0) / 7) * 100)}%
                </Txt>
                <Txt style={s.small}>
                  das refeições do plano foram registradas
                </Txt>
                <Chart values={series.map((v) => v * 100)} />
                <Txt style={[s.small, { marginTop: 8 }]}>
                  Conta como seguida a refeição registrada com o mesmo nome no
                  mesmo dia.
                </Txt>
              </>
            ) : (
              <Txt style={s.small}>
                O paciente ainda não registrou refeições.
              </Txt>
            )}
          </Card>
        )}
        {diet && todayInfo && (
          <Card>
            <Heading title="Hoje" />
            {diet.meals.map((m) => {
              const ok = todayInfo.done.includes(m.id);
              return (
                <View key={m.id} style={[s.listRow, { paddingHorizontal: 0 }]}>
                  {ok ? (
                    <Check color={orange} size={20} />
                  ) : (
                    <X color={muted} size={20} />
                  )}
                  <Txt style={{ flex: 1, opacity: ok ? 1 : 0.6 }}>
                    {m.time} · {m.name}
                  </Txt>
                </View>
              );
            })}
            <Txt style={[s.small, { marginTop: 14 }]}>
              Consumido: {fmt(todayInfo.consumed.calories)} de{' '}
              {fmt(todayInfo.target.calories)} kcal do plano
            </Txt>
          </Card>
        )}
        <Card>
          <Heading title="Registros recentes" />
          {recent.length ? (
            recent.map((m) => (
              <View key={m.id} style={[s.listRow, { paddingHorizontal: 0 }]}>
                <View style={{ flex: 1 }}>
                  <Txt>{m.name}</Txt>
                  <Txt style={s.small}>
                    {dateLabel(m.date)} · {m.time} ·{' '}
                    {m.items.map((i) => i.food.name).join(', ')}
                  </Txt>
                </View>
                <Txt style={s.small}>{fmt(totals(m.items).calories)} kcal</Txt>
              </View>
            ))
          ) : (
            <Txt style={s.small}>Nenhuma refeição registrada.</Txt>
          )}
          {lastWeight && (
            <Txt style={[s.small, { marginTop: 14 }]}>
              Último peso: {lastWeight.weight} kg em{' '}
              {dateLabel(lastWeight.date)}
              {lastWeight.waist ? ` · cintura ${lastWeight.waist} cm` : ''}
            </Txt>
          )}
        </Card>
        {confirmEnd ? (
          <View style={[s.card, { borderColor: '#9B4439' }]}>
            <Txt style={s.heading}>Encerrar acompanhamento?</Txt>
            <Txt style={[s.small, { marginVertical: 16, lineHeight: 21 }]}>
              Você deixa de ver os registros e o paciente deixa de ver a dieta.
              Um novo convite será necessário para voltar.
            </Txt>
            <Button
              title="Confirmar"
              disabled={busy}
              onPress={() =>
                run(async () => {
                  await backend.endLink(current.id);
                  close();
                  setMessage('Acompanhamento encerrado');
                  await refresh();
                }, 'Não foi possível encerrar.')
              }
            />
            <View style={{ height: 10 }} />
            <Button
              title="Cancelar"
              secondary
              onPress={() => setConfirmEnd(false)}
            />
          </View>
        ) : (
          <Button
            title="Encerrar acompanhamento"
            secondary
            onPress={() => setConfirmEnd(true)}
          />
        )}
      </>
    );
  }

  function renderDiet() {
    if (!draft) return null;
    const used = draft.meals.map((m) => m.name);
    return (
      <>
        <Field
          label="Título"
          value={draft.title}
          onChange={(title) => setDraft({ ...draft, title })}
        />
        <Field
          label="Orientações gerais (opcional)"
          value={draft.notes}
          onChange={(notes) => setDraft({ ...draft, notes })}
          multiline
          placeholder="Ex.: beber 2,5 L de água por dia; evitar frituras."
        />
        {draft.meals.map((m, i) => (
          <Card key={m.id}>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Field
                  label="Refeição"
                  value={m.name}
                  onChange={(name) => updateMeal(i, { name })}
                />
              </View>
              <View style={{ width: 100 }}>
                <Field
                  label="Horário"
                  value={m.time}
                  onChange={(time) => updateMeal(i, { time })}
                />
              </View>
            </View>
            {m.items.map((item, j) => (
              <View key={j} style={[s.listRow, { paddingHorizontal: 0 }]}>
                <View style={{ flex: 1 }}>
                  <Txt>{item.food.name}</Txt>
                  <Txt style={s.small}>
                    {item.grams} g ·{' '}
                    {fmt((item.food.calories * item.grams) / 100)} kcal
                  </Txt>
                </View>
                <IconButton
                  label={`Remover ${item.food.name}`}
                  onPress={() =>
                    updateMeal(i, { items: m.items.filter((_, k) => k !== j) })
                  }
                >
                  <Trash2 color={muted} size={20} />
                </IconButton>
              </View>
            ))}
            <Pressable
              accessibilityRole="button"
              style={[s.listRow, { paddingHorizontal: 0 }]}
              onPress={() => openFoods(i)}
            >
              <Plus color={orange} size={20} />
              <Txt style={s.accent}>Adicionar alimento</Txt>
            </Pressable>
            <View style={{ height: 14 }} />
            <Field
              label="Substituições (opcional)"
              value={m.substitutions}
              onChange={(substitutions) => updateMeal(i, { substitutions })}
              multiline
              placeholder="Ex.: pão integral ↔ 40 g de aveia; frango ↔ peixe."
            />
            <Field
              label="Observações (opcional)"
              value={m.notes}
              onChange={(notes) => updateMeal(i, { notes })}
              multiline
            />
            <View style={s.row}>
              <Txt style={s.small}>{fmt(totals(m.items).calories)} kcal</Txt>
              <Pressable
                accessibilityRole="button"
                onPress={() =>
                  setDraft({
                    ...draft,
                    meals: draft.meals.filter((_, k) => k !== i),
                  })
                }
                style={{ paddingVertical: 10 }}
              >
                <Txt style={{ color: '#FF9A8E' }}>Remover refeição</Txt>
              </Pressable>
            </View>
          </Card>
        ))}
        <Heading title="Adicionar refeição" />
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 8,
            marginBottom: 16,
          }}
        >
          {mealTypeList(used).map((n) => (
            <Pressable
              key={n}
              accessibilityRole="button"
              style={s.chip}
              onPress={() => addMeal(n)}
            >
              <Txt style={s.small}>＋ {n}</Txt>
            </Pressable>
          ))}
        </View>
        <View style={[s.row, { gap: 10, marginBottom: 24 }]}>
          <TextInput
            accessibilityLabel="Novo tipo de refeição"
            placeholder="Outro tipo (ex.: Pré-treino)"
            placeholderTextColor={muted}
            value={newType}
            onChangeText={setNewType}
            style={[s.input, { flex: 1 }]}
          />
          <Button title="Criar" secondary onPress={() => addMeal(newType)} />
        </View>
        {!!draft.meals.length && (
          <Card>
            <Txt style={s.small}>Total do plano por dia</Txt>
            <Txt style={[s.stat, { marginVertical: 8 }]}>
              {fmt(dietTotals(draft).calories)} <Txt style={s.small}>kcal</Txt>
            </Txt>
            <Txt style={s.small}>{macroLine(dietTotals(draft))}</Txt>
          </Card>
        )}
        <Button
          title={
            busy
              ? 'Publicando…'
              : draft.id
                ? 'Salvar e publicar'
                : 'Publicar dieta'
          }
          disabled={busy}
          onPress={saveDiet}
        />
      </>
    );
  }

  function renderFood() {
    if (custom)
      return (
        <>
          <Txt style={[s.small, { marginBottom: 20 }]}>Valores por 100 g.</Txt>
          {[
            { k: 'name', label: 'Nome do alimento' },
            { k: 'calories', label: 'Calorias (kcal)' },
            { k: 'protein', label: 'Proteínas (g)' },
            { k: 'carbs', label: 'Carboidratos (g)' },
            { k: 'fat', label: 'Gorduras (g)' },
          ].map((f) => (
            <Field
              key={f.k}
              label={f.label}
              value={custom[f.k] || ''}
              onChange={(v) => setCustom({ ...custom, [f.k]: v })}
              numeric={f.k !== 'name'}
            />
          ))}
          <Button title="Continuar" onPress={createFood} />
        </>
      );
    if (picked)
      return (
        <>
          <View style={{ alignItems: 'center', paddingVertical: 18 }}>
            <FoodThumb food={picked} size={96} />
          </View>
          <Heading title={picked.name} />
          <Txt style={[s.small, { marginBottom: 18 }]}>
            Por 100 g: {macroLine(picked)}
          </Txt>
          <Field
            label="Quantidade (g)"
            value={grams}
            onChange={setGrams}
            numeric
          />
          <Txt style={{ marginBottom: 18 }}>
            Total:{' '}
            {Number.isFinite(number(grams))
              ? fmt((picked.calories * number(grams)) / 100)
              : '—'}{' '}
            kcal
          </Txt>
          <Button title="Adicionar à refeição" onPress={addFood} />
        </>
      );
    const list = knownFoods.filter((f) =>
      normalize(f.name).includes(normalize(query)),
    );
    return (
      <>
        <TextInput
          accessibilityLabel="Buscar alimento"
          placeholder="Buscar alimento"
          placeholderTextColor={muted}
          value={query}
          onChangeText={setQuery}
          style={[s.input, { marginBottom: 12 }]}
        />
        {list.map((f) => (
          <FoodRow key={f.id} food={f} onPress={() => pickFood(f)} />
        ))}
        <RemoteFoods
          query={query}
          exclude={list.map((f) => f.id)}
          onPick={pickFood}
        />
        {!list.length && query.trim().length < 3 && (
          <Empty
            title="Nenhum alimento encontrado"
            copy="Cadastre o alimento com os valores por 100 g."
          />
        )}
        <View style={{ height: 16 }} />
        <Button
          title="Cadastrar outro alimento"
          secondary
          onPress={() => setCustom({ name: query })}
        />
      </>
    );
  }

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.shell}>
        <View style={s.header}>
          <View style={{ width: 44 }} />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <BrandMark size={28} />
            <Txt style={{ fontSize: 23, fontWeight: '700' }}>
              nutri<Txt style={{ color: orange, fontSize: 23 }}>folio</Txt>
            </Txt>
            <Txt style={[s.small, { fontSize: 11, marginLeft: 4 }]}>PRO</Txt>
          </View>
          <IconButton
            label="Vincular paciente"
            onPress={() => {
              setCpf('');
              setError('');
              setSheet('invite');
            }}
          >
            <UserPlus color="#eee" size={23} />
          </IconButton>
        </View>
        <ScrollView
          contentContainerStyle={s.content}
          keyboardShouldPersistTaps="handled"
        >
          {page === 'Pacientes' && (
            <>
              <Txt style={s.title}>Olá, {account.name.split(' ')[0]}</Txt>
              <Txt style={[s.small, { marginTop: 8, marginBottom: 28 }]}>
                {active.length
                  ? `${active.length} paciente${active.length > 1 ? 's' : ''} em acompanhamento`
                  : 'Vincule seu primeiro paciente pelo CPF.'}
              </Txt>
              {links === null ? (
                <ActivityIndicator color={orange} />
              ) : (
                <>
                  <Heading
                    title="Pacientes"
                    action="＋ Vincular"
                    onPress={() => {
                      setCpf('');
                      setError('');
                      setSheet('invite');
                    }}
                  />
                  <View style={s.list}>
                    {active.length ? (
                      active.map(patientRow)
                    ) : (
                      <Empty
                        title="Nenhum paciente ainda"
                        copy="Envie um convite pelo CPF. O paciente aceita no app dele."
                      />
                    )}
                  </View>
                  {!!pending.length && (
                    <>
                      <Heading title="Aguardando aceite" />
                      <View style={s.list}>
                        {pending.map((l) => (
                          <View key={l.id} style={s.listRow}>
                            <View style={{ flex: 1 }}>
                              <Txt>CPF {maskCpf(l.patientCpf)}</Txt>
                              <Txt style={[s.small, { marginTop: 4 }]}>
                                Convite enviado em{' '}
                                {dateLabel(l.createdAt.slice(0, 10))}
                              </Txt>
                            </View>
                            <IconButton
                              label="Cancelar convite"
                              onPress={() =>
                                run(async () => {
                                  await backend.endLink(l.id);
                                  setMessage('Convite cancelado');
                                  await refresh();
                                }, 'Não foi possível cancelar.')
                              }
                            >
                              <X color={muted} size={20} />
                            </IconButton>
                          </View>
                        ))}
                      </View>
                    </>
                  )}
                  {!!declined.length && (
                    <>
                      <Heading title="Convites recusados" />
                      <View style={s.list}>
                        {declined.map((l) => (
                          <View key={l.id} style={s.listRow}>
                            <Txt style={{ flex: 1 }}>
                              CPF {maskCpf(l.patientCpf)}
                            </Txt>
                            <IconButton
                              label="Remover da lista"
                              onPress={() =>
                                run(async () => {
                                  await backend.endLink(l.id);
                                  await refresh();
                                }, 'Não foi possível remover.')
                              }
                            >
                              <Trash2 color={muted} size={20} />
                            </IconButton>
                          </View>
                        ))}
                      </View>
                    </>
                  )}
                  <Button title="Atualizar" secondary onPress={refresh} />
                </>
              )}
            </>
          )}
          {page === 'Perfil' && (
            <>
              <Heading title="Perfil profissional" />
              <Card>
                <Txt style={s.heading}>{account.name}</Txt>
                <Txt style={[s.small, { marginTop: 6 }]}>
                  {account.crn} · {account.email}
                </Txt>
              </Card>
              <Card>
                <Heading title="Alterar senha" />
                <ChangePassword onDone={setMessage} />
              </Card>
              <View style={s.list}>
                <Pressable
                  accessibilityRole="button"
                  style={s.listRow}
                  onPress={onSwitchAccount}
                >
                  <LogOut size={21} color={orange} />
                  <Txt style={{ flex: 1 }}>Sair da conta</Txt>
                  <ChevronRight color={muted} size={18} />
                </Pressable>
              </View>
            </>
          )}
          {!!error && !sheet && <Txt style={s.error}>{error}</Txt>}
        </ScrollView>
        <View style={s.nav}>
          {(
            [
              { name: 'Pacientes', Icon: Users },
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
        </View>
        {!!message && (
          <View accessibilityLiveRegion="polite" style={s.toast}>
            <Check size={18} color={orange} />
            <Txt style={{ flex: 1, fontSize: 13 }}>{message}</Txt>
          </View>
        )}
      </View>
      <Modal visible={!!sheet} animationType="slide" onRequestClose={back}>
        <SafeAreaView style={s.safe}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={s.shell}
          >
            <View style={s.header}>
              <IconButton label="Voltar" onPress={back}>
                <ArrowLeft color="#eee" />
              </IconButton>
              <Txt style={{ fontWeight: '600' }}>
                {
                  {
                    invite: 'Vincular paciente',
                    patient: 'Paciente',
                    diet: 'Dieta',
                    food: custom
                      ? 'Cadastrar alimento'
                      : picked
                        ? 'Quantidade'
                        : 'Adicionar alimento',
                  }[sheet || 'invite']
                }
              </Txt>
              <IconButton label="Fechar" onPress={close}>
                <X color="#eee" />
              </IconButton>
            </View>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={s.content}
            >
              {sheet === 'invite' && (
                <>
                  <Card>
                    <ClipboardList color={orange} size={28} />
                    <Txt style={[s.small, { lineHeight: 22, marginTop: 12 }]}>
                      O paciente precisa ter uma conta de paciente no Nutrifolio
                      com este CPF. Ele recebe o convite na aba Dieta e só
                      depois de aceitar você passa a ver os registros dele.
                    </Txt>
                  </Card>
                  <Field
                    label="CPF do paciente"
                    value={cpf}
                    onChange={(v) => setCpf(formatCpf(v))}
                    numeric
                    placeholder="000.000.000-00"
                  />
                  <Button
                    title={busy ? 'Enviando…' : 'Enviar convite'}
                    disabled={busy}
                    onPress={() =>
                      run(async () => {
                        await backend.invitePatient(cpf);
                        close();
                        setMessage(
                          'Convite enviado. Aguarde o aceite do paciente.',
                        );
                        await refresh();
                      }, 'Não foi possível enviar o convite.')
                    }
                  />
                </>
              )}
              {sheet === 'patient' && renderPatient()}
              {sheet === 'diet' && renderDiet()}
              {sheet === 'food' && renderFood()}
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
