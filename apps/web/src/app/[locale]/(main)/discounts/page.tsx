'use client';

import { useQuery } from '@tanstack/react-query';
import { Tag, Clock } from 'lucide-react';
import { api, unwrap } from '@/lib/api';
import { timeAgo } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

interface Discount {
  id: string;
  type: string;
  title: string;
  description?: string;
  percentOff?: number;
  code?: string;
  expiresAt?: string;
  business?: { name: string; city?: string; logoUrl?: string };
}

export default function DiscountsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['discounts'],
    queryFn: () => unwrap<{ items: Discount[] }>(api.get('/discounts', { params: { limit: 24 } })),
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <h1 className="mb-1 text-3xl font-black">Discount Center</h1>
      <p className="mb-6 text-muted-foreground">Deals, coupons and flash sales from partners</p>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-44" />)}
        </div>
      ) : data && data.items.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.items.map((d) => (
            <Card key={d.id} className="card-hover overflow-hidden">
              <div className="flex items-center justify-between bg-primary p-4 text-primary-foreground">
                <Tag className="h-6 w-6" />
                {d.percentOff && <span className="text-3xl font-black">-{d.percentOff}%</span>}
              </div>
              <CardContent className="pt-4">
                <Badge variant="muted" className="mb-2">{d.type.replace('_', ' ').toLowerCase()}</Badge>
                <h3 className="font-bold">{d.title}</h3>
                {d.description && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{d.description}</p>}
                {d.business && <p className="mt-2 text-sm font-medium">{d.business.name}</p>}
                <div className="mt-3 flex items-center justify-between">
                  {d.expiresAt && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" /> ends {timeAgo(d.expiresAt)}
                    </span>
                  )}
                  <Button size="sm">Redeem</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-12 text-center text-muted-foreground">No active discounts right now</Card>
      )}
    </div>
  );
}
