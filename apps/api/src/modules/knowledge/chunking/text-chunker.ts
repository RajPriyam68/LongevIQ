export interface TextChunk {
  index: number;
  title: string | null;
  content: string;
}

export interface ChunkOptions {
  /** Upper bound on chunk length in characters (paragraph boundary preferred). */
  maxChunkChars?: number;
  /** Number of trailing characters carried over when a single paragraph is hard-split. */
  overlapChars?: number;
}

const HEADING = /^(#{1,6})\s+(.+)$/;

function cleanHeading(raw: string): string {
  return raw.replace(/[*_`]/g, '').trim();
}

interface Paragraph {
  title: string | null;
  text: string;
}

function splitParagraphs(markdown: string): Paragraph[] {
  const paragraphs: Paragraph[] = [];
  let current: string[] = [];
  let lastTitle: string | null = null;

  const flush = (): void => {
    if (current.length === 0) return;
    paragraphs.push({ title: lastTitle, text: current.join(' ') });
    current = [];
  };

  for (const rawLine of markdown.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) {
      flush();
      continue;
    }
    const heading = HEADING.exec(line);
    if (heading) {
      flush();
      lastTitle = cleanHeading(heading[2]!);
      continue;
    }
    current.push(line);
  }
  flush();
  return paragraphs;
}

function splitSentences(text: string): string[] {
  const matches = text.replace(/\s+/g, ' ').match(/[^.!?]+[.!?]+|[^.!?]+$/g);
  return matches?.map((sentence) => sentence.trim()).filter(Boolean) ?? [];
}

function pushHardSplit(
  paragraph: Paragraph,
  chunks: Array<{ title: string | null; content: string }>,
  maxChunkChars: number,
  overlapChars: number,
): void {
  const sentences = splitSentences(paragraph.text);
  let acc: string[] = [];
  let accChars = 0;

  for (const sentence of sentences) {
    if (acc.length > 0 && accChars + sentence.length > maxChunkChars) {
      chunks.push({ title: paragraph.title, content: acc.join(' ') });
      const tail: string[] = [];
      let tailChars = 0;
      for (let i = acc.length - 1; i >= 0 && tailChars + acc[i]!.length <= overlapChars; i -= 1) {
        tail.unshift(acc[i]!);
        tailChars += acc[i]!.length;
      }
      acc = tail;
      accChars = tailChars;
    }
    acc.push(sentence);
    accChars += sentence.length;
  }
  if (acc.length > 0) {
    chunks.push({ title: paragraph.title, content: acc.join(' ') });
  }
}

/**
 * Splits markdown into retrieval-friendly chunks. Chunks never cut mid-paragraph
 * (oversized paragraphs are hard-split at sentence boundaries with overlap), and
 * chunk boundaries are drawn at section headings so each chunk carries the title
 * of the section it belongs to.
 */
export function chunkMarkdown(markdown: string, options: ChunkOptions = {}): TextChunk[] {
  const maxChunkChars = options.maxChunkChars ?? 1200;
  const overlapChars = options.overlapChars ?? 150;
  const paragraphs = splitParagraphs(markdown);
  const chunks: Array<{ title: string | null; content: string }> = [];

  let buffer: string[] = [];
  let bufferChars = 0;
  let bufferTitle: string | null = null;

  const flush = (): void => {
    if (buffer.length === 0) return;
    chunks.push({ title: bufferTitle, content: buffer.join('\n\n') });
    buffer = [];
    bufferChars = 0;
    bufferTitle = null;
  };

  for (const paragraph of paragraphs) {
    if (buffer.length > 0 && paragraph.title !== bufferTitle) {
      flush();
    }
    if (buffer.length === 0) {
      if (paragraph.text.length <= maxChunkChars) {
        buffer = [paragraph.text];
        bufferChars = paragraph.text.length;
        bufferTitle = paragraph.title;
      } else {
        pushHardSplit(paragraph, chunks, maxChunkChars, overlapChars);
      }
      continue;
    }
    const candidateChars = bufferChars + 2 + paragraph.text.length;
    if (candidateChars <= maxChunkChars) {
      buffer.push(paragraph.text);
      bufferChars = candidateChars;
      continue;
    }
    flush();
    if (paragraph.text.length <= maxChunkChars) {
      buffer = [paragraph.text];
      bufferChars = paragraph.text.length;
      bufferTitle = paragraph.title;
    } else {
      pushHardSplit(paragraph, chunks, maxChunkChars, overlapChars);
    }
  }
  flush();

  return chunks.map((chunk, index) => ({ ...chunk, index }));
}
