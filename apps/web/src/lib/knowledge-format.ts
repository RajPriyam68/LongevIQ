import {
  KNOWLEDGE_CATEGORY_LABELS,
  KNOWLEDGE_STATUS_LABELS,
  type KnowledgeCategory,
  type KnowledgeStatus,
} from '@longeviq/shared';

export function knowledgeCategoryLabel(category: KnowledgeCategory): string {
  return KNOWLEDGE_CATEGORY_LABELS[category];
}

export function knowledgeStatusLabel(status: KnowledgeStatus): string {
  return KNOWLEDGE_STATUS_LABELS[status];
}

export interface SnippetSegment {
  text: string;
  highlighted: boolean;
}

/**
 * Splits a Postgres ts_headline snippet on its <mark> highlight markers so the
 * page can render matches with React elements instead of innerHTML.
 */
export function splitHighlightedSnippet(snippet: string): SnippetSegment[] {
  const segments: SnippetSegment[] = [];
  const pattern = /<mark>(.*?)<\/mark>/gs;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(snippet)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ text: snippet.slice(lastIndex, match.index), highlighted: false });
    }
    segments.push({ text: match[1]!, highlighted: true });
    lastIndex = pattern.lastIndex;
  }
  if (lastIndex < snippet.length) {
    segments.push({ text: snippet.slice(lastIndex), highlighted: false });
  }
  return segments;
}
