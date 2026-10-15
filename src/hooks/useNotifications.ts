import { useEffect, useRef, useState } from 'react';
import { ApiError, type GreenApiClient, type NotificationBody } from '../api';
import type { ConnectionState } from '../types';
import { errorMessage } from '../utils';

export interface Connection {
  status: ConnectionState;
  error?: string;
}

const MIN_EMPTY_POLL_MS = 3000;

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        resolve();
      },
      { once: true },
    );
  });
}

export function useNotifications(
  client: GreenApiClient,
  onNotification: (body: NotificationBody) => void,
  onFatal: (message: string) => void,
): Connection {
  const [connection, setConnection] = useState<Connection>({ status: 'connecting' });
  const handlerRef = useRef(onNotification);
  const fatalRef = useRef(onFatal);

  useEffect(() => {
    handlerRef.current = onNotification;
    fatalRef.current = onFatal;
  }, [onNotification, onFatal]);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    async function poll() {
      let failures = 0;
      while (!signal.aborted) {
        try {
          const startedAt = Date.now();
          const notification = await client.receiveNotification(signal);
          failures = 0;
          setConnection((prev) =>
            prev.status === 'online' && !prev.error ? prev : { status: 'online' },
          );
          if (!notification) {
            const elapsed = Date.now() - startedAt;
            if (elapsed < MIN_EMPTY_POLL_MS) await sleep(MIN_EMPTY_POLL_MS - elapsed, signal);
            continue;
          }
          try {
            handlerRef.current(notification.body);
          } catch (error) {
            console.error('Не удалось обработать уведомление', error);
          }
          await client.deleteNotification(notification.receiptId, signal);
        } catch (error) {
          if (signal.aborted) return;
          if (error instanceof ApiError && error.status === 401) {
            fatalRef.current(error.message);
            return;
          }
          failures += 1;
          setConnection({ status: 'offline', error: errorMessage(error) });
          await sleep(Math.min(3000 * failures, 15000), signal);
        }
      }
    }

    void poll();
    return () => controller.abort();
  }, [client]);

  return connection;
}
