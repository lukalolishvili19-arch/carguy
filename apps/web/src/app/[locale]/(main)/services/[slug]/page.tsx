'use client';

import { use } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  MapPin,
  Phone,
  BadgeCheck,
  Briefcase,
  Star,
  Wrench,
  Calendar,
  Car,
} from 'lucide-react';
import { api, unwrap } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';

export default function ServiceDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const { data, isLoading, isError } = useQuery({
    queryKey: ['business', slug],
    queryFn: () => unwrap<any>(api.get(`/businesses/${slug}`)),
  });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl space-y-4 px-4 py-6">
        <Skeleton className="h-48" />
        <Skeleton className="h-32" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center text-muted-foreground">
        <p>კომპანია ვერ მოიძებნა</p>
        <Button className="mt-4" asChild><Link href="/services">უკან</Link></Button>
      </div>
    );
  }

  const yearRange =
    data.yearFrom || data.yearTo
      ? `${data.yearFrom ?? '…'} – ${data.yearTo ?? '…'}`
      : null;

  return (
    <div className="mx-auto max-w-4xl space-y-4 px-4 py-6">
      <Card className="overflow-hidden">
        <div className="h-36 bg-gradient-to-r from-brand-red/30 to-accent/30">
          {data.coverUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={data.coverUrl} alt="" className="h-full w-full object-cover" />
          )}
        </div>
        <CardContent className="relative pt-0">
          <div className="-mt-10 flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border-4 border-card bg-secondary">
            {data.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={data.logoUrl} alt={data.name} className="h-full w-full object-cover" />
            ) : (
              <Wrench className="h-8 w-8 text-muted-foreground" />
            )}
          </div>

          <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black">{data.name}</h1>
                <Briefcase className="h-5 w-5 text-accent" />
                {data.verification === 'VERIFIED' && <BadgeCheck className="h-5 w-5 text-accent" />}
              </div>
              <Badge variant="muted" className="mt-1">{String(data.category).replace(/_/g, ' ')}</Badge>
            </div>
            <div className="flex items-center gap-1 text-amber-500">
              <Star className="h-4 w-4 fill-amber-500" />
              <span className="font-semibold">{Number(data.ratingAvg || 0).toFixed(1)}</span>
              <span className="text-sm text-muted-foreground">({data.ratingCount})</span>
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="flex items-center gap-2 rounded-xl bg-secondary px-3 py-2 text-sm">
              <Phone className="h-4 w-4 text-primary" />
              <a href={`tel:${data.phone}`} className="font-semibold hover:underline">{data.phone}</a>
            </div>
            <div className="flex items-center gap-2 rounded-xl bg-secondary px-3 py-2 text-sm">
              <MapPin className="h-4 w-4 text-primary" />
              <span>
                {data.city}
                {data.addressLine ? `, ${data.addressLine}` : ''}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">კომპანიის შესახებ</CardTitle></CardHeader>
        <CardContent>
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{data.description}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Car className="h-4 w-4" /> მარკა / მოდელი / წელი
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.supportedBrands?.length > 0 ? (
            <div>
              <p className="mb-2 text-xs font-medium text-muted-foreground">მარკები</p>
              <div className="flex flex-wrap gap-2">
                {data.supportedBrands.map((b: string) => (
                  <Badge key={b} variant="muted">{b}</Badge>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">მარკები მითითებული არ არის</p>
          )}

          {data.supportedModels?.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-medium text-muted-foreground">მოდელები</p>
              <div className="flex flex-wrap gap-2">
                {data.supportedModels.map((m: string) => (
                  <Badge key={m} variant="secondary">{m}</Badge>
                ))}
              </div>
            </div>
          )}

          {yearRange && (
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>წლები: <strong>{yearRange}</strong></span>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Wrench className="h-4 w-4" /> რისი გაკეთება შეუძლიათ
          </CardTitle>
        </CardHeader>
        <CardContent>
          {(data.capabilities?.length > 0 || data.services?.length > 0) ? (
            <div className="flex flex-wrap gap-2">
              {(data.capabilities?.length ? data.capabilities : data.services.map((s: any) => s.name)).map(
                (c: string, i: number) => (
                  <Badge key={`${c}-${i}`} variant="default">{c}</Badge>
                ),
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">სერვისები მითითებული არ არის</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
