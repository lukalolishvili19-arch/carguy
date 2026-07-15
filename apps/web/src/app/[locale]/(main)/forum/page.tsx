'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MessageSquare, ArrowBigUp, Eye, Pin } from 'lucide-react';
import { api, unwrap } from '@/lib/api';
import { timeAgo } from '@/lib/utils';
import { Link } from '@/i18n/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

interface Category { id: string; name: string; slug: string; icon?: string; _count?: { threads: number } }
interface Thread {
  id: string;
  title: string;
  slug: string;
  voteScore: number;
  viewCount: number;
  replyCount: number;
  isPinned: boolean;
  createdAt: string;
  author: { username: string; profile?: { displayName?: string } };
  category: { name: string; icon?: string };
}

export default function ForumPage() {
  const [categorySlug, setCategorySlug] = useState<string>();
  const { data: categories } = useQuery({
    queryKey: ['forum', 'categories'],
    queryFn: () => unwrap<Category[]>(api.get('/forum/categories')),
  });
  const { data, isLoading } = useQuery({
    queryKey: ['forum', 'threads', categorySlug],
    queryFn: () =>
      unwrap<{ items: Thread[] }>(api.get('/forum/threads', { params: { categorySlug, sort: 'active', limit: 24 } })),
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black">ფორუმი</h1>
          <p className="text-muted-foreground">განიხილე, ჰკითხე, გააზიარე ცოდნა</p>
        </div>
        <Button>ახალი თემა</Button>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        <Button variant={!categorySlug ? 'default' : 'outline'} size="sm" onClick={() => setCategorySlug(undefined)}>ყველა</Button>
        {categories?.map((c) => (
          <Button key={c.id} variant={categorySlug === c.slug ? 'default' : 'outline'} size="sm" onClick={() => setCategorySlug(c.slug)}>
            {c.icon} {c.name}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-20" />)}</div>
      ) : (
        <div className="space-y-3">
          {data?.items.map((thread) => (
            <Card key={thread.id} className="card-hover">
              <CardContent className="flex items-center gap-4 py-4">
                <div className="flex w-12 shrink-0 flex-col items-center">
                  <ArrowBigUp className="h-5 w-5 text-muted-foreground" />
                  <span className="font-bold">{thread.voteScore}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    {thread.isPinned && <Pin className="h-3 w-3 text-primary" />}
                    <Badge variant="muted">{thread.category.icon} {thread.category.name}</Badge>
                  </div>
                  <h3 className="mt-1 line-clamp-1 font-bold">{thread.title}</h3>
                  <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                    <Link href={`/u/${thread.author.username}`} className="hover:text-foreground hover:underline">
                      @{thread.author.username}
                    </Link>
                    <span>·</span>
                    <span>{timeAgo(thread.createdAt)}</span>
                    <span className="flex items-center gap-1"><MessageSquare className="h-3 w-3" />{thread.replyCount}</span>
                    <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{thread.viewCount}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
