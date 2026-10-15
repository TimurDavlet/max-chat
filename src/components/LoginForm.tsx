import { useState, type FormEvent } from 'react';
import { ApiError, GreenApiClient, resolveApiUrl } from '../api';
import type { Credentials } from '../types';

interface Props {
  onLogin: (creds: Credentials, remember: boolean) => void;
  notice?: string;
}

function stateMessage(state: string): string {
  switch (state) {
    case 'notAuthorized':
      return 'Инстанс не авторизован. Отсканируйте QR-код в личном кабинете GREEN-API и повторите вход.';
    case 'starting':
      return 'Инстанс запускается. Подождите минуту и повторите вход.';
    case 'blocked':
      return 'Инстанс заблокирован.';
    default:
      return `Инстанс недоступен (состояние: ${state}).`;
  }
}

export default function LoginForm({ onLogin, notice }: Props) {
  const [idInstance, setIdInstance] = useState('');
  const [token, setToken] = useState('');
  const [apiUrl, setApiUrl] = useState('');
  const [remember, setRemember] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(notice ?? '');

  async function submit(event: FormEvent) {
    event.preventDefault();
    const id = idInstance.trim();
    const apiTokenInstance = token.trim();

    if (!/^\d+$/.test(id)) {
      setError('idInstance — это число, например 3100123456.');
      return;
    }
    if (!apiTokenInstance) {
      setError('Введите apiTokenInstance.');
      return;
    }

    const creds: Credentials = {
      idInstance: id,
      apiTokenInstance,
      apiUrl: apiUrl.trim() || resolveApiUrl(id),
    };

    setBusy(true);
    setError('');
    try {
      const { stateInstance } = await new GreenApiClient(creds).getStateInstance();
      if (stateInstance !== 'authorized') {
        setError(
          stateInstance
            ? stateMessage(stateInstance)
            : 'Не удалось проверить инстанс: сервер вернул неожиданный ответ. Проверьте idInstance, токен и адрес API.',
        );
        return;
      }
      onLogin(creds, remember);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Не удалось подключиться к GREEN-API.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="login">
      <form className="login__card" onSubmit={submit}>
        <div className="login__logo" aria-hidden="true">
          M
        </div>
        <h1>Вход в чат MAX</h1>
        <p className="login__hint">
          Введите данные инстанса из личного кабинета{' '}
          <a href="https://console.green-api.com" target="_blank" rel="noreferrer">
            GREEN-API
          </a>
          .
        </p>

        <label className="field">
          <span>idInstance</span>
          <input
            value={idInstance}
            onChange={(e) => setIdInstance(e.target.value)}
            inputMode="numeric"
            autoComplete="off"
            placeholder="3100123456"
            autoFocus
          />
        </label>

        <label className="field">
          <span>apiTokenInstance</span>
          <input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            autoComplete="off"
            placeholder="Токен инстанса"
          />
        </label>

        <details className="login__advanced">
          <summary>Дополнительно</summary>
          <label className="field">
            <span>Адрес API (если отличается от стандартного)</span>
            <input
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
              autoComplete="off"
              placeholder="https://3100.api.green-api.com"
            />
          </label>
        </details>

        <label className="check">
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
          />
          <span>Запомнить меня на этом устройстве</span>
        </label>

        {error && (
          <p className="alert" role="alert">
            {error}
          </p>
        )}

        <button className="btn btn--primary" type="submit" disabled={busy}>
          {busy ? 'Проверяем…' : 'Войти'}
        </button>

        <p className="login__note">
          В настройках инстанса должны быть включены уведомления о входящих сообщениях, а поле
          webhookUrl — пустым: так сообщения приходят через HTTP API.
        </p>
      </form>
    </main>
  );
}
