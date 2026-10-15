import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react';
import type { Chat, Message } from '../types';
import { formatDay, formatPhone, formatTime } from '../utils';
import Avatar from './Avatar';

interface Props {
  chat: Chat;
  messages: Message[];
  onSend: (text: string) => void;
  onRetry: (message: Message) => void;
  onBack: () => void;
}

const MAX_LENGTH = 4000;

export default function ChatWindow({ chat, messages, onSend, onRetry, onBack }: Props) {
  const [draft, setDraft] = useState('');
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [chat.chatId, messages.length]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [chat.chatId]);

  useLayoutEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  }, [draft]);

  function submit() {
    const text = draft.trim();
    if (!text) return;
    onSend(text);
    setDraft('');
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      submit();
    }
  }

  let lastDay = '';

  return (
    <section className="chat">
      <header className="chat__header">
        <button className="btn btn--ghost chat__back" type="button" onClick={onBack} aria-label="К списку чатов">
          ←
        </button>
        <Avatar seed={chat.chatId} title={chat.title} size={40} />
        <div>
          <div className="chat__name">{chat.title}</div>
          {chat.phone && chat.title !== formatPhone(chat.phone) && (
            <div className="chat__sub">{formatPhone(chat.phone)}</div>
          )}
        </div>
      </header>

      <div className="chat__messages" ref={listRef}>
        {messages.length === 0 && (
          <p className="chat__empty">Напишите первое сообщение — оно уйдёт получателю в MAX.</p>
        )}
        {messages.map((message) => {
          const day = formatDay(message.timestamp);
          const showDay = day !== lastDay;
          lastDay = day;
          return (
            <div key={message.id} className="chat__group">
              {showDay && <div className="chat__day">{day}</div>}
              <div className={`bubble bubble--${message.direction}`}>
                <span className="bubble__text">{message.text}</span>
                <span className="bubble__meta">
                  {formatTime(message.timestamp)}
                  {message.direction === 'out' && message.status === 'sending' && ' · отправка…'}
                  {message.direction === 'out' && message.status === 'sent' && ' ✓'}
                </span>
                {message.status === 'error' && (
                  <span className="bubble__error">
                    {message.error ?? 'Не отправлено.'}{' '}
                    <button type="button" onClick={() => onRetry(message)}>
                      Повторить
                    </button>
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <form
        className="composer"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <textarea
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Сообщение"
          aria-label="Текст сообщения"
          rows={1}
          maxLength={MAX_LENGTH}
        />
        <button className="btn btn--primary composer__send" type="submit" disabled={!draft.trim()}>
          Отправить
        </button>
      </form>
    </section>
  );
}
