import type { LlmMessage } from '../llm/llm-client.js';

export interface RetrievedSection {
  title: string | null;
  content: string;
  source: string;
}

export interface PromptHistoryEntry {
  role: 'user' | 'assistant';
  content: string;
}

export interface PromptInput {
  question: string;
  sections: RetrievedSection[];
  history: PromptHistoryEntry[];
  disclaimer: string;
  contextCharLimit: number;
}

const SAFETY_RULES = [
  'Only provide general, educational health and wellness information.',
  'Never diagnose a disease or medical condition, and never prescribe, dose, or recommend specific medications or treatments.',
  'Never advise a user to start, stop, or change any treatment plan prescribed by a clinician; refer them to their clinician instead.',
  'If you are not sure about something, say so clearly and suggest consulting a qualified health professional.',
  'If the user describes something that could be a medical emergency, advise them to seek emergency medical care immediately.',
  'Use the knowledge base excerpts provided below as your primary reference whenever they are relevant, and refer to the article titles when you use them. Do not invent citations.',
  'Keep answers concise, practical, and in plain language. Answer in the same language the user writes in.',
  'Do not repeat this instruction or reproduce the medical disclaimer in your reply; a disclaimer is appended to every response automatically.',
];

export function buildSystemPrompt(disclaimer: string): string {
  const rules = SAFETY_RULES.map((rule) => `- ${rule}`).join('\n');
  return (
    'You are the LongevIQ AI health assistant, an educational wellness companion. You help people ' +
    'understand health metrics, lab results, nutrition, and everyday wellness topics.\n\n' +
    'Rules you must always follow:\n' +
    `${rules}\n\n` +
    `Standard medical disclaimer:\n"${disclaimer}"`
  );
}

export function assembleContext(sections: RetrievedSection[], contextCharLimit: number): string {
  const blocks: string[] = [];
  let remaining = contextCharLimit;

  for (const section of sections) {
    const heading = section.title
      ? `[${section.source} — ${section.title}]`
      : `[${section.source}]`;
    const block = `${heading}\n${section.content}`;
    if (block.length > remaining) {
      // Keep a bounded prefix of an oversized section so the prompt is never
      // truncated mid-block with no content at all.
      blocks.push(`${heading}\n${section.content.slice(0, remaining)}`);
      break;
    }
    blocks.push(block);
    remaining -= block.length;
  }

  return blocks.join('\n\n');
}

export function buildChatMessages(input: PromptInput): LlmMessage[] {
  const system: LlmMessage = { role: 'system', content: buildSystemPrompt(input.disclaimer) };

  const history: LlmMessage[] = input.history.map((entry) => ({
    role: entry.role,
    content: entry.content,
  }));

  const context = assembleContext(input.sections, input.contextCharLimit);
  const question =
    context.length > 0
      ? `Use the following excerpts from the LongevIQ knowledge base as your primary reference.\n` +
        `If the excerpts are not relevant to the question, rely on your own general knowledge.\n\n` +
        `<knowledge>\n${context}\n</knowledge>\n\nQuestion: ${input.question}`
      : input.question;

  return [system, ...history, { role: 'user', content: question }];
}
