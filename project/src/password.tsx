import { useState } from 'react';
import { backend, errorMessage } from './backend';
import { Button, Field, s, Txt } from './ui';

/** Formulário de troca de senha; encerra as outras sessões da conta. */
export function ChangePassword({ onDone }: { onDone: (msg: string) => void }) {
  const [current, setCurrent] = useState(''),
    [next, setNext] = useState(''),
    [confirm, setConfirm] = useState(''),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  async function save() {
    if (next.length < 8)
      return setError('A nova senha precisa ter pelo menos 8 caracteres.');
    if (next !== confirm) return setError('As senhas não conferem.');
    setBusy(true);
    setError('');
    try {
      await backend.changePassword(current, next);
      setCurrent('');
      setNext('');
      setConfirm('');
      onDone('Senha alterada. Outras sessões foram encerradas.');
    } catch (e) {
      setError(errorMessage(e, 'Não foi possível alterar a senha.'));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Field label="Senha atual" value={current} onChange={setCurrent} secure />
      <Field label="Nova senha" value={next} onChange={setNext} secure />
      <Field
        label="Confirmar nova senha"
        value={confirm}
        onChange={setConfirm}
        secure
      />
      <Button
        title={busy ? 'Salvando…' : 'Alterar senha'}
        disabled={busy}
        onPress={save}
      />
      {!!error && (
        <Txt accessibilityLiveRegion="polite" style={s.error}>
          {error}
        </Txt>
      )}
    </>
  );
}
