import {
  LanguageModel,
  LanguageModelRegistry,
  LanguageModelRequest,
  LanguageModelResponse,
  LanguageModelStreamResponsePart,
} from '@theia/ai-core/lib/common';
import type { CancellationToken } from '@theia/core/lib/common/cancellation';
import { injectable, inject } from '@theia/core/shared/inversify';
import type { FrontendApplicationContribution } from '@theia/core/lib/browser/frontend-application-contribution';

const KILO_API_URL = 'https://api.kilo.ai/api/gateway';
const KILO_MODEL = 'kilo-auto/free';
const REQUEST_TIMEOUT_MS = 30_000;

function getApiKey(): string {
  return process.env.KILO_API_KEY || '';
}

async function kiloRequest(
  messages: { role: string; content: string }[],
  tools?: unknown[],
  stream = true
): Promise<Response> {
  const body: Record<string, unknown> = {
    model: KILO_MODEL,
    messages,
    stream,
  };
  if (tools && tools.length > 0) {
    body.tools = tools;
  }
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  const apiKey = getApiKey();
  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }
  return fetch(`${KILO_API_URL}/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
}

function toOpenAIMessages(
  request: LanguageModelRequest
): { role: string; content: string }[] {
  return request.messages.map((m) => ({
    role: m.actor === 'user' ? 'user' : m.actor === 'system' ? 'system' : 'assistant',
    content: m.query ?? '',
  }));
}

function toOpenAITools(
  request: LanguageModelRequest
): unknown[] | undefined {
  if (!request.tools || request.tools.length === 0) return undefined;
  return request.tools.map((t) => ({
    type: 'function',
    function: {
      name: t.name,
      description: t.description || '',
      parameters: t.parameters || { type: 'object', properties: {} },
    },
  }));
}

@injectable()
export class KiloLanguageModel implements LanguageModel {
  readonly id = KILO_MODEL;
  readonly name = KILO_MODEL;
  readonly vendor = 'kilo';
  readonly family = 'kilo-auto';
  readonly maxInputTokens = 128000;
  readonly maxOutputTokens = 4096;

  async request(
    request: LanguageModelRequest,
    cancellationToken?: CancellationToken
  ): Promise<LanguageModelResponse> {
    const messages = toOpenAIMessages(request);
    const tools = toOpenAITools(request);
    const response = await kiloRequest(messages, tools);

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Kilo API error ${response.status}: ${text}`);
    }

    if (cancellationToken?.isCancellationRequested) {
      throw new Error('Request cancelled');
    }

    const stream = response.body;
    if (!stream) {
      throw new Error('No response body from Kilo API');
    }

    const reader = stream.getReader();
    const decoder = new TextDecoder();

    const asyncIterable: AsyncIterable<LanguageModelStreamResponsePart> = {
      [Symbol.asyncIterator](): AsyncIterator<LanguageModelStreamResponsePart> {
        let buffer = '';
        let done = false;
        let cancelled = false;
        return {
          async next(): Promise<IteratorResult<LanguageModelStreamResponsePart>> {
            if (done) return { done: true, value: undefined };
            while (true) {
              if (cancellationToken?.isCancellationRequested) {
                cancelled = true;
                reader.cancel();
                done = true;
                return { done: true, value: undefined };
              }
              const { value, done: readerDone } = await reader.read();
              if (readerDone) {
                done = true;
                return { done: true, value: undefined };
              }
              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split('\n');
              buffer = lines.pop() || '';
              for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed || !trimmed.startsWith('data: ')) continue;
                const data = trimmed.slice(6);
                if (data === '[DONE]') {
                  done = true;
                  return { done: true, value: undefined };
                }
                try {
                  const parsed = JSON.parse(data);
                  const choice = parsed.choices?.[0];
                  if (!choice) continue;
                  const delta = choice.delta;
                  if (!delta) continue;
                  if (delta.content || delta.tool_calls) {
                    return {
                      done: false,
                      value: {
                        content: delta.content ?? undefined,
                        tool_calls: delta.tool_calls,
                      },
                    };
                  }
                } catch {
                  // skip malformed lines
                }
              }
            }
          },
          async return(): Promise<IteratorResult<LanguageModelStreamResponsePart>> {
            if (!cancelled) reader.cancel();
            done = true;
            return { done: true, value: undefined };
          },
        };
      },
    };

    return { stream: asyncIterable } as LanguageModelResponse;
  }
}

@injectable()
export class KiloLanguageModelProvider implements FrontendApplicationContribution {
  @inject(LanguageModelRegistry)
  protected readonly languageModelRegistry: LanguageModelRegistry;

  onStart(): void {
    this.languageModelRegistry.addLanguageModels([new KiloLanguageModel()]);
    console.log('[Kilo] Language model registered: ' + KILO_MODEL);
  }
}
