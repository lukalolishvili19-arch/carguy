'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import { Heart, MessageCircle, Share2, Bookmark, MoreHorizontal, MapPin, BadgeCheck, Briefcase, Image as ImageIcon, Loader2, Send, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import type { Comment, Post } from '@/lib/types';
import { cn, formatNumber, getInitials, timeAgo } from '@/lib/utils';
import { apiErrorMessage, uploadFile } from '@/lib/api';
import { useAuth } from '@/lib/auth-store';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { useToggleBookmark, useToggleLike, useComments, useAddComment } from './use-feed';

export function PostCard({ post }: { post: Post }) {
  const [liked, setLiked] = useState(!!post.likedByMe);
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const [bookmarked, setBookmarked] = useState(!!post.bookmarkedByMe);
  const [showComments, setShowComments] = useState(false);
  const [commentCount, setCommentCount] = useState(post.commentCount);
  const likeMutation = useToggleLike();
  const bookmarkMutation = useToggleBookmark();

  const onLike = () => {
    setLiked((v) => !v);
    setLikeCount((c) => (liked ? c - 1 : c + 1));
    likeMutation.mutate(post.id);
  };
  const onBookmark = () => {
    setBookmarked((v) => !v);
    bookmarkMutation.mutate(post.id);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="overflow-hidden">
        <div className="flex items-center gap-3 p-4">
          <Link href={`/u/${post.author.username}`} className="shrink-0">
            <Avatar className="h-11 w-11 border border-border">
              <AvatarImage src={post.author.profile?.avatarUrl} alt={post.author.username} />
              <AvatarFallback>{getInitials(post.author.profile?.displayName ?? post.author.username)}</AvatarFallback>
            </Avatar>
          </Link>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <Link href={`/u/${post.author.username}`} className="truncate font-semibold hover:underline">
                {post.author.profile?.displayName ?? post.author.username}
              </Link>
              {post.author.reputation?.isVerifiedMechanic && (
                <BadgeCheck className="h-4 w-4 text-accent" />
              )}
              {post.author.role === 'BUSINESS' && (
                <span title="Business account" className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-accent/20 text-accent">
                  <Briefcase className="h-3 w-3" />
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Link href={`/u/${post.author.username}`} className="hover:underline">@{post.author.username}</Link>
              <span>·</span>
              <span>{timeAgo(post.createdAt)}</span>
              {post.location && (
                <span className="flex items-center gap-0.5">
                  <MapPin className="h-3 w-3" /> {post.location}
                </span>
              )}
            </div>
          </div>
          <button className="rounded-full p-2 text-muted-foreground hover:bg-secondary">
            <MoreHorizontal className="h-5 w-5" />
          </button>
        </div>

        {post.content && <p className="whitespace-pre-wrap px-4 pb-3 text-[15px] leading-relaxed">{post.content}</p>}

        {post.media?.length > 0 && (
          <div className={cn('grid gap-0.5', post.media.length > 1 ? 'grid-cols-2' : 'grid-cols-1')}>
            {post.media.slice(0, 4).map((m) => (
              <div key={m.id} className="relative aspect-[4/3] bg-muted">
                {m.type === 'VIDEO' ? (
                  <video src={m.url} controls className="h-full w-full object-cover" />
                ) : (
                  <Image src={m.url} alt="" fill className="object-cover" sizes="(max-width:768px) 100vw, 600px" />
                )}
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center gap-1 p-2">
          <ActionButton active={liked} onClick={onLike} icon={<Heart className={cn('h-5 w-5', liked && 'fill-primary text-primary')} />} label={formatNumber(likeCount)} />
          <ActionButton active={showComments} onClick={() => setShowComments((v) => !v)} icon={<MessageCircle className="h-5 w-5" />} label={formatNumber(commentCount)} />
          <ActionButton icon={<Share2 className="h-5 w-5" />} label={formatNumber(post.shareCount)} />
          <div className="flex-1" />
          <ActionButton active={bookmarked} onClick={onBookmark} icon={<Bookmark className={cn('h-5 w-5', bookmarked && 'fill-accent text-accent')} />} />
        </div>

        {showComments && (
          <CommentsSection postId={post.id} onAdded={() => setCommentCount((c) => c + 1)} />
        )}
      </Card>
    </motion.div>
  );
}

function CommentsSection({ postId, onAdded }: { postId: string; onAdded: () => void }) {
  const user = useAuth((s) => s.user);
  const { data, isLoading } = useComments(postId, true);
  const addComment = useAddComment(postId);
  const [text, setText] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const res = await uploadFile(file);
      setImage(res.url);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function submit() {
    if (!text.trim() && !image) return;
    try {
      await addComment.mutateAsync({ content: text.trim() || undefined, imageUrl: image ?? undefined });
      setText('');
      setImage(null);
      onAdded();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  }

  const comments = data?.items ?? [];

  return (
    <div className="border-t border-border p-4">
      {user && (
        <div className="mb-4 flex gap-2">
          <Avatar className="h-9 w-9 border border-border">
            <AvatarImage src={user.profile?.avatarUrl} />
            <AvatarFallback>{getInitials(user.profile?.displayName ?? user.username)}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Write a comment..."
              className="min-h-[40px] resize-none"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  submit();
                }
              }}
            />
            {image && (
              <div className="relative mt-2 inline-block">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image} alt="" className="max-h-40 rounded-lg border border-border" />
                <button
                  onClick={() => setImage(null)}
                  className="absolute right-1 top-1 rounded-full bg-black/60 p-0.5 text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
            <div className="mt-2 flex items-center justify-between">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="rounded-full p-2 text-muted-foreground hover:bg-secondary hover:text-accent"
              >
                {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImageIcon className="h-5 w-5" />}
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPickFile} />
              <Button size="sm" onClick={submit} disabled={(!text.trim() && !image) || addComment.isPending || uploading}>
                {addComment.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Send
              </Button>
            </div>
          </div>
        </div>
      )}

      {isLoading ? (
        <p className="py-4 text-center text-sm text-muted-foreground">Loading...</p>
      ) : comments.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground">No comments yet</p>
      ) : (
        <div className="space-y-4">
          {comments.map((c) => (
            <CommentItem key={c.id} comment={c} />
          ))}
        </div>
      )}
    </div>
  );
}

function CommentItem({ comment }: { comment: Comment }) {
  return (
    <div className="flex gap-2">
      <Link href={`/u/${comment.author.username}`} className="shrink-0">
        <Avatar className="h-9 w-9 border border-border">
          <AvatarImage src={comment.author.profile?.avatarUrl} />
          <AvatarFallback>{getInitials(comment.author.profile?.displayName ?? comment.author.username)}</AvatarFallback>
        </Avatar>
      </Link>
      <div className="flex-1">
        <div className="rounded-2xl bg-secondary px-3 py-2">
          <div className="flex items-center gap-2">
            <Link href={`/u/${comment.author.username}`} className="text-sm font-semibold hover:underline">
              {comment.author.profile?.displayName ?? comment.author.username}
            </Link>
            <span className="text-xs text-muted-foreground">{timeAgo(comment.createdAt)}</span>
          </div>
          {comment.content && <p className="whitespace-pre-wrap text-sm">{comment.content}</p>}
          {comment.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={comment.imageUrl} alt="" className="mt-2 max-h-60 rounded-lg" />
          )}
        </div>
      </div>
    </div>
  );
}

function ActionButton({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label?: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary',
        active && 'text-foreground',
      )}
    >
      {icon}
      {label && <span>{label}</span>}
    </button>
  );
}
