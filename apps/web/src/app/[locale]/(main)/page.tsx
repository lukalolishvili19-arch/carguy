'use client';

import { useTranslations } from 'next-intl';
import { TrendingUp, Trophy } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth-store';
import { api, unwrap } from '@/lib/api';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { CreatePost } from '@/features/feed/create-post';
import { FeedList } from '@/features/feed/feed-list';
import { StoriesBar } from '@/features/stories/stories-bar';
import { getInitials } from '@/lib/utils';

export default function HomePage() {
  const t = useTranslations('feed');
  const user = useAuth((s) => s.user);

  return (
    <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-4 py-6 lg:grid-cols-[1fr_320px]">
      <div className="min-w-0 space-y-4">
        <StoriesBar />
        <CreatePost />
        <Tabs defaultValue={user ? 'foryou' : 'latest'}>
          <TabsList className="w-full">
            {user && <TabsTrigger value="foryou" className="flex-1">{t('forYou')}</TabsTrigger>}
            <TabsTrigger value="latest" className="flex-1">{t('latest')}</TabsTrigger>
          </TabsList>
          {user && (
            <TabsContent value="foryou">
              <FeedList scope="personalized" />
            </TabsContent>
          )}
          <TabsContent value="latest">
            <FeedList scope="public" />
          </TabsContent>
        </Tabs>
      </div>

      <aside className="hidden space-y-4 lg:block">
        <Leaderboard />
      </aside>
    </div>
  );
}

function Leaderboard() {
  const { data } = useQuery({
    queryKey: ['leaderboard'],
    queryFn: () => unwrap<any[]>(api.get('/reputation/leaderboard', { params: { limit: 6 } })),
  });

  return (
    <Card>
      <CardHeader className="flex-row items-center gap-2">
        <Trophy className="h-5 w-5 text-primary" />
        <CardTitle className="text-base">Top Contributors</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {(data ?? []).map((r, i) => (
          <div key={r.userId} className="flex items-center gap-3">
            <span className="w-5 text-sm font-bold text-muted-foreground">{i + 1}</span>
            <Avatar className="h-8 w-8">
              <AvatarImage src={r.user?.profile?.avatarUrl} />
              <AvatarFallback>{getInitials(r.user?.profile?.displayName ?? r.user?.username)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{r.user?.profile?.displayName ?? r.user?.username}</p>
              <p className="text-xs text-muted-foreground">Lv {r.level} · {r.xp} XP</p>
            </div>
            {i === 0 && <TrendingUp className="h-4 w-4 text-primary" />}
          </div>
        ))}
        {!data && <p className="text-sm text-muted-foreground">Loading…</p>}
      </CardContent>
    </Card>
  );
}
