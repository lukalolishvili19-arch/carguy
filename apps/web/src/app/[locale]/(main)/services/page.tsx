'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Wrench, Star, MapPin, BadgeCheck, Briefcase, Phone } from 'lucide-react';
import { api, unwrap } from '@/lib/api';
import { useAuth } from '@/lib/auth-store';
import { Link } from '@/i18n/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { CreateBusinessButton } from '@/features/services/create-business';

const categories = ['MECHANIC', 'DETAILING', 'CAR_WASH', 'TUNING', 'TIRES', 'BODY_REPAIR', 'DEALERSHIP'];

interface Business {
  id: string;
  name: string;
  slug: string;
  category: string;
  city?: string;
  phone?: string;
  logoUrl?: string;
  ratingAvg: number;
  ratingCount: number;
  verification: string;
  _count?: { reviews: number; services: number };
}

export default function ServicesPage() {
  const user = useAuth((s) => s.user);
  const [category, setCategory] = useState<string>();
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['services', category],
    queryFn: () => unwrap<{ items: Business[] }>(api.get('/businesses', { params: { category, limit: 24 } })),
  });

  const canAddCompany =
    user?.role === 'ADMIN' ||
    (user?.role === 'BUSINESS' &&
      user.businessSubscription?.status === 'ACTIVE' &&
      (!user.businessSubscription.currentPeriodEnd ||
        new Date(user.businessSubscription.currentPeriodEnd) > new Date()));

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <h1 className="mb-1 text-3xl font-black">სერვისები</h1>
          <p className="text-muted-foreground">იპოვე სანდო სერვისები და კომპანიები</p>
        </div>
        {canAddCompany ? (
          <CreateBusinessButton onCreated={() => refetch()} />
        ) : user ? (
          <div className="max-w-xs space-y-2 text-right">
            <p className="text-xs text-muted-foreground">
              კომპანიის განთავსება — Business გამოწერა 10 ₾/თვე
            </p>
            <Button size="sm" variant="outline" asChild>
              <Link href="/business/checkout">გამოწერის გააქტიურება</Link>
            </Button>
          </div>
        ) : null}
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        <Button variant={!category ? 'default' : 'outline'} size="sm" onClick={() => setCategory(undefined)}>ყველა</Button>
        {categories.map((c) => (
          <Button key={c} variant={category === c ? 'default' : 'outline'} size="sm" onClick={() => setCategory(c)}>
            {c.replace('_', ' ').toLowerCase()}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-40" />)}
        </div>
      ) : data && data.items.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.items.map((b) => (
            <Link key={b.id} href={`/services/${b.slug}`}>
              <Card className="card-hover h-full">
                <CardContent className="flex gap-4 pt-5">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-secondary">
                    {b.logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={b.logoUrl} alt={b.name} className="h-full w-full rounded-xl object-cover" />
                    ) : (
                      <Wrench className="h-6 w-6 text-muted-foreground" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1">
                      <h3 className="truncate font-bold">{b.name}</h3>
                      <Briefcase className="h-3.5 w-3.5 shrink-0 text-accent" />
                      {b.verification === 'VERIFIED' && <BadgeCheck className="h-4 w-4 shrink-0 text-accent" />}
                    </div>
                    <Badge variant="muted" className="mt-1">{b.category.replace('_', ' ').toLowerCase()}</Badge>
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1 text-amber-500">
                        <Star className="h-3 w-3 fill-amber-500" />{Number(b.ratingAvg || 0).toFixed(1)} ({b.ratingCount})
                      </span>
                      {b.city && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{b.city}</span>}
                      {b.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{b.phone}</span>}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Card className="p-12 text-center text-muted-foreground">კომპანიები ჯერ არ არის</Card>
      )}
    </div>
  );
}
