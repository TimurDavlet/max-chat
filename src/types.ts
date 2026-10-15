export interface Credentials {
  idInstance: string;
  apiTokenInstance: string;
  apiUrl: string;
}

export type MessageStatus = 'sending' | 'sent' | 'error';

export interface Message {
  id: string;
  chatId: string;
  text: string;
  direction: 'in' | 'out';
  timestamp: number;
  status?: MessageStatus;
  error?: string;
}

export interface Chat {
  chatId: string;
  title: string;
  phone?: string;
  lastActivity: number;
  unread: number;
}

export type ConnectionState = 'connecting' | 'online' | 'offline';
