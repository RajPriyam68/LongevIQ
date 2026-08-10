import { describe, expect, it } from 'vitest';
import { chunkMarkdown } from '../src/modules/knowledge/chunking/text-chunker.js';

describe('chunkMarkdown', () => {
  it('returns an empty list for empty input', () => {
    expect(chunkMarkdown('')).toEqual([]);
    expect(chunkMarkdown('\n  \n')).toEqual([]);
  });

  it('creates one chunk per section and assigns section titles', () => {
    const markdown = [
      '# Article',
      '',
      'Intro paragraph for the whole article.',
      '',
      '## First section',
      '',
      'Body of the first section.',
      '',
      '## Second section',
      '',
      'Body of the second section.',
      '',
    ].join('\n');

    const chunks = chunkMarkdown(markdown);
    expect(chunks).toHaveLength(3);
    expect(chunks[0]!.title).toBe('Article');
    expect(chunks[0]!.content).toContain('Intro paragraph');
    expect(chunks[1]!.title).toBe('First section');
    expect(chunks[1]!.content).toContain('Body of the first section');
    expect(chunks[2]!.title).toBe('Second section');
  });

  it('assigns sequential chunk indexes', () => {
    const chunks = chunkMarkdown('## A\n\none\n\n## B\n\ntwo\n\n## C\n\nthree');
    expect(chunks.map((c) => c.index)).toEqual([0, 1, 2]);
  });

  it('groups short paragraphs into a single chunk', () => {
    const markdown = Array.from(
      { length: 5 },
      (_, i) => `Paragraph ${i + 1} of a short document.`,
    ).join('\n\n');
    const chunks = chunkMarkdown(markdown, { maxChunkChars: 1200 });
    expect(chunks).toHaveLength(1);
  });

  it('breaks chunks at paragraph boundaries before exceeding the cap', () => {
    const paragraph = 'word '.repeat(200);
    const markdown = Array.from({ length: 6 }, (_, i) => `## Section ${i}\n\n${paragraph}`).join(
      '\n\n',
    );
    const chunks = chunkMarkdown(markdown, { maxChunkChars: 600 });
    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) {
      expect(chunk.content.length).toBeLessThanOrEqual(1600);
    }
  });

  it('hard-splits an oversized paragraph at sentence boundaries', () => {
    const sentences = Array.from(
      { length: 12 },
      (_, i) => `This is sentence number ${i + 1} of the oversized paragraph.`,
    ).join(' ');
    const chunks = chunkMarkdown(`## Big section\n\n${sentences}`, { maxChunkChars: 200 });
    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) {
      expect(chunk.title).toBe('Big section');
      expect(chunk.content.length).toBeLessThanOrEqual(400);
    }
    const joined = chunks.map((c) => c.content).join(' ');
    expect(joined).toContain('sentence number 12');
  });

  it('strips markdown markers from chunk titles', () => {
    const chunks = chunkMarkdown('## **Bold** and `code` title\n\ncontent');
    expect(chunks[0]!.title).toBe('Bold and code title');
  });
});
