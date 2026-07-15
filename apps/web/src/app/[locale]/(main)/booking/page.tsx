'use client';

import { useQuery } from '@tanstack/react-query';
import { CalendarCheck, Clock } from 'lucide-react';
import { api, unwrap } from '@/lib/api';
import { formatPrice } from '@/lib/utils';
import { useAuth } from '@/lib/auth-store';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';

const statusVariant: Record<string, any> = {
  PENDING: 'default',
  CONFIRMED: 'accent',
  COMPLETED: 'success',
  CANCELLED: 'muted',
};

export default function BookingPage() {
  const user = useAuth((s) => s.user);
  const { data, isLoading } = useQuery({
    queryKey: ['bookings'],
    queryFn: () => unwrap<{ items: any[] }>(api.get('/bookings', { params: { limit: 50 } })),
    enabled: !!user,
  });

  if (!user) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center text-muted-foreground">
        <p>Log in to view your bookings.</p>
        <Button className="mt-4" asChild><Link href="/login">Log in</Link></Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="mb-6 text-3xl font-black">My Bookings</h1>
      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
      ) : data && data.items.length > 0 ? (
        <div className="space-y-3">
          {data.items.map((b) => (
            <Card key={b.id}>
              <CardContent className="flex items-center justify-between py-4">
                <div>
                  <p className="font-bold">{b.business?.name}</p>
                  <p className="text-sm text-muted-foreground">{b.service?.name ?? 'Service'}</p>
                  <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" /> {new Date(b.scheduledAt).toLocaleString()}
                  </p>
                </div>
                <div className="text-right">
                  <Badge variant={statusVariant[b.status] ?? 'muted'}>{b.status.toLowerCase()}</Badge>
                  {b.estimatedPrice && <p className="mt-2 text-sm font-semibold">{formatPrice(b.estimatedPrice)}</p>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-12 text-center text-muted-foreground">
          <CalendarCheck className="mx-auto mb-3 h-10 w-10" /> No bookings yet
        </Card>
      )}
    </div>
  );
}
