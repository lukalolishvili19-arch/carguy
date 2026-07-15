'use client';

import { use, useMemo, useState } from 'react';
import Image from 'next/image';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { MapPin, Trophy, BadgeCheck, MessageCircle, Loader2, Briefcase } from 'lucide-react';
import { toast } from 'sonner';
import { api, unwrap, apiErrorMessage } from '@/lib/api';
import { getInitials } from '@/lib/utils';
import { useAuth } from '@/lib/auth-store';
import { Link, useRouter } from '@/i18n/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PostCard } from '@/features/feed/post-card';
import { useFeed } from '@/features/feed/use-feed';
import type { Post } from '@/lib/types';

export default function ProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = use(params);
  const t = useTranslations('profile');
  const me = useAuth((s) => s.user);
  const router = useRouter();
  const qc = useQueryClient();
  const [messaging, setMessaging] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['user', username],
    queryFn: () => unwrap<any>(api.get(`/users/${username}`)),
  });

  const postsQuery = useFeed('public', username);
  const posts = postsQuery.data?.pages.flatMap((p) => p.items) ?? [];

  const photos = useMemo(() => {
    const urls: { id: string; url: string; postId: string }[] = [];
    for (const post of posts) {
      for (const m of post.media ?? []) {
        if (m.type !== 'VIDEO') urls.push({ id: m.id, url: m.url, postId: post.id });
      }
    }
    return urls;
  }, [posts]);

  const followMutation = useMutation({
    mutationFn: async (following: boolean) => {
      if (following) return unwrap(api.delete(`/users/${username}/follow`));
      return unwrap(api.post(`/users/${username}/follow`));
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['user', username] });
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  async function startMessage() {
    if (!me) {
      router.push('/login');
      return;
    }
    if (!data?.id) return;
    setMessaging(true);
    try {
      const conversation = await unwrap<any>(api.post('/conversations/direct', { recipientId: data.id }));
      router.push(`/messages?c=${conversation.id}`);
    } catch (e) {
      toast.error(apiErrorMessage(e));
    } finally {
      setMessaging(false);
    }
  }

  if (isLoading) return <div className="mx-auto max-w-3xl px-4 py-6"><Skeleton className="h-64" /></div>;
  if (!data) return <div className="mx-auto max-w-3xl px-4 py-20 text-center text-muted-foreground">User not found</div>;

  const isMe = !!me && (me.id === data.id || me.username === data.username);
  const isFollowing = !!data.isFollowing;

  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 py-6">
      <Card className="overflow-hidden">
        <div className="h-40 bg-gradient-to-r from-brand-red/40 to-accent/40">
          {data.profile?.coverUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={data.profile.coverUrl} alt="" className="h-full w-full object-cover" />
          )}
        </div>
        <CardContent className="relative pt-0">
          <Avatar className="-mt-12 h-24 w-24 border-4 border-card">
            <AvatarImage src={data.profile?.avatarUrl} />
            <AvatarFallback className="text-2xl">{getInitials(data.profile?.displayName ?? data.username)}</AvatarFallback>
          </Avatar>
          <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black">{data.profile?.displayName ?? data.username}</h1>
                {data.role === 'BUSINESS' && (
                  <span title="Business" className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-accent/20 text-accent">
                    <Briefcase className="h-3.5 w-3.5" />
                  </span>
                )}
                {data.reputation?.isVerifiedMechanic && <BadgeCheck className="h-5 w-5 text-accent" />}
              </div>
              <p className="text-muted-foreground">@{data.username}</p>
            </div>
            {!isMe && me && (
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={isFollowing ? 'outline' : 'default'}
                  onClick={() => followMutation.mutate(isFollowing)}
                  disabled={followMutation.isPending}
                >
                  {followMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  {isFollowing ? t('followingBtn') : t('follow')}
                </Button>
                <Button variant="secondary" onClick={startMessage} disabled={messaging}>
                  {messaging ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}
                  {t('message')}
                </Button>
              </div>
            )}
            {!me && (
              <Button asChild>
                <Link href="/login">შესვლა</Link>
              </Button>
            )}
            {isMe && (
              <Button variant="outline" asChild>
                <Link href="/settings">პარამეტრები</Link>
              </Button>
            )}
          </div>

          {data.profile?.bio && <p className="mt-3">{data.profile.bio}</p>}

          <div className="mt-3 flex flex-wrap gap-4 text-sm text-muted-foreground">
            {data.profile?.city && <span className="flex items-center gap-1"><MapPin className="h-4 w-4" />{data.profile.city}</span>}
            {data.reputation && (
              <span className="flex items-center gap-1"><Trophy className="h-4 w-4 text-primary" />Level {data.reputation.level} · {data.reputation.xp} XP</span>
            )}
          </div>

          <div className="mt-4 flex gap-6">
            <Stat label={t('posts')} value={data._count?.posts ?? posts.length} />
            <Stat label={t('followers')} value={data._count?.followers ?? 0} />
            <Stat label={t('following')} value={data._count?.following ?? 0} />
          </div>

          {data.profile?.favoriteBrands?.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {data.profile.favoriteBrands.map((b: string) => <Badge key={b} variant="muted">{b}</Badge>)}
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="posts">
        <TabsList>
          <TabsTrigger value="posts">{t('posts')}</TabsTrigger>
          <TabsTrigger value="photos">{t('photos')}</TabsTrigger>
        </TabsList>

        <TabsContent value="posts" className="space-y-4">
          {postsQuery.isLoading ? (
            <Skeleton className="h-40" />
          ) : posts.length === 0 ? (
            <Card className="p-10 text-center text-muted-foreground">{t('noPosts')}</Card>
          ) : (
            posts.map((post: Post) => <PostCard key={post.id} post={post} />)
          )}
        </TabsContent>

        <TabsContent value="photos">
          {postsQuery.isLoading ? (
            <Skeleton className="h-40" />
          ) : photos.length === 0 ? (
            <Card className="p-10 text-center text-muted-foreground">{t('noPhotos')}</Card>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {photos.map((p) => (
                <div key={p.id} className="relative aspect-square overflow-hidden rounded-xl bg-muted">
                  <Image src={p.url} alt="" fill className="object-cover" sizes="200px" />
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-center">
      <p className="text-xl font-black">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
