'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Heart, Gauge, Calendar, MapPin, SlidersHorizontal } from 'lucide-react';
import { api, unwrap } from '@/lib/api';
import type { Listing, Paginated } from '@/lib/types';
import { formatPrice } from '@/lib/utils';
import { Link } from '@/i18n/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { CreateListing } from '@/features/marketplace/create-listing';

const categories = ['CAR', 'MOTORCYCLE', 'PART', 'WHEEL', 'ACCESSORY'] as const;

export default function MarketplacePage() {
  const t = useTranslations('marketplace');
  const [filters, setFilters] = useState<{ category?: string }>({});

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['marketplace', filters],
    queryFn: () =>
      unwrap<Paginated<Listing>>(
        api.get('/marketplace', { params: { ...filters, limit: 24 } }),
      ),
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-6 flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-black">{t('title')}</h1>
          <p className="text-muted-foreground">{t('subtitle')}</p>
        </div>
        <CreateListing onCreated={() => refetch()} />
      </div>

      <Card className="mb-6 flex flex-wrap items-center gap-3 p-4">
        <SlidersHorizontal className="h-5 w-5 text-muted-foreground" />
        <div className="flex flex-wrap gap-2">
          <Button
            variant={!filters.category ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilters((f) => ({ ...f, category: undefined }))}
          >
            {t('categories.all')}
          </Button>
          {categories.map((c) => (
            <Button
              key={c}
              variant={filters.category === c ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilters((f) => ({ ...f, category: c }))}
            >
              {t(`categories.${c}`)}
            </Button>
          ))}
        </div>
      </Card>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      ) : data && data.items.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {data.items.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      ) : (
        <Card className="p-12 text-center text-muted-foreground">{t('noResults')}</Card>
      )}
    </div>
  );
}

function ListingCard({ listing }: { listing: Listing }) {
  const t = useTranslations('marketplace');
  return (
    <Link href={`/marketplace/${listing.slug}`}>
      <Card className="card-hover group overflow-hidden">
        <div className="relative aspect-[4/3] bg-muted">
          {listing.media?.[0] ? (
            <Image src={listing.media[0].url} alt={listing.title} fill className="object-cover" sizes="300px" />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">No image</div>
          )}
          <button className="absolute right-3 top-3 rounded-full bg-black/50 p-2 text-white backdrop-blur">
            <Heart className="h-4 w-4" />
          </button>
          <Badge className="absolute left-3 top-3" variant="secondary">
            {t.has(`categories.${listing.category}`) ? t(`categories.${listing.category}`) : listing.category}
          </Badge>
        </div>
        <div className="p-4">
          <p className="text-lg font-bold text-primary">{formatPrice(listing.price, listing.currency)}</p>
          <h3 className="mt-1 line-clamp-1 font-semibold">{listing.title}</h3>
          <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
            {listing.year && (
              <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{listing.year}</span>
            )}
            {listing.mileage != null && (
              <span className="flex items-center gap-1"><Gauge className="h-3 w-3" />{listing.mileage.toLocaleString()} km</span>
            )}
            {listing.city && (
              <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{listing.city}</span>
            )}
          </div>
        </div>
      </Card>
    </Link>
  );
}
