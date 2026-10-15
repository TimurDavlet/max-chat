import { useMemo } from 'react';
import { GreenApiClient } from '../api';
import { useChatStore } from '../hooks/useChatStore';
import { useNotifications } from '../hooks/useNotifications';
import type { Credentials } from '../types';
import ChatWindow from './ChatWindow';
import Sidebar from './Sidebar';

interface Props {
  creds: Credentials;
  onLogout: (notice?: string) => void;
}

export default function ChatScreen({ creds, onLogout }: Props) {
  const client = useMemo(() => new GreenApiClient(creds), [creds]);
  const store = useChatStore(creds.idInstance, client);
  const connection = useNotifications(client, store.handleNotification, (message) =>
    onLogout(message),
  );

  const activeChat = store.chats.find((c) => c.chatId === store.activeId) ?? null;

  return (
    <div className="app" data-chat-open={activeChat ? 'true' : 'false'}>
      <Sidebar
        idInstance={creds.idInstance}
        chats={store.chats}
        messages={store.messages}
        activeId={store.activeId}
        connection={connection}
        onSelect={store.select}
        onCreate={store.openChatByPhone}
        onLogout={() => onLogout()}
      />

      {activeChat ? (
        <ChatWindow
          key={activeChat.chatId}
          chat={activeChat}
          messages={store.messages[activeChat.chatId] ?? []}
          onSend={(text) => void store.send(activeChat.chatId, text)}
          onRetry={(message) => void store.send(message.chatId, message.text, message.id)}
          onBack={() => store.select(null)}
        />
      ) : (
        <section className="placeholder">
          <div className="placeholder__card">
            <div className="login__logo" aria-hidden="true">
              M
            </div>
            <p>Выберите чат слева или создайте новый по номеру телефона.</p>
          </div>
        </section>
      )}
    </div>
  );
}
