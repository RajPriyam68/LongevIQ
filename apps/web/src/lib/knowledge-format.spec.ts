import { describe, expect, it } from 'vitest';
import { splitHighlightedSnippet } from './knowledge-format';

describe('splitHighlightedSnippet', () => {
  it('returns plain text when there are no markers', () => {
    expect(splitHighlightedSnippet('A normal fasting glucose is below 100 mg/dL.')).toEqual([
      { text: 'A normal fasting glucose is below 100 mg/dL.', highlighted: false },
    ]);
  });

  it('splits a single highlighted match', () => {
    expect(splitHighlightedSnippet('a <mark>prediabetes</mark> value')).toEqual([
      { text: 'a ', highlighted: false },
      { text: 'prediabetes', highlighted: true },
      { text: ' value', highlighted: false },
    ]);
  });

  it('handles multiple matches', () => {
    expect(splitHighlightedSnippet('<mark>A</mark> and <mark>B</mark> here')).toEqual([
      { text: 'A', highlighted: true },
      { text: ' and ', highlighted: false },
      { text: 'B', highlighted: true },
      { text: ' here', highlighted: false },
    ]);
  });

  it('returns empty array for empty input', () => {
    expect(splitHighlightedSnippet('')).toEqual([]);
  });

  it('treats an unclosed marker as plain text', () => {
    const segments = splitHighlightedSnippet('open <mark> tag');
    expect(segments.map((segment) => segment.text).join('')).toBe('open <mark> tag');
    expect(segments.every((segment) => !segment.highlighted)).toBe(true);
  });
});
