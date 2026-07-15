'use client';

import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { Bell, Check } from 'lucide-react';
import { api, unwrap } from '@/lib/api';
import { timeAgo } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

interface Notification {
  id: string;
  type: string;
  title: string;
  body?: string;
  isRead: boolean;
  createdAt: string;
}

export default function NotificationsPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['notifications', 'list'],
    queryFn: () => unwrap<{ items: Notification[] }>(api.get('/notifications', { params: { limit: 50 } })),
  });

  const markAll = useMutation({
    mutationFn: () => api.patch('/notifications/read-all'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-black">Notifications</h1>
        <Button variant="outline" size="sm" onClick={() => markAll.mutate()}>
          <Check className="h-4 w-4" /> Mark all read
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16" />)}
        </div>
      ) : data && data.items.length > 0 ? (
        <div className="space-y-2">
          {data.items.map((n) => (
            <Card key={n.id} className={`flex items-start gap-3 p-4 ${!n.isRead ? 'border-primary/40 bg-primary/5' : ''}`}>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary">
                <Bell className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className="font-medium">{n.title}</p>
                {n.body && <p className="text-sm text-muted-foreground">{n.body}</p>}
                <p className="mt-1 text-xs text-muted-foreground">{timeAgo(n.createdAt)}</p>
              </div>
              {!n.isRead && <span className="mt-2 h-2 w-2 rounded-full bg-primary" />}
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-12 text-center text-muted-foreground">No notifications yet</Card>
      )}
    </div>
  );
}
