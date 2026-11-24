import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  ChevronRight,
  Stethoscope,
  UserRound,
} from 'lucide-react-native';
import { Account, backend, errorMessage } from './backend';
import { formatCpf } from './model';
import {
  BrandMark,
  Button,
  Field,
  IconButton,
  muted,
  orange,
  s,
  Txt,
} from './ui';

export type WelcomeMode = 'home' | 'patient' | 'nutritionist' | 'login';
/** Como a pessoa entrou: conta nova, login ou convidado (`account` nulo). */
export type EnterKind = 'register' | 'login' | 'guest';

export function Welcome({
  initialMode = 'home',
  notice = '',
  onEnter,
}: {
  initialMode?: WelcomeMode;
  /** Aviso exibido na abertura (ex.: sessão expirada). */
  notice?: string;
  onEnter: (account: Account | null, kind: EnterKind) => Promise<void>;
}) {
  const [mode, setMode] = useState<WelcomeMode>(initialMode),
    [form, setForm] = useState<Record<string, string>>({}),
    [error, setError] = useState(notice),
    [busy, setBusy] = useState(false);
  const field = (k: string) => (v: string) =>
    setForm((f) => ({ ...f, [k]: k === 'cpf' ? formatCpf(v) : v }));
  const go = (m: WelcomeMode) => {
    setError('');
    setForm((f) => ({ email: f.email || '' }));
    setMode(m);
  };
  async function run(task: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await task();
    } catch (e) {
      setError(errorMessage(e, 'Não foi possível continuar. Tente novamente.'));
      setBusy(false);
    }
  }
  const register = () => {
    if ((form.password || '').length < 8)
      return setError('A senha precisa ter pelo menos 8 caracteres.');
    if (form.password !== form.confirm)
      return setError('As senhas não conferem.');
    run(async () => {
      const account = await backend.register({
        role: mode === 'nutritionist' ? 'nutritionist' : 'patient',
        name: form.name || '',
        email: form.email || '',
        password: form.password,
        cpf: form.cpf,
        crn: form.crn,
      });
      await onEnter(account, 'register');
    });
  };
  const login = () =>
    run(async () => {
      const account = await backend.login(
        form.email || '',
        form.password || '',
      );
      await onEnter(account, 'login');
    });
  return (
    <SafeAreaView style={s.safe}>
      <ScrollView
        style={s.shell}
        contentContainerStyle={{
          padding: 28,
          flexGrow: 1,
          justifyContent: 'center',
        }}
        keyboardShouldPersistTaps="handled"
      >
        {mode !== 'home' && (
          <View style={{ alignItems: 'flex-start', marginBottom: 12 }}>
            <IconButton label="Voltar" onPress={() => go('home')}>
              <ArrowLeft color="#eee" />
            </IconButton>
          </View>
        )}
        <BrandMark size={mode === 'home' ? 76 : 44} />
        {mode === 'home' && (
          <>
            <Txt style={{ fontSize: 40, fontWeight: '700', marginBottom: 14 }}>
              nutri<Txt style={{ fontSize: 40, color: orange }}>folio</Txt>
            </Txt>
            <Txt style={[s.title, { marginTop: 25 }]}>
              Sua nutrição,{'\n'}na palma da mão.
            </Txt>
            <Txt style={[s.small, { lineHeight: 25, marginVertical: 22 }]}>
              Registre suas refeições, receba a dieta do seu nutricionista e
              acompanhe sua evolução.
            </Txt>
            <Button title="Entrar" onPress={() => go('login')} />
            <View style={{ height: 22 }} />
            <Txt style={[s.small, { marginBottom: 10 }]}>Criar conta</Txt>
            <View style={s.list}>
              <Pressable
                accessibilityRole="button"
                style={s.listRow}
                onPress={() => go('patient')}
              >
                <UserRound color={orange} size={22} />
                <View style={{ flex: 1 }}>
                  <Txt style={{ fontWeight: '600' }}>Sou paciente</Txt>
                  <Txt style={[s.small, { marginTop: 4 }]}>
                    Registro refeições e recebo minha dieta
                  </Txt>
                </View>
                <ChevronRight color={muted} size={18} />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                style={s.listRow}
                onPress={() => go('nutritionist')}
              >
                <Stethoscope color={orange} size={22} />
                <View style={{ flex: 1 }}>
                  <Txt style={{ fontWeight: '600' }}>Sou nutricionista</Txt>
                  <Txt style={[s.small, { marginTop: 4 }]}>
                    Monto dietas e acompanho pacientes
                  </Txt>
                </View>
                <ChevronRight color={muted} size={18} />
              </Pressable>
            </View>
            <Button
              title="Continuar como convidado"
              secondary
              disabled={busy}
              onPress={() => run(() => onEnter(null, 'guest'))}
            />
            <Txt style={[s.small, { fontSize: 12, marginTop: 24 }]}>
              Como convidado, seus registros ficam só neste dispositivo e não há
              vínculo com nutricionista.
            </Txt>
          </>
        )}
        {mode === 'login' && (
          <>
            <Txt style={[s.title, { marginVertical: 20 }]}>Entrar</Txt>
            <Field
              label="E-mail"
              value={form.email || ''}
              onChange={field('email')}
            />
            <Field
              label="Senha"
              value={form.password || ''}
              onChange={field('password')}
              secure
            />
            <Button
              title={busy ? 'Entrando…' : 'Entrar'}
              disabled={busy}
              onPress={login}
            />
          </>
        )}
        {(mode === 'patient' || mode === 'nutritionist') && (
          <>
            <Txt style={[s.title, { marginVertical: 20 }]}>
              {mode === 'patient'
                ? 'Criar conta de paciente'
                : 'Criar conta profissional'}
            </Txt>
            <Txt style={[s.small, { lineHeight: 22, marginBottom: 24 }]}>
              {mode === 'patient'
                ? 'Seu CPF permite que seu nutricionista envie um convite. Nada é compartilhado até você aceitar.'
                : 'Com o CRN, seus pacientes identificam quem está pedindo acesso aos registros deles.'}
            </Txt>
            <Field
              label="Nome completo"
              value={form.name || ''}
              onChange={field('name')}
            />
            <Field
              label="E-mail"
              value={form.email || ''}
              onChange={field('email')}
            />
            {mode === 'patient' ? (
              <Field
                label="CPF"
                value={form.cpf || ''}
                onChange={field('cpf')}
                numeric
                placeholder="000.000.000-00"
              />
            ) : (
              <Field
                label="CRN"
                value={form.crn || ''}
                onChange={field('crn')}
                placeholder="Ex.: CRN-3 12345"
              />
            )}
            <Field
              label="Senha (mínimo 8 caracteres)"
              value={form.password || ''}
              onChange={field('password')}
              secure
            />
            <Field
              label="Confirmar senha"
              value={form.confirm || ''}
              onChange={field('confirm')}
              secure
            />
            <Button
              title={busy ? 'Criando…' : 'Criar conta'}
              disabled={busy}
              onPress={register}
            />
          </>
        )}
        {!!error && (
          <Txt accessibilityLiveRegion="polite" style={s.error}>
            {error}
          </Txt>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
