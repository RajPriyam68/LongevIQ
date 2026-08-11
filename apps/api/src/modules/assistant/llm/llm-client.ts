export type LlmRole = 'system' | 'user' | 'assistant';

export interface LlmMessage {
  role: LlmRole;
  content: string;
}

export interface LlmChatOptions {
  messages: LlmMessage[];
  model?: string;
  temperature?: number;
}

export interface LlmClient {
  chat(options: LlmChatOptions): Promise<string>;
}

// Raised when no API key has been configured for the assistant. Callers should
// degrade gracefully (educational fallback) instead of surfacing a 500.
export class LlmNotConfiguredError extends Error {
  constructor(message = 'The AI provider is not configured.') {
    super(message);
    this.name = 'LlmNotConfiguredError';
  }
}

// Raised when the upstream provider rejects or fails the request.
export class LlmUpstreamError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = 'LlmUpstreamError';
  }
}

export interface LlmClientConfig {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  timeoutMs?: number;
}

interface ChatCompletionChoice {
  message?: { content?: string | null };
}

interface ChatCompletionResponse {
  choices?: ChatCompletionChoice[];
}

export class OpenAiCompatibleLlmClient implements LlmClient {
  private readonly baseUrl: string;
  private readonly model: string;
  private readonly timeoutMs: number;

  constructor(private readonly config: LlmClientConfig) {
    this.baseUrl = (config.baseUrl ?? 'https://api.openai.com/v1').replace(/\/+$/, '');
    this.model = config.model ?? 'gpt-4o-mini';
    this.timeoutMs = config.timeoutMs ?? 60_000;
  }

  async chat(options: LlmChatOptions): Promise<string> {
    if (!this.config.apiKey) {
      throw new LlmNotConfiguredError();
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          model: options.model ?? this.model,
          messages: options.messages,
          temperature: options.temperature ?? 0.3,
          stream: false,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new LlmUpstreamError(
          `The AI provider returned an error (HTTP ${response.status}).`,
          response.status,
        );
      }

      const data = (await response.json()) as ChatCompletionResponse;
      const content = data.choices?.[0]?.message?.content;
      if (typeof content !== 'string' || content.trim().length === 0) {
        throw new LlmUpstreamError('The AI provider returned an empty response.');
      }
      return content;
    } catch (error) {
      if (error instanceof LlmUpstreamError) {
        throw error;
      }
      if (controller.signal.aborted) {
        throw new LlmUpstreamError('The AI provider request timed out.');
      }
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }
}
