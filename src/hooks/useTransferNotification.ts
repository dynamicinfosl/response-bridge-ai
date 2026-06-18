import { useEffect, useRef, useState, useCallback } from 'react';
import { toast } from 'sonner';
import type { Chat } from '@/lib/api';

export interface TransferNotification {
  id: string;
  chatId: string;
  clientName: string;
  timestamp: number;
  read: boolean;
}

const MAX_NOTIFICATIONS = 20;
const STORAGE_KEY_PREFIX = 'transfer_notifications_';

function getStorageKey(userId: string) {
  return `${STORAGE_KEY_PREFIX}${userId}`;
}

function loadNotifications(userId: string): TransferNotification[] {
  try {
    const raw = localStorage.getItem(getStorageKey(userId));
    if (!raw) return [];
    return JSON.parse(raw) as TransferNotification[];
  } catch {
    return [];
  }
}

function saveNotifications(userId: string, notifications: TransferNotification[]) {
  try {
    localStorage.setItem(getStorageKey(userId), JSON.stringify(notifications));
  } catch {
    // ignore
  }
}

function playAlertSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const playBip = (startTime: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.35, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.18);
      osc.start(startTime);
      osc.stop(startTime + 0.18);
    };
    playBip(ctx.currentTime);
    playBip(ctx.currentTime + 0.25);
    setTimeout(() => ctx.close(), 800);
  } catch {
    // browser may block AudioContext without user gesture — ignore
  }
}

function sendPushNotification(clientName: string) {
  if (!('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;
  try {
    new Notification('Atendimento transferido para você', {
      body: `Conversa com ${clientName} foi atribuída a você`,
      icon: '/favicon.ico',
    });
  } catch {
    // ignore
  }
}

function requestPushPermission() {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'default') {
    Notification.requestPermission().catch(() => {});
  }
}

interface UseTransferNotificationOptions {
  chats: Chat[] | undefined;
  myId: number | null | undefined;
  userId: string | null | undefined;
  onNavigateToChat?: (chatId: string) => void;
}

export function useTransferNotification({
  chats,
  myId,
  userId,
  onNavigateToChat,
}: UseTransferNotificationOptions) {
  const prevAssigneeMap = useRef<Map<string, number | null | undefined>>(new Map());
  const isFirstRender = useRef(true);
  const notifiedChats = useRef<Set<string>>(new Set());

  const [notifications, setNotifications] = useState<TransferNotification[]>(() => {
    if (!userId) return [];
    return loadNotifications(userId);
  });

  // Reload from localStorage when userId becomes available
  useEffect(() => {
    if (!userId) return;
    setNotifications(loadNotifications(userId));
  }, [userId]);

  // Request push permission on mount
  useEffect(() => {
    requestPushPermission();
  }, []);

  useEffect(() => {
    if (!chats || !myId || !userId) {
      if (chats) isFirstRender.current = false;
      return;
    }

    if (isFirstRender.current) {
      // Populate the previous map without triggering notifications
      chats.forEach(chat => {
        prevAssigneeMap.current.set(chat.id, chat.assigneeId);
      });
      isFirstRender.current = false;
      return;
    }

    const newNotifications: TransferNotification[] = [];

    chats.forEach(chat => {
      const prev = prevAssigneeMap.current.get(chat.id);
      const curr = chat.assigneeId;

      // Detect: assigneeId changed TO myId (and wasn't already myId)
      if (
        curr === myId &&
        prev !== myId &&
        !notifiedChats.current.has(chat.id)
      ) {
        notifiedChats.current.add(chat.id);
        setTimeout(() => notifiedChats.current.delete(chat.id), 30000);

        const clientName = chat.name || `Conversa #${chat.id}`;

        // Toast
        toast.success(`📩 Atendimento transferido para você`, {
          description: `${clientName} — clique para abrir`,
          duration: 8000,
          action: onNavigateToChat
            ? {
                label: 'Abrir',
                onClick: () => onNavigateToChat(chat.id),
              }
            : undefined,
        });

        // Push
        sendPushNotification(clientName);

        // Sound
        playAlertSound();

        // Add to history
        const notif: TransferNotification = {
          id: `${chat.id}_${Date.now()}`,
          chatId: chat.id,
          clientName,
          timestamp: Date.now(),
          read: false,
        };
        newNotifications.push(notif);
      }

      prevAssigneeMap.current.set(chat.id, curr);
    });

    // Remove chats that no longer exist from the map
    const currentIds = new Set(chats.map(c => c.id));
    for (const key of prevAssigneeMap.current.keys()) {
      if (!currentIds.has(key)) {
        prevAssigneeMap.current.delete(key);
      }
    }

    if (newNotifications.length > 0) {
      setNotifications(prev => {
        const merged = [...newNotifications, ...prev].slice(0, MAX_NOTIFICATIONS);
        saveNotifications(userId, merged);
        return merged;
      });
    }
  }, [chats, myId, userId, onNavigateToChat]);

  const markAsRead = useCallback((id: string) => {
    setNotifications(prev => {
      const updated = prev.map(n => (n.id === id ? { ...n, read: true } : n));
      if (userId) saveNotifications(userId, updated);
      return updated;
    });
  }, [userId]);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => {
      const updated = prev.map(n => ({ ...n, read: true }));
      if (userId) saveNotifications(userId, updated);
      return updated;
    });
  }, [userId]);

  const unreadCount = notifications.filter(n => !n.read).length;

  return { notifications, unreadCount, markAsRead, markAllAsRead };
}
