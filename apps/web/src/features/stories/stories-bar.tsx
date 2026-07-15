'use client';

import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, X, Loader2, ChevronLeft, ChevronRight, Trash2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { api, unwrap, apiErrorMessage, uploadFile } from '@/lib/api';
import { useAuth } from '@/lib/auth-store';
import { getInitials, timeAgo } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

interface StoryItem {
  id: string;
  mediaUrl: string;
  type?: string;
  caption?: string;
  createdAt: string;
  seen?: boolean;
}
interface StoryGroup {
  author: {
    id: string;
    username: string;
    profile?: { displayName?: string; avatarUrl?: string };
  };
  stories: StoryItem[];
}

export function StoriesBar() {
  const user = useAuth((s) => s.user);
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [viewer, setViewer] = useState<{ groupIndex: number } | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['stories'],
    queryFn: () => unwrap<StoryGroup[]>(api.get('/stories')),
    enabled: !!user,
  });

  if (!user) return null;

  const groups = data ?? [];
  const myGroupIndex = groups.findIndex((g) => g.author.id === user.id);

  return (
    <>
      <Card className="p-3">
        <div className="flex gap-3 overflow-x-auto pb-1">
          {/* Add story */}
          <button
            onClick={() => setShowCreate(true)}
            className="flex w-16 flex-shrink-0 flex-col items-center gap-1"
          >
            <div className="relative flex h-16 w-16 items-center justify-center rounded-full border-2 border-dashed border-border">
              <Avatar className="h-14 w-14">
                <AvatarImage src={user.profile?.avatarUrl} />
                <AvatarFallback>{getInitials(user.profile?.displayName ?? user.username)}</AvatarFallback>
              </Avatar>
              <span className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Plus className="h-3 w-3" />
              </span>
            </div>
            <span className="w-full truncate text-center text-xs text-muted-foreground">Your story</span>
          </button>

          {isLoading &&
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex w-16 flex-shrink-0 flex-col items-center gap-1">
                <Skeleton className="h-16 w-16 rounded-full" />
                <Skeleton className="h-3 w-12" />
              </div>
            ))}

          {groups.map((g, i) => {
            const allSeen = g.stories.every((s) => s.seen);
            const isMe = g.author.id === user.id;
            return (
              <button
                key={g.author.id}
                onClick={() => setViewer({ groupIndex: i })}
                className="flex w-16 flex-shrink-0 flex-col items-center gap-1"
              >
                <div
                  className={`rounded-full p-[2px] ${
                    allSeen
                      ? 'bg-border'
                      : 'bg-gradient-to-tr from-primary via-accent to-primary'
                  }`}
                >
                  <div className="rounded-full border-2 border-card">
                    <Avatar className="h-14 w-14">
                      <AvatarImage src={g.author.profile?.avatarUrl} />
                      <AvatarFallback>
                        {getInitials(g.author.profile?.displayName ?? g.author.username)}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                </div>
                <span className="w-full truncate text-center text-xs text-muted-foreground">
                  {isMe ? 'You' : g.author.profile?.displayName ?? g.author.username}
                </span>
              </button>
            );
          })}

          {!isLoading && groups.length === 0 && (
            <div className="flex flex-1 items-center px-2 text-sm text-muted-foreground">
              No stories yet — share the first one!
            </div>
          )}
        </div>
      </Card>

      {showCreate && (
        <CreateStoryModal
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            qc.invalidateQueries({ queryKey: ['stories'] });
          }}
        />
      )}

      {viewer && groups[viewer.groupIndex] && (
        <StoryViewer
          groups={groups}
          startIndex={viewer.groupIndex}
          currentUserId={user.id}
          onClose={() => {
            setViewer(null);
            qc.invalidateQueries({ queryKey: ['stories'] });
          }}
        />
      )}
    </>
  );
}

function CreateStoryModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaType, setMediaType] = useState<'IMAGE' | 'VIDEO'>('IMAGE');
  const [caption, setCaption] = useState('');
  const [progress, setProgress] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setProgress(0);
    try {
      const res = await uploadFile(file, setProgress);
      setMediaUrl(res.url);
      setMediaType(res.type);
      toast.success('File uploaded');
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setProgress(null);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  const create = useMutation({
    mutationFn: () =>
      unwrap(
        api.post('/stories', {
          mediaUrl: mediaUrl.trim(),
          type: mediaType,
          caption: caption.trim() || undefined,
        }),
      ),
    onSuccess: () => {
      toast.success('Story shared!');
      onCreated();
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const uploading = progress !== null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <Card className="w-full max-w-md p-5" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">Add to your story</h2>
          <button onClick={onClose} className="rounded-full p-1 hover:bg-secondary">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-3">
          <input
            ref={fileRef}
            type="file"
            accept="image/*,video/*"
            className="hidden"
            onChange={onPickFile}
          />
          <Button
            type="button"
            variant="secondary"
            className="w-full"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Uploading… {progress}%
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" /> Upload from your device
              </>
            )}
          </Button>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" /> or paste a link <span className="h-px flex-1 bg-border" />
          </div>

          <Input
            value={mediaUrl}
            onChange={(e) => setMediaUrl(e.target.value)}
            placeholder="https://..."
          />

          {mediaUrl.trim() &&
            (mediaType === 'VIDEO' ? (
              <video src={mediaUrl} controls className="max-h-64 w-full rounded-lg" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={mediaUrl}
                alt="preview"
                className="max-h-64 w-full rounded-lg object-cover"
                onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')}
              />
            ))}

          <div>
            <label className="mb-1 block text-sm font-medium">Caption</label>
            <Input value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Say something..." />
          </div>
          <Button
            className="w-full"
            onClick={() => create.mutate()}
            disabled={!mediaUrl.trim() || create.isPending || uploading}
          >
            {create.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Share story
          </Button>
        </div>
      </Card>
    </div>
  );
}

function StoryViewer({
  groups,
  startIndex,
  currentUserId,
  onClose,
}: {
  groups: StoryGroup[];
  startIndex: number;
  currentUserId: string;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [gi, setGi] = useState(startIndex);
  const [si, setSi] = useState(0);

  const group = groups[gi];
  const story = group?.stories[si];

  const markViewed = useMutation({
    mutationFn: (id: string) => unwrap(api.post(`/stories/${id}/view`)),
  });
  const removeStory = useMutation({
    mutationFn: (id: string) => unwrap(api.delete(`/stories/${id}`)),
    onSuccess: () => {
      toast.success('Story deleted');
      qc.invalidateQueries({ queryKey: ['stories'] });
      onClose();
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  // Mark the current story as viewed when shown.
  useEffect(() => {
    if (story && !story.seen && group.author.id !== currentUserId) {
      markViewed.mutate(story.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [story?.id]);

  if (!story) return null;

  const next = () => {
    if (si < group.stories.length - 1) setSi(si + 1);
    else if (gi < groups.length - 1) {
      setGi(gi + 1);
      setSi(0);
    } else onClose();
  };
  const prev = () => {
    if (si > 0) setSi(si - 1);
    else if (gi > 0) {
      setGi(gi - 1);
      setSi(groups[gi - 1].stories.length - 1);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90">
      {/* progress bars */}
      <div className="absolute left-1/2 top-3 flex w-full max-w-sm -translate-x-1/2 gap-1 px-4">
        {group.stories.map((s, idx) => (
          <div key={s.id} className="h-1 flex-1 overflow-hidden rounded-full bg-white/30">
            <div className={`h-full bg-white ${idx < si ? 'w-full' : idx === si ? 'w-full' : 'w-0'}`} />
          </div>
        ))}
      </div>

      {/* header */}
      <div className="absolute left-1/2 top-7 flex w-full max-w-sm -translate-x-1/2 items-center gap-2 px-4 text-white">
        <Avatar className="h-8 w-8">
          <AvatarImage src={group.author.profile?.avatarUrl} />
          <AvatarFallback>{getInitials(group.author.profile?.displayName ?? group.author.username)}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <p className="text-sm font-semibold">{group.author.profile?.displayName ?? group.author.username}</p>
          <p className="text-xs text-white/70">{timeAgo(story.createdAt)}</p>
        </div>
        {group.author.id === currentUserId && (
          <button onClick={() => removeStory.mutate(story.id)} className="rounded-full p-2 hover:bg-white/10">
            <Trash2 className="h-5 w-5" />
          </button>
        )}
        <button onClick={onClose} className="rounded-full p-2 hover:bg-white/10">
          <X className="h-6 w-6" />
        </button>
      </div>

      {/* media */}
      <div className="relative flex h-full max-h-[85vh] w-full max-w-sm items-center justify-center px-4">
        {story.type === 'VIDEO' ? (
          <video src={story.mediaUrl} className="max-h-full w-full rounded-lg object-contain" autoPlay controls />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={story.mediaUrl} alt="story" className="max-h-full w-full rounded-lg object-contain" />
        )}
        {story.caption && (
          <div className="absolute bottom-6 left-1/2 w-[90%] -translate-x-1/2 rounded-lg bg-black/50 p-3 text-center text-white">
            {story.caption}
          </div>
        )}

        {/* tap zones */}
        <button onClick={prev} className="absolute left-0 top-0 h-full w-1/3" aria-label="Previous" />
        <button onClick={next} className="absolute right-0 top-0 h-full w-2/3" aria-label="Next" />
      </div>

      {/* desktop arrows */}
      <button onClick={prev} className="absolute left-4 hidden rounded-full bg-white/10 p-2 text-white hover:bg-white/20 sm:block">
        <ChevronLeft className="h-6 w-6" />
      </button>
      <button onClick={next} className="absolute right-4 hidden rounded-full bg-white/10 p-2 text-white hover:bg-white/20 sm:block">
        <ChevronRight className="h-6 w-6" />
      </button>
    </div>
  );
}
