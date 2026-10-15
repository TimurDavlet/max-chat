import type { Credentials } from './types';

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export function resolveApiUrl(idInstance: string): string {
  const id = idInstance.trim();
  return /^\d{10}$/.test(id)
    ? `https://${id.slice(0, 4)}.api.green-api.com`
    : 'https://api.green-api.com';
}

export interface NotificationBody {
  typeWebhook: string;
  timestamp?: number;
  idMessage?: string;
  senderData?: {
    chatId?: string;
    chatName?: string;
    senderName?: string;
    senderContactName?: string;
    senderPhoneNumber?: number;
  };
  messageData?: {
    typeMessage?: string;
    textMessageData?: { textMessage?: string };
    extendedTextMessageData?: { text?: string };
  };
}

export interface ReceivedNotification {
  receiptId: number;
  body: NotificationBody;
}

function pickErrorText(raw: string): string {
  const text = raw.trim();
  if (!text) return '';
  try {
    const json: unknown = JSON.parse(text);
    if (json && typeof json === 'object') {
      const obj = json as Record<string, unknown>;
      for (const key of ['message', 'reason', 'error', 'description']) {
        const value = obj[key];
        if (typeof value === 'string' && value) return value;
      }
    }
    if (typeof json === 'string') return json;
  } catch {

  }
  return text.slice(0, 200);
}

function describeError(status: number, raw: string): string {
  const text = pickErrorText(raw);
  if (text.includes('custom webhook url')) {
    return 'В настройках инстанса задан webhookUrl. Очистите его в личном кабинете GREEN-API и подождите около минуты.';
  }
  switch (status) {
    case 401:
      return 'Неверный idInstance или apiTokenInstance.';
    case 429:
      return 'Слишком много запросов, повторите чуть позже.';
    case 466:
      return 'Исчерпан лимит тарифа GREEN-API.';
    case 469:
      return 'MAX временно ограничил проверку номеров. Повторите позже.';
    default:
      return text || `Ошибка сервера (${status}).`;
  }
}

function isAbort(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

export class GreenApiClient {
  private readonly creds: Credentials;

  constructor(creds: Credentials) {
    this.creds = creds;
  }

  private url(method: string, suffix = ''): string {
    const { apiUrl, idInstance, apiTokenInstance } = this.creds;
    return `${apiUrl.replace(/\/+$/, '')}/waInstance${idInstance}/${method}/${apiTokenInstance}${suffix}`;
  }

  private async request<T>(url: string, init?: RequestInit): Promise<T> {
    let response: Response;
    try {
      response = await fetch(url, init);
    } catch (error) {
      if (isAbort(error)) throw error;
      throw new ApiError('Нет связи с GREEN-API. Проверьте интернет и адрес API.', 0);
    }
    const raw = await response.text();
    if (!response.ok) throw new ApiError(describeError(response.status, raw), response.status);
    if (!raw.trim()) return null as T;
    try {
      return JSON.parse(raw) as T;
    } catch {
      throw new ApiError('Некорректный ответ сервера.', response.status);
    }
  }

  private post<T>(method: string, payload: unknown): Promise<T> {
    return this.request<T>(this.url(method), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  }

  getStateInstance(): Promise<{ stateInstance?: string }> {
    return this.request(this.url('getStateInstance'));
  }

  async checkAccount(phone: string): Promise<string> {
    const res = await this.post<{ exist?: boolean; chatId?: string; reason?: string }>(
      'checkAccount',
      { phoneNumber: Number(phone) },
    );
    if (res?.reason) throw new ApiError(res.reason, 400);
    if (!res?.exist || !res.chatId) {
      throw new ApiError('На этот номер не зарегистрирован аккаунт MAX.', 404);
    }
    return res.chatId;
  }

  async sendMessage(chatId: string, message: string): Promise<string> {
    const res = await this.post<{ idMessage?: string }>('sendMessage', { chatId, message });
    if (!res?.idMessage) throw new ApiError('Сервер не вернул идентификатор сообщения.', 500);
    return res.idMessage;
  }

  async receiveNotification(signal: AbortSignal, timeoutSec = 20): Promise<ReceivedNotification | null> {
    const res = await this.request<ReceivedNotification | null>(
      this.url('receiveNotification', `?receiveTimeout=${timeoutSec}`),
      { signal },
    );
    return res && typeof res.receiptId === 'number' && res.body ? res : null;
  }

  async deleteNotification(receiptId: number, signal: AbortSignal): Promise<void> {
    await this.request(this.url('deleteNotification', `/${receiptId}`), {
      method: 'DELETE',
      signal,
    });
  }
}
