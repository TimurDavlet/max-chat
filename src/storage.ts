import type { Chat, Credentials, Message } from './types';

const CREDS_KEY = 'max-chat:credentials';
const MAX_MESSAGES_PER_CHAT = 500;

function isCredentials(value: unknown): value is Credentials {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.idInstance === 'string' &&
    typeof v.apiTokenInstance === 'string' &&
    typeof v.apiUrl === 'string'
  );
}

export function loadCredentials(): Credentials | null {
  for (const storage of [sessionStorage, localStorage]) {
    try {
      const raw = storage.getItem(CREDS_KEY);
      if (!raw) continue;
      const parsed: unknown = JSON.parse(raw);
      if (isCredentials(parsed)) return parsed;
    } catch {

    }
  }
  return null;
}


export function saveCredentials(creds: Credentials, remember: boolean): void {
  clearCredentials();
  try {
    (remember ? localStorage : sessionStorage).setItem(CREDS_KEY, JSON.stringify(creds));
  } catch {

  }
}

export function clearCredentials(): void {
  try {
    sessionStorage.removeItem(CREDS_KEY);
    localStorage.removeItem(CREDS_KEY);
  } catch {

  }
}

export interface PersistedState {
  chats: Chat[];
  messages: Record<string, Message[]>;
}

const stateKey = (idInstance: string) => `max-chat:state:${idInstance}`;

export function loadState(idInstance: string): PersistedState {
  try {
    const raw = localStorage.getItem(stateKey(idInstance));
    if (!raw) return { chats: [], messages: {} };
    const parsed = JSON.parse(raw) as Partial<PersistedState>;
    const messages: Record<string, Message[]> = {};
    for (const [chatId, list] of Object.entries(parsed.messages ?? {})) {
      messages[chatId] = list.map((m) =>
        m.status === 'sending' ? { ...m, status: 'error', error: 'Не отправлено.' } : m,
      );
    }
    return { chats: parsed.chats ?? [], messages };
  } catch {
    return { chats: [], messages: {} };
  }
}

export function saveState(idInstance: string, state: PersistedState): void {
  try {
    const messages: Record<string, Message[]> = {};
    for (const [chatId, list] of Object.entries(state.messages)) {
      messages[chatId] = list.slice(-MAX_MESSAGES_PER_CHAT);
    }
    localStorage.setItem(stateKey(idInstance), JSON.stringify({ chats: state.chats, messages }));
  } catch {

  }
}
