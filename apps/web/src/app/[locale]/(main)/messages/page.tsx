'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MessageCircle, Send, Loader2, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { api, unwrap, apiErrorMessage } from '@/lib/api';
import { getInitials, timeAgo } from '@/lib/utils';
import { useAuth } from '@/lib/auth-store';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Link } from '@/i18n/navigation';

function useConversationIdFromUrl() {
  const [id, setId] = useState<string | null>(null);
  useEffect(() => {
    const read = () => {
      const params = new URLSearchParams(window.location.search);
      setId(params.get('c'));
    };
    read();
    window.addEventListener('popstate', read);
    return () => window.removeEventListener('popstate', read);
  }, []);
  return [id, (next: string | null) => {
    const url = new URL(window.location.href);
    if (next) url.searchParams.set('c', next);
    else url.searchParams.delete('c');
    window.history.pushState({}, '', url.toString());
    setId(next);
  }] as const;
}

export default function MessagesPage() {
  const user = useAuth((s) => s.user);
  const qc = useQueryClient();
  const [activeId, setActiveId] = useConversationIdFromUrl();
  const [text, setText] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: conversations, isLoading } = useQuery({
    queryKey: ['conversations'],
    queryFn: () => unwrap<any[]>(api.get('/conversations')),
    enabled: !!user,
  });

  const activeConversation = useMemo(
    () => conversations?.find((c) => c.id === activeId) ?? null,
    [conversations, activeId],
  );

  const otherUser = useMemo(() => {
    if (!activeConversation || !user) return null;
    return activeConversation.members?.find((m: any) => m.user?.id !== user.id)?.user ?? null;
  }, [activeConversation, user]);

  const { data: messagesData, isLoading: messagesLoading } = useQuery({
    queryKey: ['messages', activeId],
    queryFn: () => unwrap<{ items: any[] }>(api.get(`/conversations/${activeId}/messages`, { params: { limit: 100 } })),
    enabled: !!user && !!activeId,
    refetchInterval: activeId ? 4000 : false,
  });

  const messages = messagesData?.items ?? [];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, activeId]);

  const send = useMutation({
    mutationFn: (content: string) =>
      unwrap(api.post(`/conversations/${activeId}/messages`, { content, type: 'TEXT' })),
    onSuccess: () => {
      setText('');
      qc.invalidateQueries({ queryKey: ['messages', activeId] });
      qc.invalidateQueries({ queryKey: ['conversations'] });
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  if (!user) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center text-muted-foreground">
        <p>Log in to see your messages.</p>
        <Button className="mt-4" asChild><Link href="/login">Log in</Link></Button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-5rem)] max-w-5xl gap-0 px-2 py-4 md:px-4">
      {/* Conversation list */}
      <Card className={`w-full overflow-hidden md:w-80 md:shrink-0 ${activeId ? 'hidden md:flex md:flex-col' : 'flex flex-col'}`}>
        <div className="border-b border-border px-4 py-3">
          <h1 className="text-xl font-black">Messages</h1>
        </div>
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="space-y-2 p-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16" />)}</div>
          ) : conversations && conversations.length > 0 ? (
            conversations.map((c) => {
              const other = c.members?.find((m: any) => m.user?.id !== user.id)?.user;
              const last = c.messages?.[0];
              const selected = c.id === activeId;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setActiveId(c.id)}
                  className={`flex w-full items-center gap-3 border-b border-border p-3 text-left transition-colors hover:bg-secondary ${selected ? 'bg-secondary' : ''}`}
                >
                  <Avatar>
                    <AvatarImage src={other?.profile?.avatarUrl} />
                    <AvatarFallback>{getInitials(other?.profile?.displayName ?? other?.username ?? c.title)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{c.title ?? other?.profile?.displayName ?? other?.username}</p>
                    <p className="truncate text-sm text-muted-foreground">{last?.content ?? 'No messages yet'}</p>
                  </div>
                  {last && <span className="text-xs text-muted-foreground">{timeAgo(last.createdAt)}</span>}
                </button>
              );
            })
          ) : (
            <div className="p-10 text-center text-muted-foreground">
              <MessageCircle className="mx-auto mb-3 h-10 w-10" /> No conversations yet
            </div>
          )}
        </div>
      </Card>

      {/* Chat pane */}
      <Card className={`ml-0 flex flex-1 flex-col overflow-hidden md:ml-3 ${activeId ? 'flex' : 'hidden md:flex'}`}>
        {!activeId ? (
          <div className="flex flex-1 flex-col items-center justify-center text-muted-foreground">
            <MessageCircle className="mb-3 h-12 w-12" />
            <p>Select a conversation</p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 border-b border-border px-3 py-3">
              <button type="button" className="rounded-full p-2 hover:bg-secondary md:hidden" onClick={() => setActiveId(null)}>
                <ArrowLeft className="h-5 w-5" />
              </button>
              {otherUser ? (
                <Link href={`/u/${otherUser.username}`} className="flex items-center gap-3">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={otherUser.profile?.avatarUrl} />
                    <AvatarFallback>{getInitials(otherUser.profile?.displayName ?? otherUser.username)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold">{otherUser.profile?.displayName ?? otherUser.username}</p>
                    <p className="text-xs text-muted-foreground">@{otherUser.username}</p>
                  </div>
                </Link>
              ) : (
                <p className="font-semibold">Chat</p>
              )}
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              {messagesLoading ? (
                <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-2/3" />)}</div>
              ) : messages.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">No messages yet — say hi!</p>
              ) : (
                messages.map((m) => {
                  const mine = m.senderId === user.id || m.sender?.id === user.id;
                  return (
                    <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${
                          mine ? 'bg-primary text-primary-foreground' : 'bg-secondary'
                        }`}
                      >
                        {m.content && <p className="whitespace-pre-wrap">{m.content}</p>}
                        <p className={`mt-1 text-[10px] ${mine ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                          {timeAgo(m.createdAt)}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={bottomRef} />
            </div>

            <form
              className="flex items-center gap-2 border-t border-border p-3"
              onSubmit={(e) => {
                e.preventDefault();
                if (!text.trim() || send.isPending) return;
                send.mutate(text.trim());
              }}
            >
              <Input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Write a message..."
                className="flex-1"
                autoFocus
              />
              <Button type="submit" size="icon" disabled={!text.trim() || send.isPending}>
                {send.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </form>
          </>
        )}
      </Card>
    </div>
  );
}
