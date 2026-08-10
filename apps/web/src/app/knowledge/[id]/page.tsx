'use client';

import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { ArrowLeft, BookOpen } from 'lucide-react';
import { apiGetKnowledgeDocument } from '@/lib/knowledge-api';
import { knowledgeCategoryLabel } from '@/lib/knowledge-format';
import { RequireAuth } from '@/components/auth/require-auth';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

export default function KnowledgeDocumentPage() {
  const params = useParams<{ id: string }>();
  const documentId = params.id;

  const documentQuery = useQuery({
    queryKey: ['knowledge', documentId],
    queryFn: () => apiGetKnowledgeDocument(documentId),
  });

  const document = documentQuery.data?.document;

  return (
    <RequireAuth>
      <div className="container mx-auto max-w-3xl space-y-6 px-4 py-10">
        <div className="flex items-center justify-between gap-3">
          <Button asChild variant="ghost" size="sm" className="gap-1 text-muted-foreground">
            <a href="/knowledge">
              <ArrowLeft className="size-4" aria-hidden="true" />
              Back to knowledge base
            </a>
          </Button>
          <BookOpen className="size-5 text-muted-foreground" aria-hidden="true" />
        </div>

        {documentQuery.isLoading ? (
          <Skeleton className="h-64" />
        ) : documentQuery.isError || !document ? (
          <p className="text-sm text-destructive">Unable to load this article.</p>
        ) : (
          <>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-semibold">{document.title}</h1>
                <span className="rounded-full border px-2 py-0.5 text-xs text-muted-foreground">
                  {knowledgeCategoryLabel(document.category)}
                </span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {document.source ? `${document.source} · ` : ''}Updated{' '}
                {new Date(document.updatedAt).toLocaleDateString(undefined, {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
              {document.summary ? (
                <p className="mt-4 text-base leading-relaxed text-muted-foreground">
                  {document.summary}
                </p>
              ) : null}
            </div>

            <article className="space-y-6">
              {document.chunks.map((chunk) => (
                <section key={chunk.id}>
                  {chunk.title ? (
                    <h2 className="mb-2 text-lg font-semibold">{chunk.title}</h2>
                  ) : null}
                  <p className="leading-relaxed text-foreground">{chunk.content}</p>
                </section>
              ))}
            </article>

            <footer className="border-t pt-4">
              <p className="text-xs text-muted-foreground">
                Educational content for general information only. It is not a substitute for
                professional medical advice, diagnosis, or treatment.
              </p>
            </footer>
          </>
        )}
      </div>
    </RequireAuth>
  );
}
