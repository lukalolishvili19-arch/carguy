'use client';

import Image from 'next/image';
import { useQuery } from '@tanstack/react-query';
import { CalendarDays, MapPin, Users } from 'lucide-react';
import { api, unwrap } from '@/lib/api';
import { Link } from '@/i18n/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

interface EventItem {
  id: string;
  title: string;
  slug: string;
  type: string;
  coverUrl?: string;
  city?: string;
  venue?: string;
  startsAt: string;
  _count?: { rsvps: number };
}

export default function EventsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['events'],
    queryFn: () => unwrap<{ items: EventItem[] }>(api.get('/events', { params: { limit: 24 } })),
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <h1 className="mb-1 text-3xl font-black">Events</h1>
      <p className="mb-6 text-muted-foreground">Car meets, shows, track days and more</p>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-72" />)}
        </div>
      ) : data && data.items.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.items.map((e) => {
            const date = new Date(e.startsAt);
            return (
              <Link key={e.id} href={`/events/${e.slug}`}>
                <Card className="card-hover h-full overflow-hidden">
                  <div className="relative aspect-video bg-muted">
                    {e.coverUrl && <Image src={e.coverUrl} alt={e.title} fill className="object-cover" sizes="400px" />}
                    <div className="absolute left-3 top-3 rounded-xl bg-background/90 px-3 py-1.5 text-center backdrop-blur">
                      <p className="text-lg font-black leading-none">{date.getDate()}</p>
                      <p className="text-xs uppercase text-muted-foreground">
                        {date.toLocaleString('en', { month: 'short' })}
                      </p>
                    </div>
                  </div>
                  <CardContent className="pt-4">
                    <Badge variant="muted" className="mb-2">{e.type.replace('_', ' ').toLowerCase()}</Badge>
                    <h3 className="line-clamp-1 font-bold">{e.title}</h3>
                    <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                      {(e.venue || e.city) && (
                        <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{e.venue ?? e.city}</span>
                      )}
                      <span className="flex items-center gap-1"><Users className="h-3 w-3" />{e._count?.rsvps ?? 0} going</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      ) : (
        <Card className="p-12 text-center text-muted-foreground">
          <CalendarDays className="mx-auto mb-3 h-10 w-10" /> No upcoming events
        </Card>
      )}
    </div>
  );
}
