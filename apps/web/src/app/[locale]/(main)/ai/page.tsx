'use client';

import { useState, useRef, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Bot, Send, Loader2, User as UserIcon } from 'lucide-react';
import { api, unwrap } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const suggestions = [
  'Why is my check engine light on?',
  'Best engine oil for my car?',
  'Recommended winter tires?',
  'How much is a timing belt replacement?',
];

export default function AiPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [conversationId, setConversationId] = useState<string>();
  const scrollRef = useRef<HTMLDivElement>(null);

  const ask = useMutation({
    mutationFn: (message: string) =>
      unwrap<{ conversationId: string; message: { content: string } }>(
        api.post('/ai/ask', { message, conversationId }),
      ),
    onSuccess: (res) => {
      setConversationId(res.conversationId);
      setMessages((m) => [...m, { role: 'assistant', content: res.message.content }]);
    },
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, ask.isPending]);

  const send = (text: string) => {
    if (!text.trim()) return;
    setMessages((m) => [...m, { role: 'user', content: text }]);
    setInput('');
    ask.mutate(text);
  };

  return (
    <div className="mx-auto flex h-[calc(100vh-4rem)] max-w-3xl flex-col px-4 py-6">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary glow-red">
          <Bot className="h-6 w-6 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-xl font-black">CarGuy AI Mechanic</h1>
          <p className="text-sm text-muted-foreground">Diagnose issues, estimate costs, get advice</p>
        </div>
      </div>

      <Card ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto scrollbar-thin p-4">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
            <Bot className="h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">Ask me anything about your car.</p>
            <div className="flex flex-wrap justify-center gap-2">
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="rounded-full border border-border px-3 py-1.5 text-sm hover:bg-secondary"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={cn('flex gap-3', m.role === 'user' && 'flex-row-reverse')}>
            <div
              className={cn(
                'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
                m.role === 'user' ? 'bg-accent' : 'bg-primary',
              )}
            >
              {m.role === 'user' ? <UserIcon className="h-4 w-4 text-white" /> : <Bot className="h-4 w-4 text-white" />}
            </div>
            <div
              className={cn(
                'max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm',
                m.role === 'user' ? 'bg-accent text-accent-foreground' : 'bg-secondary',
              )}
            >
              {m.content}
            </div>
          </div>
        ))}
        {ask.isPending && (
          <div className="flex gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary">
              <Bot className="h-4 w-4 text-white" />
            </div>
            <div className="rounded-2xl bg-secondary px-4 py-3">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          </div>
        )}
      </Card>

      <form
        className="mt-4 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
      >
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Describe the symptom, make & model..."
          className="rounded-full"
        />
        <Button type="submit" size="icon" className="rounded-full" disabled={ask.isPending}>
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
