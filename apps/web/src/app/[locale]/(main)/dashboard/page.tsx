'use client';

import { useQuery } from '@tanstack/react-query';
import { CalendarCheck, Clock, Star, DollarSign, Tag } from 'lucide-react';
import { api, unwrap } from '@/lib/api';
import { formatPrice, timeAgo } from '@/lib/utils';
import { useAuth } from '@/lib/auth-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';

export default function DashboardPage() {
  const user = useAuth((s) => s.user);
  const { data, isLoading, isError } = useQuery({
    queryKey: ['business', 'dashboard'],
    queryFn: () => unwrap<any>(api.get('/businesses/me/dashboard')),
    enabled: !!user,
    retry: false,
  });

  if (!user) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center text-muted-foreground">
        <p>Log in to access your dashboard.</p>
        <Button className="mt-4" asChild><Link href="/login">Log in</Link></Button>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <p className="text-muted-foreground">კომპანია ჯერ არ გაქვს დამატებული.</p>
        <Button className="mt-4" asChild><Link href="/services">სერვისებში დამატება</Link></Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <h1 className="mb-6 text-3xl font-black">Business Dashboard</h1>

      {isLoading || !data ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Kpi icon={<CalendarCheck />} label="Total bookings" value={data.kpis.totalBookings} />
            <Kpi icon={<Clock />} label="Pending" value={data.kpis.pendingBookings} />
            <Kpi icon={<Star />} label="Reviews" value={data.kpis.reviews} />
            <Kpi icon={<DollarSign />} label="Revenue 30d" value={formatPrice(data.kpis.revenue30d)} />
          </div>

          <Card className="mt-6">
            <CardHeader><CardTitle className="text-base">Recent bookings</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {data.recentBookings.length === 0 && <p className="text-sm text-muted-foreground">No bookings yet.</p>}
              {data.recentBookings.map((b: any) => (
                <div key={b.id} className="flex items-center justify-between border-b border-border pb-3 last:border-0">
                  <div>
                    <p className="font-medium">{b.user?.profile?.displayName ?? b.user?.username}</p>
                    <p className="text-xs text-muted-foreground">{b.service?.name ?? 'Service'} · {timeAgo(b.createdAt)}</p>
                  </div>
                  <Badge variant={b.status === 'PENDING' ? 'default' : 'muted'}>{b.status.toLowerCase()}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function Kpi({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 pt-6">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary [&_svg]:h-5 [&_svg]:w-5">
          {icon}
        </div>
        <div>
          <p className="text-2xl font-black">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}
