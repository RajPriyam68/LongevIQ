'use client';

import * as React from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { BookOpen, MessageSquarePlus, Send, Sparkles, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { ChatMessage, ChatMessageSource, ChatSession } from '@longeviq/shared';
import { MEDICAL_DISCLAIMER } from '@longeviq/shared';
import { RequireAuth } from '@/components/auth/require-auth';
import { Button } from '@/components/ui/button';
import {
  apiDeleteChatSession,
  apiGetChatSession,
  apiListChatSessions,
  apiSendChatMessage,
} from '@/lib/assistant-api';
import { formatAssistantTime, splitIntoParagraphs } from '@/lib/assistant-format';
import { isApiClientError } from '@/lib/api-client';

const SUGGESTIONS = [
  'What does my blood pressure reading mean?',
  'How should I interpret an HbA1c result?',
  'What are good habits for better sleep?',
  'How can I plan a balanced meal?',
];

function AssistantSources({ sources }: { sources: ChatMessageSource[] }) {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="mt-3 border-t pt-2">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <BookOpen className="size-3.5" aria-hidden="true" />
        Sources ({sources.length})<span aria-hidden="true">{open ? '▾' : '▸'}</span>
      </button>
      {open ? (
        <ul className="mt-2 space-y-1.5">
          {sources.map((source) => (
            <li key={`${source.documentId}-${source.chunkIndex}`}>
              <Link
                href={`/knowledge/${source.documentId}`}
                className="block rounded-md border bg-muted/50 px-3 py-2 text-sm transition-colors hover:bg-muted"
              >
                <span className="font-medium text-foreground">{source.documentTitle}</span>
                {source.title ? (
                  <span className="text-muted-foreground"> — {source.title}</span>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'USER';
  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-4 py-2.5 text-sm text-primary-foreground">
          <p className="whitespace-pre-wrap">{message.content}</p>
        </div>
      </div>
    );
  }

  const paragraphs = splitIntoParagraphs(message.content);
  return (
    <div className="flex justify-start">
      <div
        className={`max-w-[85%] rounded-2xl rounded-bl-sm border bg-card px-4 py-3 ${
          message.isError ? 'border-destructive/50 bg-destructive/5' : ''
        }`}
      >
        <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Sparkles className="size-3.5" aria-hidden="true" />
          LongevIQ Assistant
          {message.isError ? (
            <span className="ml-1 rounded-full border border-destructive/40 px-2 py-0.5 text-[10px] text-destructive">
              Notice
            </span>
          ) : null}
          <span className="ml-auto text-[10px] tabular-nums">
            {formatAssistantTime(message.createdAt)}
          </span>
        </div>
        <div className="space-y-2 text-sm leading-relaxed">
          {paragraphs.map((paragraph, index) => (
            <p key={index} className="whitespace-pre-wrap">
              {paragraph}
            </p>
          ))}
        </div>
        {message.sources && message.sources.length > 0 ? (
          <AssistantSources sources={message.sources} />
        ) : null}
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-sm border bg-card px-4 py-3">
        <span className="flex gap-1" aria-label="Assistant is typing">
          {[0, 1, 2].map((index) => (
            <span
              key={index}
              className="size-1.5 animate-pulse rounded-full bg-muted-foreground"
              style={{ animationDelay: `${index * 150}ms` }}
            />
          ))}
        </span>
        <span className="text-xs text-muted-foreground">Thinking…</span>
      </div>
    </div>
  );
}

export default function AssistantPage() {
  const [activeSessionId, setActiveSessionId] = React.useState<string | null>(null);
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [input, setInput] = React.useState('');
  const [sending, setSending] = React.useState(false);
  const bottomRef = React.useRef<HTMLDivElement>(null);

  const sessionsQuery = useQuery({
    queryKey: ['assistant-sessions'],
    queryFn: () => apiListChatSessions(),
  });

  const sessionQuery = useQuery({
    queryKey: ['assistant-messages', activeSessionId],
    queryFn: () => apiGetChatSession(activeSessionId!),
    enabled: activeSessionId !== null,
  });

  React.useEffect(() => {
    if (sessionQuery.data) {
      setMessages(sessionQuery.data.session.messages);
    }
  }, [sessionQuery.data]);

  React.useEffect(() => {
    if (activeSessionId === null && sessionsQuery.data?.items.length) {
      setActiveSessionId(sessionsQuery.data.items[0]!.id);
    }
  }, [activeSessionId, sessionsQuery.data]);

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, sending, activeSessionId]);

  const selectSession = (session: ChatSession) => {
    setActiveSessionId(session.id);
    setMessages([]);
  };

  const startNewChat = () => {
    setActiveSessionId(null);
    setMessages([]);
    setInput('');
  };

  const handleSend = async (content?: string) => {
    const text = (content ?? input).trim();
    if (!text || sending) return;
    setInput('');
    setSending(true);

    const optimistic: ChatMessage = {
      id: `local-${Date.now()}`,
      sessionId: activeSessionId ?? '',
      role: 'USER',
      content: text,
      sources: null,
      isError: false,
      createdAt: new Date().toISOString(),
    };
    setMessages((current) => [...current, optimistic]);

    try {
      const result = await apiSendChatMessage({ sessionId: activeSessionId, message: text });
      setActiveSessionId(result.session.id);
      setMessages(result.session.messages);
      await sessionsQuery.refetch();
    } catch (error) {
      toast.error(
        isApiClientError(error)
          ? error.message
          : 'Unable to reach the assistant. Please try again.',
      );
      setMessages((current) => current.filter((item) => item.id !== optimistic.id));
    } finally {
      setSending(false);
    }
  };

  const handleDeleteSession = async (session: ChatSession) => {
    try {
      await apiDeleteChatSession(session.id);
      if (activeSessionId === session.id) {
        setActiveSessionId(null);
        setMessages([]);
      }
      await sessionsQuery.refetch();
    } catch {
      toast.error('Unable to delete the conversation.');
    }
  };

  const showWelcome = messages.length === 0 && !sending;

  return (
    <RequireAuth>
      <div className="container mx-auto flex h-[calc(100dvh-4rem)] max-w-6xl gap-4 px-4 py-4">
        <aside className="hidden w-72 shrink-0 flex-col rounded-xl border bg-card lg:flex">
          <div className="border-b p-3">
            <Button className="w-full justify-start gap-2" onClick={startNewChat}>
              <MessageSquarePlus className="size-4" aria-hidden="true" />
              New chat
            </Button>
          </div>
          <nav aria-label="Conversations" className="flex-1 overflow-y-auto p-2">
            {sessionsQuery.isLoading ? (
              <p className="px-2 py-1 text-sm text-muted-foreground">Loading conversations…</p>
            ) : sessionsQuery.data?.items.length === 0 ? (
              <p className="px-2 py-1 text-sm text-muted-foreground">No conversations yet.</p>
            ) : (
              <ul className="space-y-1">
                {sessionsQuery.data!.items.map((session) => (
                  <li key={session.id}>
                    <div
                      className={`group flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
                        activeSessionId === session.id
                          ? 'bg-primary/10 text-foreground'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      }`}
                      onClick={() => selectSession(session)}
                    >
                      <span className="flex-1 truncate">{session.title}</span>
                      <button
                        type="button"
                        aria-label={`Delete conversation ${session.title}`}
                        title="Delete conversation"
                        onClick={(event) => {
                          event.stopPropagation();
                          void handleDeleteSession(session);
                        }}
                        className="opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                      >
                        <Trash2 className="size-4 text-muted-foreground hover:text-destructive" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </nav>
        </aside>

        <section className="flex min-w-0 flex-1 flex-col rounded-xl border bg-card">
          <header className="border-b px-5 py-3">
            <div className="flex items-center gap-2">
              <span
                className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground"
                aria-hidden="true"
              >
                <Sparkles className="size-4" />
              </span>
              <div>
                <h1 className="text-base font-semibold">AI Health Assistant</h1>
                <p className="text-xs text-muted-foreground">
                  Ask about metrics, labs, nutrition, and everyday wellness.
                </p>
              </div>
            </div>
          </header>

          <div
            aria-live="polite"
            className="flex-1 space-y-4 overflow-y-auto p-5"
            aria-label="Conversation"
          >
            {showWelcome ? (
              <div className="flex h-full flex-col items-center justify-center gap-6 text-center">
                <div className="flex flex-col items-center gap-2">
                  <span
                    className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary"
                    aria-hidden="true"
                  >
                    <Sparkles className="size-6" />
                  </span>
                  <h2 className="text-lg font-semibold">How can I help you today?</h2>
                  <p className="max-w-md text-sm text-muted-foreground">
                    I answer educational wellness questions using the LongevIQ knowledge library. I
                    never diagnose or replace your doctor.
                  </p>
                </div>
                <div className="flex max-w-lg flex-wrap justify-center gap-2">
                  {SUGGESTIONS.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => void handleSend(suggestion)}
                      className="rounded-full border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {messages.map((message) => (
                  <MessageBubble key={message.id} message={message} />
                ))}
                {sending ? <TypingIndicator /> : null}
              </>
            )}
            <div ref={bottomRef} />
          </div>

          <footer className="border-t p-4">
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void handleSend();
              }}
              className="flex items-end gap-2"
            >
              <textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    void handleSend();
                  }
                }}
                rows={3}
                placeholder="Ask a health question…"
                aria-label="Message the AI health assistant"
                className="min-h-24 flex-1 resize-none rounded-lg border bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
              <Button
                type="submit"
                disabled={input.trim().length === 0 || sending}
                aria-label="Send message"
                className="gap-2"
              >
                <Send className="size-4" aria-hidden="true" />
                Send
              </Button>
            </form>
            <p className="mt-2 text-center text-[11px] text-muted-foreground">
              {MEDICAL_DISCLAIMER}
            </p>
          </footer>
        </section>
      </div>
    </RequireAuth>
  );
}
