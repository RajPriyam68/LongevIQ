import { describe, expect, it } from 'vitest';
import {
  assembleContext,
  buildChatMessages,
  buildSystemPrompt,
} from '../src/modules/assistant/prompt/prompt-builder.js';

const DISCLAIMER = 'Educational only.';

describe('buildSystemPrompt', () => {
  it('includes the safety rules and the medical disclaimer', () => {
    const prompt = buildSystemPrompt(DISCLAIMER);
    expect(prompt).toContain('educational wellness companion');
    expect(prompt).toContain('Never diagnose');
    expect(prompt).toContain(DISCLAIMER);
  });
});

describe('assembleContext', () => {
  it('returns an empty string when there are no sections', () => {
    expect(assembleContext([], 1000)).toBe('');
  });

  it('prepends the source and section title to every block', () => {
    const result = assembleContext(
      [
        {
          title: 'Fasting glucose',
          content: 'Below 100 mg/dL is normal.',
          source: 'Glucose Guide',
        },
      ],
      10_000,
    );
    expect(result).toContain('[Glucose Guide — Fasting glucose]');
    expect(result).toContain('Below 100 mg/dL is normal.');
  });

  it('caps the total context at the char limit without dropping everything', () => {
    const long = 'x'.repeat(5000);
    const sections = [
      { title: 'A', content: long, source: 'Doc A' },
      { title: 'B', content: long, source: 'Doc B' },
    ];
    const result = assembleContext(sections, 3000);
    // Only the heading overhead (title/source) may exceed the limit.
    expect(result.length).toBeLessThanOrEqual(3000 + 20);
    expect(result).toContain('Doc A');
    expect(result).not.toContain('Doc B');
  });
});

describe('buildChatMessages', () => {
  it('returns system, history, then the user question', () => {
    const messages = buildChatMessages({
      question: 'What is normal fasting glucose?',
      sections: [{ title: 'Glucose', content: 'Below 100 is normal.', source: 'Glucose Guide' }],
      history: [
        { role: 'user', content: 'Hi' },
        { role: 'assistant', content: 'Hello!' },
      ],
      disclaimer: DISCLAIMER,
      contextCharLimit: 10_000,
    });

    expect(messages[0]!.role).toBe('system');
    expect(messages[1]).toEqual({ role: 'user', content: 'Hi' });
    expect(messages[2]).toEqual({ role: 'assistant', content: 'Hello!' });
    expect(messages[3]!.role).toBe('user');
    expect(messages[3]!.content).toContain('<knowledge>');
    expect(messages[3]!.content).toContain('Question: What is normal fasting glucose?');
  });

  it('omits the knowledge block when no sections were retrieved', () => {
    const messages = buildChatMessages({
      question: 'Tell me about sleep',
      sections: [],
      history: [],
      disclaimer: DISCLAIMER,
      contextCharLimit: 10_000,
    });

    expect(messages).toHaveLength(2);
    expect(messages[1]!.content).toBe('Tell me about sleep');
    expect(messages[1]!.content).not.toContain('<knowledge>');
  });
});
