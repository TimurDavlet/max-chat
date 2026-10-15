import { useMemo } from 'react';
import type { Connection } from '../hooks/useNotifications';
import type { Chat, Message } from '../types';
import { formatTime } from '../utils';
import Avatar from './Avatar';
import NewChatForm from './NewChatForm';

interface Props {
  idInstance: string;
  chats: Chat[];
  messages: Record<string, Message[]>;
  activeId: string | null;
  connection: Connection;
  onSelect: (chatId: string) => void;
  onCreate: (phone: string) => Promise<string | null>;
  onLogout: () => void;
}

const STATUS_LABEL = {
  connecting: 'Подключение…',
  online: 'На связи',
  offline: 'Нет связи',
} as const;

export default function Sidebar({
  idInstance,
  chats,
  messages,
  activeId,
  connection,
  onSelect,
  onCreate,
  onLogout,
}: Props) {
  const sorted = useMemo(
    () => [...chats].sort((a, b) => b.lastActivity - a.lastActivity),
    [chats],
  );

  return (
    <aside className="sidebar">
      <header className="sidebar__header">
        <div>
          <h1 className="sidebar__title">Чаты</h1>
          <div className={`status status--${connection.status}`}>
            <span className="status__dot" />
            {STATUS_LABEL[connection.status]} · {idInstance}
          </div>
        </div>
        <button className="btn btn--ghost" type="button" onClick={onLogout}>
          Выйти
        </button>
      </header>

      {connection.status === 'offline' && connection.error && (
        <p className="alert alert--inline" role="alert">
          {connection.error}
        </p>
      )}

      <NewChatForm onCreate={onCreate} />

      <ul className="chatlist">
        {sorted.length === 0 && (
          <li className="chatlist__empty">
            Чатов пока нет. Введите номер телефона получателя, чтобы начать переписку.
          </li>
        )}
        {sorted.map((chat) => {
          const list = messages[chat.chatId] ?? [];
          const last = list[list.length - 1];
          return (
            <li key={chat.chatId}>
              <button
                type="button"
                className={`chatitem${chat.chatId === activeId ? ' chatitem--active' : ''}`}
                onClick={() => onSelect(chat.chatId)}
              >
                <Avatar seed={chat.chatId} title={chat.title} />
                <div className="chatitem__body">
                  <div className="chatitem__top">
                    <span className="chatitem__name">{chat.title}</span>
                    {last && <span className="chatitem__time">{formatTime(last.timestamp)}</span>}
                  </div>
                  <div className="chatitem__bottom">
                    <span className="chatitem__preview">
                      {last ? `${last.direction === 'out' ? 'Вы: ' : ''}${last.text}` : 'Нет сообщений'}
                    </span>
                    {chat.unread > 0 && <span className="badge">{chat.unread}</span>}
                  </div>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
