'use client';

import Image from 'next/image';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { api, unwrap } from '@/lib/api';
import { timeAgo } from '@/lib/utils';
import { Link } from '@/i18n/navigation';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

interface Article {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  coverUrl?: string;
  publishedAt?: string;
  category?: { name: string };
}

export default function NewsPage() {
  const t = useTranslations('nav');
  const { data, isLoading } = useQuery({
    queryKey: ['news'],
    queryFn: () => unwrap<{ items: Article[] }>(api.get('/news', { params: { limit: 24 } })),
  });
  const { data: highlights } = useQuery({
    queryKey: ['news', 'highlights'],
    queryFn: () => unwrap<{ trending: Article[]; editorPicks: Article[] }>(api.get('/news/highlights')),
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <h1 className="mb-6 text-3xl font-black">{t('news')}</h1>

      {highlights?.trending?.[0] && <FeaturedArticle article={highlights.trending[0]} />}

      <h2 className="mb-4 mt-8 text-xl font-bold">{useTranslations('feed')('latest')}</h2>
      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-72" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data?.items.map((a) => <ArticleCard key={a.id} article={a} />)}
        </div>
      )}
    </div>
  );
}

function FeaturedArticle({ article }: { article: Article }) {
  return (
    <Link href={`/news/${article.slug}`}>
      <Card className="card-hover relative aspect-[21/9] overflow-hidden">
        {article.coverUrl && (
          <Image src={article.coverUrl} alt={article.title} fill className="object-cover" sizes="1200px" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
        <div className="absolute bottom-0 p-6 text-white">
          {article.category && <Badge className="mb-2">{article.category.name}</Badge>}
          <h2 className="max-w-2xl text-2xl font-black md:text-3xl">{article.title}</h2>
          {article.excerpt && <p className="mt-2 max-w-xl text-sm text-white/80">{article.excerpt}</p>}
        </div>
      </Card>
    </Link>
  );
}

function ArticleCard({ article }: { article: Article }) {
  return (
    <Link href={`/news/${article.slug}`}>
      <Card className="card-hover h-full overflow-hidden">
        <div className="relative aspect-video bg-muted">
          {article.coverUrl && (
            <Image src={article.coverUrl} alt={article.title} fill className="object-cover" sizes="400px" />
          )}
        </div>
        <div className="p-4">
          {article.category && <Badge variant="muted" className="mb-2">{article.category.name}</Badge>}
          <h3 className="line-clamp-2 font-bold">{article.title}</h3>
          {article.excerpt && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{article.excerpt}</p>}
          {article.publishedAt && (
            <p className="mt-2 text-xs text-muted-foreground">{timeAgo(article.publishedAt)}</p>
          )}
        </div>
      </Card>
    </Link>
  );
}
