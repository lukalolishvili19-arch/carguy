'use client';

import { useQuery } from '@tanstack/react-query';
import { Bell } from 'lucide-react';
import { api, unwrap } from '@/lib/api';
import { useAuth } from '@/lib/auth-store';
import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';

export function NotificationBell() {
  const user = useAuth((s) => s.user);
  const { data } = useQuery({
    queryKey: ['notifications', 'unread'],
    queryFn: () => unwrap<{ unread: number }>(api.get('/notifications/unread-count')),
    enabled: !!user,
    refetchInterval: 30_000,
  });

  if (!user) return null;
  const unread = data?.unread ?? 0;

  return (
    <Button variant="ghost" size="icon" asChild aria-label="Notifications">
      <Link href="/notifications" className="relative">
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </Link>
    </Button>
  );
}
