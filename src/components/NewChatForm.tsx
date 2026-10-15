import { useState, type FormEvent } from 'react';

interface Props {
  onCreate: (phone: string) => Promise<string | null>;
}

export default function NewChatForm({ onCreate }: Props) {
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    const result = await onCreate(phone);
    setBusy(false);
    if (result) setError(result);
    else setPhone('');
  }

  return (
    <form className="newchat" onSubmit={submit}>
      <div className="newchat__row">
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Номер получателя, +7…"
          aria-label="Номер телефона получателя"
          autoComplete="off"
        />
        <button className="btn btn--primary" type="submit" disabled={busy || !phone.trim()}>
          {busy ? '…' : 'Создать чат'}
        </button>
      </div>
      {error && (
        <p className="newchat__error" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
