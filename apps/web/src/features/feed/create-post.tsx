'use client';

import { useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Image as ImageIcon, MapPin, BarChart3, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth-store';
import { getInitials } from '@/lib/utils';
import { apiErrorMessage, uploadFile } from '@/lib/api';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useCreatePost } from './use-feed';

export function CreatePost() {
  const t = useTranslations('feed');
  const ta = useTranslations('actions');
  const user = useAuth((s) => s.user);
  const [content, setContent] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const createPost = useCreatePost();

  if (!user) return null;

  async function onPickFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setUploading(true);
    try {
      for (const file of files) {
        const res = await uploadFile(file);
        setImages((prev) => [...prev, res.url]);
      }
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  const submit = async () => {
    if (!content.trim() && !images.length) return;
    try {
      const hashtags = content.match(/#\w+/g)?.map((h) => h.slice(1)) ?? [];
      await createPost.mutateAsync({
        content,
        hashtags,
        type: 'PHOTO',
        media: images.map((url) => ({ url, type: 'IMAGE' })),
      });
      setContent('');
      setImages([]);
      toast.success(t('posted'));
    } catch (e) {
      toast.error(apiErrorMessage(e));
    }
  };

  return (
    <Card className="p-4">
      <div className="flex gap-3">
        <Avatar className="h-11 w-11 border border-border">
          <AvatarImage src={user.profile?.avatarUrl} />
          <AvatarFallback>{getInitials(user.profile?.displayName ?? user.username)}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={t('whatsOnYourMind')}
            className="min-h-[70px] resize-none border-0 bg-transparent px-0 text-base focus-visible:ring-0"
          />

          {images.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-2">
              {images.map((url, i) => (
                <div key={i} className="relative h-24 w-24 overflow-hidden rounded-lg border border-border">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className="h-full w-full object-cover" />
                  <button
                    onClick={() => setImages((prev) => prev.filter((_, idx) => idx !== i))}
                    className="absolute right-0.5 top-0.5 rounded-full bg-black/60 p-0.5 text-white"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={onPickFiles}
          />

          <div className="mt-2 flex items-center justify-between">
            <div className="flex gap-1 text-muted-foreground">
              <button
                type="button"
                title={t('addPhoto')}
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="rounded-full p-2 hover:bg-secondary hover:text-accent"
              >
                {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImageIcon className="h-5 w-5" />}
              </button>
              <button className="rounded-full p-2 hover:bg-secondary hover:text-accent"><MapPin className="h-5 w-5" /></button>
              <button className="rounded-full p-2 hover:bg-secondary hover:text-accent"><BarChart3 className="h-5 w-5" /></button>
            </div>
            <Button
              onClick={submit}
              disabled={(!content.trim() && !images.length) || createPost.isPending || uploading}
              size="sm"
            >
              {createPost.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {ta('post')}
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
