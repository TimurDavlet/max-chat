export type PhoneResult = { ok: true; phone: string } | { ok: false; error: string };

export function parsePhone(input: string): PhoneResult {
  let digits = input.replace(/\D/g, '');
  if (!digits) return { ok: false, error: 'Введите номер телефона получателя.' };
  if (digits.length === 11 && digits.startsWith('8')) digits = `7${digits.slice(1)}`;
  if (digits.length === 10) digits = `7${digits}`;
  const valid =
    (digits.startsWith('7') && digits.length === 11) ||
    (digits.startsWith('375') && digits.length === 12);
  if (!valid) {
    return {
      ok: false,
      error: 'Поддерживаются номера РФ (+7…) и РБ (+375…), например +7 999 123-45-67.',
    };
  }
  return { ok: true, phone: digits };
}

export function formatPhone(digits: string): string {
  if (digits.startsWith('7') && digits.length === 11) {
    return `+7 ${digits.slice(1, 4)} ${digits.slice(4, 7)}-${digits.slice(7, 9)}-${digits.slice(9)}`;
  }
  return `+${digits}`;
}

export function avatarLetter(title: string): string {
  const match = title.trim().match(/\p{L}/u);
  return match ? match[0].toUpperCase() : '#';
}

export function avatarColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return `hsl(${hash % 360} 52% 50%)`;
}

export function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}

export function formatDay(ts: number): string {
  const date = new Date(ts);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return 'Сегодня';
  if (date.toDateString() === yesterday.toDateString()) return 'Вчера';
  return date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: date.getFullYear() === today.getFullYear() ? undefined : 'numeric',
  });
}

export function newTempId(): string {
  return `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function errorMessage(error: unknown): string {
  return error instanceof Error && error.message ? error.message : 'Неизвестная ошибка.';
}
