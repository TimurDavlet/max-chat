import { useCallback, useEffect, useReducer } from 'react';
import { type GreenApiClient, type NotificationBody } from '../api';
import { loadState, saveState } from '../storage';
import type { Chat, Message } from '../types';
import { errorMessage, formatPhone, newTempId, parsePhone } from '../utils';

interface State {
  chats: Chat[];
  messages: Record<string, Message[]>;
  activeId: string | null;
}

type Action =
  | { type: 'openChat'; chat: Chat }
  | { type: 'select'; chatId: string | null }
  | { type: 'addMessage'; message: Message; meta?: { title?: string; phone?: string } }
  | { type: 'confirmSent'; chatId: string; tempId: string; id: string }
  | { type: 'failSent'; chatId: string; tempId: string; error: string }
  | { type: 'retrying'; chatId: string; id: string };

function patchMessage(
  state: State,
  chatId: string,
  id: string,
  patch: Partial<Message>,
): State {
  const list = state.messages[chatId];
  if (!list) return state;
  return {
    ...state,
    messages: { ...state.messages, [chatId]: list.map((m) => (m.id === id ? { ...m, ...patch } : m)) },
  };
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'openChat': {
      const { chat } = action;
      const exists = state.chats.some((c) => c.chatId === chat.chatId);
      const chats = exists
        ? state.chats.map((c) =>
            c.chatId === chat.chatId ? { ...c, phone: chat.phone ?? c.phone, unread: 0 } : c,
          )
        : [...state.chats, chat];
      return { ...state, chats, activeId: chat.chatId };
    }

    case 'select':
      return {
        ...state,
        activeId: action.chatId,
        chats: state.chats.map((c) => (c.chatId === action.chatId ? { ...c, unread: 0 } : c)),
      };

    case 'addMessage': {
      const { message, meta } = action;
      const list = state.messages[message.chatId] ?? [];
      if (list.some((m) => m.id === message.id)) return state; // дубликат (повторная доставка)

      const messages = {
        ...state.messages,
        [message.chatId]: [...list, message].sort((a, b) => a.timestamp - b.timestamp),
      };
      const incomingUnread = message.direction === 'in' && state.activeId !== message.chatId ? 1 : 0;
      const existing = state.chats.find((c) => c.chatId === message.chatId);

      const chats = existing
        ? state.chats.map((c) =>
            c.chatId === message.chatId
              ? {
                  ...c,
                  title: meta?.title ?? c.title,
                  phone: meta?.phone ?? c.phone,
                  lastActivity: Math.max(c.lastActivity, message.timestamp),
                  unread: c.unread + incomingUnread,
                }
              : c,
          )
        : [
            ...state.chats,
            {
              chatId: message.chatId,
              title: meta?.title ?? message.chatId,
              phone: meta?.phone,
              lastActivity: message.timestamp,
              unread: incomingUnread,
            },
          ];
      return { ...state, messages, chats };
    }

    case 'confirmSent': {
      const list = state.messages[action.chatId];
      if (!list) return state;
      const next = list.some((m) => m.id === action.id)
        ? list.filter((m) => m.id !== action.tempId)
        : list.map((m) =>
            m.id === action.tempId
              ? { ...m, id: action.id, status: 'sent' as const, error: undefined }
              : m,
          );
      return { ...state, messages: { ...state.messages, [action.chatId]: next } };
    }

    case 'failSent':
      return patchMessage(state, action.chatId, action.tempId, {
        status: 'error',
        error: action.error,
      });

    case 'retrying':
      return patchMessage(state, action.chatId, action.id, {
        status: 'sending',
        error: undefined,
        timestamp: Date.now(),
      });
  }
}

function senderTitle(body: NotificationBody): string | undefined {
  const sd = body.senderData;
  const name = sd?.senderContactName || sd?.chatName || sd?.senderName;
  if (name) return name;
  return sd?.senderPhoneNumber ? formatPhone(String(sd.senderPhoneNumber)) : undefined;
}

export function useChatStore(idInstance: string, client: GreenApiClient) {
  const [state, dispatch] = useReducer(reducer, idInstance, (id): State => {
    const persisted = loadState(id);
    return { ...persisted, activeId: null };
  });

  useEffect(() => {
    saveState(idInstance, { chats: state.chats, messages: state.messages });
  }, [idInstance, state.chats, state.messages]);

  const handleNotification = useCallback((body: NotificationBody) => {
    const type = body.typeWebhook;
    if (
      type !== 'incomingMessageReceived' &&
      type !== 'outgoingMessageReceived' &&
      type !== 'outgoingAPIMessageReceived'
    ) {
      return;
    }
    const chatId = body.senderData?.chatId;
    const text =
      body.messageData?.textMessageData?.textMessage ??
      body.messageData?.extendedTextMessageData?.text;
    if (!chatId || !body.idMessage || !text) return;
    if (chatId.startsWith('-')) return;

    const incoming = type === 'incomingMessageReceived';
    const phoneNumber = body.senderData?.senderPhoneNumber;
    dispatch({
      type: 'addMessage',
      message: {
        id: body.idMessage,
        chatId,
        text,
        direction: incoming ? 'in' : 'out',
        timestamp: (body.timestamp ?? Math.floor(Date.now() / 1000)) * 1000,
        status: incoming ? undefined : 'sent',
      },
      meta: incoming
        ? { title: senderTitle(body), phone: phoneNumber ? String(phoneNumber) : undefined }
        : undefined,
    });
  }, []);

  const openChatByPhone = useCallback(
    async (input: string): Promise<string | null> => {
      const parsed = parsePhone(input);
      if (!parsed.ok) return parsed.error;

      const known = state.chats.find((c) => c.phone === parsed.phone);
      if (known) {
        dispatch({ type: 'select', chatId: known.chatId });
        return null;
      }
      try {
        const chatId = await client.checkAccount(parsed.phone);
        dispatch({
          type: 'openChat',
          chat: {
            chatId,
            phone: parsed.phone,
            title: formatPhone(parsed.phone),
            lastActivity: Date.now(),
            unread: 0,
          },
        });
        return null;
      } catch (error) {
        return errorMessage(error);
      }
    },
    [client, state.chats],
  );

  const send = useCallback(
    async (chatId: string, text: string, retryId?: string) => {
      const tempId = retryId ?? newTempId();
      if (retryId) {
        dispatch({ type: 'retrying', chatId, id: retryId });
      } else {
        dispatch({
          type: 'addMessage',
          message: {
            id: tempId,
            chatId,
            text,
            direction: 'out',
            timestamp: Date.now(),
            status: 'sending',
          },
        });
      }
      try {
        const id = await client.sendMessage(chatId, text);
        dispatch({ type: 'confirmSent', chatId, tempId, id });
      } catch (error) {
        dispatch({ type: 'failSent', chatId, tempId, error: errorMessage(error) });
      }
    },
    [client],
  );

  const select = useCallback((chatId: string | null) => dispatch({ type: 'select', chatId }), []);

  return { ...state, handleNotification, openChatByPhone, send, select };
}
