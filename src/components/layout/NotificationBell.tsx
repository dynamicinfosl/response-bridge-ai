import { useNavigate } from 'react-router-dom';
import { Bell, ArrowRight, CheckCheck, Inbox } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import type { TransferNotification } from '@/hooks/useTransferNotification';

interface NotificationBellProps {
  notifications: TransferNotification[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
}

function timeAgo(timestamp: number): string {
  const diffMs = Date.now() - timestamp;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'agora mesmo';
  if (diffMin === 1) return 'há 1 minuto';
  if (diffMin < 60) return `há ${diffMin} minutos`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH === 1) return 'há 1 hora';
  if (diffH < 24) return `há ${diffH} horas`;
  const diffD = Math.floor(diffH / 24);
  if (diffD === 1) return 'há 1 dia';
  return `há ${diffD} dias`;
}

export function NotificationBell({
  notifications,
  unreadCount,
  markAsRead,
  markAllAsRead,
}: NotificationBellProps) {
  const navigate = useNavigate();

  const handleClickNotification = (notif: TransferNotification) => {
    markAsRead(notif.id);
    navigate('/atendimentos', { state: { openChatId: notif.chatId } });
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-10 w-10 rounded-full text-white hover:bg-white/10 flex-shrink-0"
          aria-label="Notificações"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white leading-none ring-2 ring-primary">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-80 p-0 shadow-lg bg-background border border-border"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" />
            Notificações
          </h3>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Marcar todas como lidas
            </button>
          )}
        </div>

        {/* List */}
        <div className="max-h-80 overflow-y-auto divide-y divide-border">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center px-4 gap-2">
              <Inbox className="h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">Nenhuma notificação ainda</p>
            </div>
          ) : (
            notifications.map(notif => (
              <button
                key={notif.id}
                onClick={() => handleClickNotification(notif)}
                className={cn(
                  'w-full text-left px-4 py-3 flex items-start gap-3 transition-colors hover:bg-muted/50',
                  !notif.read && 'bg-primary/5'
                )}
              >
                {/* Unread dot */}
                <div className="flex-shrink-0 mt-1.5">
                  {notif.read ? (
                    <div className="h-2 w-2 rounded-full bg-transparent" />
                  ) : (
                    <div className="h-2 w-2 rounded-full bg-primary" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    'text-sm truncate',
                    notif.read ? 'text-muted-foreground' : 'text-foreground font-medium'
                  )}>
                    {notif.clientName}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Atendimento transferido para você
                  </p>
                  <p className="text-[11px] text-muted-foreground/70 mt-1">
                    {timeAgo(notif.timestamp)}
                  </p>
                </div>

                <ArrowRight className="h-4 w-4 text-muted-foreground/40 flex-shrink-0 mt-1" />
              </button>
            ))
          )}
        </div>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="border-t border-border px-4 py-2.5">
            <button
              onClick={() => navigate('/atendimentos')}
              className="text-xs text-primary hover:underline w-full text-center"
            >
              Ver todos os atendimentos
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
