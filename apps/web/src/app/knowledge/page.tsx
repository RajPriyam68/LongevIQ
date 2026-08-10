'use client';

import * as React from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { BookOpen, Search } from 'lucide-react';
import { KNOWLEDGE_CATEGORY_VALUES, type KnowledgeCategory } from '@longeviq/shared';
import { apiListKnowledge, apiSearchKnowledge } from '@/lib/knowledge-api';
import { knowledgeCategoryLabel, splitHighlightedSnippet } from '@/lib/knowledge-format';
import { RequireAuth } from '@/components/auth/require-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';

function HighlightedSnippet({ snippet }: { snippet: string }) {
  const segments = splitHighlightedSnippet(snippet);
  return (
    <p className="text-sm text-muted-foreground">
      {segments.map((segment, index) =>
        segment.highlighted ? (
          <mark key={index} className="bg-primary/20 text-foreground">
            {segment.text}
          </mark>
        ) : (
          <span key={index}>{segment.text}</span>
        ),
      )}
    </p>
  );
}

export default function KnowledgePage() {
  const [query, setQuery] = React.useState('');
  const [submitted, setSubmitted] = React.useState('');
  const [category, setCategory] = React.useState<KnowledgeCategory | undefined>(undefined);

  const searchEnabled = submitted.trim().length > 0;

  const searchQuery = useQuery({
    queryKey: ['knowledge-search', { q: submitted, category }],
    queryFn: () => apiSearchKnowledge({ q: submitted, limit: 20, category }),
    enabled: searchEnabled,
  });

  const browseQuery = useQuery({
    queryKey: ['knowledge', { category }],
    queryFn: () => apiListKnowledge({ limit: 50, category }),
    enabled: !searchEnabled,
  });

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitted(query.trim());
  };

  const changeCategory = (next: KnowledgeCategory | undefined) => {
    setCategory(next);
    setSubmitted('');
    setQuery('');
  };

  return (
    <RequireAuth>
      <div className="container mx-auto max-w-5xl space-y-8 px-4 py-10">
        <div className="flex items-center gap-3">
          <span
            className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground"
            aria-hidden="true"
          >
            <BookOpen className="size-5" />
          </span>
          <div>
            <h1 className="text-2xl font-semibold">Knowledge base</h1>
            <p className="text-sm text-muted-foreground">
              Search the LongevIQ health library for plain-language guidance.
            </p>
          </div>
        </div>

        <form onSubmit={onSubmit} role="search" className="flex gap-2">
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder='Try "blood pressure" or "HbA1c"…'
              className="pl-9"
              aria-label="Search the knowledge base"
            />
          </div>
          <Button type="submit" disabled={query.trim().length === 0}>
            Search
          </Button>
        </form>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => changeCategory(undefined)}
            aria-pressed={category === undefined}
            className="rounded-full border px-3 py-1 text-sm transition-colors data-[pressed=true]:border-primary data-[pressed=true]:bg-primary data-[pressed=true]:text-primary-foreground"
            data-pressed={category === undefined}
          >
            All topics
          </button>
          {KNOWLEDGE_CATEGORY_VALUES.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => changeCategory(value)}
              aria-pressed={category === value}
              data-pressed={category === value}
              className="rounded-full border border-border bg-transparent px-3 py-1 text-sm text-muted-foreground transition-colors hover:bg-muted data-[pressed=true]:border-primary data-[pressed=true]:bg-primary data-[pressed=true]:text-primary-foreground"
            >
              {knowledgeCategoryLabel(value)}
            </button>
          ))}
        </div>

        {searchEnabled ? (
          <section aria-label="Search results" className="space-y-4">
            <h2 className="text-sm font-medium text-muted-foreground">
              {searchQuery.isSuccess
                ? `${searchQuery.data.results.length} result${searchQuery.data.results.length === 1 ? '' : 's'} for "${submitted}"`
                : `Searching for "${submitted}"…`}
            </h2>
            {searchQuery.isLoading ? (
              <Skeleton className="h-48" />
            ) : searchQuery.isError ? (
              <p className="text-sm text-destructive">Unable to run the search.</p>
            ) : searchQuery.data!.results.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No matches found. Try a different term or topic.
              </p>
            ) : (
              <ul className="space-y-3">
                {searchQuery.data!.results.map((result) => (
                  <li key={result.chunkId}>
                    <Link
                      href={`/knowledge/${result.documentId}`}
                      className="block rounded-lg border bg-card p-4 transition-colors hover:bg-muted"
                    >
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <span className="text-base font-semibold">{result.documentTitle}</span>
                        <span className="rounded-full border px-2 py-0.5 text-xs text-muted-foreground">
                          {knowledgeCategoryLabel(result.category)}
                        </span>
                      </div>
                      {result.title ? (
                        <p className="mb-1 text-xs font-medium text-primary">{result.title}</p>
                      ) : null}
                      <HighlightedSnippet snippet={result.snippet} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ) : (
          <section aria-label="Knowledge library" className="space-y-4">
            <h2 className="text-sm font-medium text-muted-foreground">Browse the library</h2>
            {browseQuery.isLoading ? (
              <Skeleton className="h-48" />
            ) : browseQuery.isError ? (
              <p className="text-sm text-destructive">Unable to load the knowledge base.</p>
            ) : browseQuery.data!.items.length === 0 ? (
              <p className="text-sm text-muted-foreground">No articles yet. Check back soon.</p>
            ) : (
              <ul className="grid gap-3 sm:grid-cols-2">
                {browseQuery.data!.items.map((document) => (
                  <li key={document.id}>
                    <Link
                      href={`/knowledge/${document.id}`}
                      className="flex h-full flex-col rounded-lg border bg-card p-4 transition-colors hover:bg-muted"
                    >
                      <div className="mb-1 flex items-center gap-2">
                        <span className="text-sm font-semibold">{document.title}</span>
                      </div>
                      <span className="mb-2 rounded-full border px-2 py-0.5 text-xs text-muted-foreground self-start">
                        {knowledgeCategoryLabel(document.category)}
                      </span>
                      {document.summary ? (
                        <p className="line-clamp-2 text-sm text-muted-foreground">
                          {document.summary}
                        </p>
                      ) : null}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </div>
    </RequireAuth>
  );
}
