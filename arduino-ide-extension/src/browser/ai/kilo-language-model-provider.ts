import {
  LanguageModel,
  LanguageModelRegistry,
  LanguageModelRequest,
  LanguageModelResponse,
  LanguageModelStreamResponsePart,
  ToolRequest,
} from '@theia/ai-core/lib/common';
import type { CancellationToken } from '@theia/core/lib/common/cancellation';
import { injectable, inject } from '@theia/core/shared/inversify';
import type { FrontendApplicationContribution } from '@theia/core/lib/browser/frontend-application-contribution';

const KILO_API_URL = 'https://api.kilo.ai/api/gateway';
const KILO_MODEL = 'kilo-auto/free';
const TIMEOUT_MS = 120_000;
const MAX_TOOL_TURNS = 10;

function getApiKey(): string {
  if (typeof process !== 'undefined' && process.env?.KILO_API_KEY) {
    return process.env.KILO_API_KEY;
  }
  return '';
}

function toOpenAIMessages(
  request: LanguageModelRequest,
  extra?: { role: string; content: string; tool_calls?: unknown[]; tool_call_id?: string }[]
): { role: string; content: string; tool_calls?: unknown[]; tool_call_id?: string }[] {
  const base = request.messages.map((m) => ({
    role: m.actor === 'user' ? 'user' : m.actor === 'system' ? 'system' : 'assistant',
    content: m.query ?? '',
  }));
  if (extra) {
    base.push(...extra);
  }
  return base;
}

function toOpenAITools(tools: ToolRequest[]): unknown[] {
  return tools.map(t => {
    const params: Record<string, unknown> = {
      type: 'object',
      properties: {},
    };
    if (t.parameters?.properties) {
      params.properties = t.parameters.properties;
    }
    if (t.parameters?.type === 'object') {
      params.type = 'object';
    }
    return {
      type: 'function',
      function: {
        name: t.name || t.id,
        description: t.description || '',
        parameters: params,
      },
    };
  });
}

async function kiloRequest(
  body: Record<string, unknown>,
  cancellationToken?: CancellationToken,
): Promise<{ content: string; tool_calls?: { id: string; function: { name: string; arguments: string } }[] }> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  const apiKey = getApiKey();
  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }
  const url = `${KILO_API_URL}/chat/completions`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  if (cancellationToken) {
    cancellationToken.onCancellationRequested(() => {
      controller.abort();
    });
  }
  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Kilo API error ${response.status}: ${text}`);
  }
  type KiloResponse = {
    choices?: { message?: { content?: string; tool_calls?: { id: string; function: { name: string; arguments: string } }[] } }[];
  };
  const json: KiloResponse = await response.json();
  const message = json.choices?.[0]?.message;
  return {
    content: message?.content ?? '',
    tool_calls: message?.tool_calls,
  };
}

@injectable()
export class KiloLanguageModel implements LanguageModel {
  readonly id = KILO_MODEL;
  readonly name = KILO_MODEL;
  readonly vendor = 'kilo';
  readonly family = 'kilo-auto';
  readonly maxInputTokens = 128000;
  readonly maxOutputTokens = 4096;

  private toolsMap = new Map<string, ToolRequest>();

  async request(
    request: LanguageModelRequest,
    cancellationToken?: CancellationToken
  ): Promise<LanguageModelResponse> {
    if (request.tools?.length) {
      for (const t of request.tools) {
        this.toolsMap.set(t.name || t.id, t);
      }
    }

    const messages = toOpenAIMessages(request);
    const openAITools = request.tools?.length ? toOpenAITools(request.tools) : undefined;

    console.log('[Kilo] Starting request with', messages.length, 'messages' + (openAITools ? `, ${openAITools.length} tools` : ''));

    let turn = 0;
    let body: Record<string, unknown> = {
      model: KILO_MODEL,
      messages,
      stream: false,
    };
    if (openAITools) {
      body.tools = openAITools;
    }

    while (turn < MAX_TOOL_TURNS) {
      turn++;
      const result = await kiloRequest(body, cancellationToken);

      if (!result.tool_calls?.length) {
        console.log('[Kilo] Text-only response after', turn, 'turn(s)');
        const asyncIterable: AsyncIterable<LanguageModelStreamResponsePart> = {
          [Symbol.asyncIterator](): AsyncIterator<LanguageModelStreamResponsePart> {
            let yielded = false;
            return {
              async next(): Promise<IteratorResult<LanguageModelStreamResponsePart>> {
                if (yielded) return { done: true, value: undefined };
                yielded = true;
                return {
                  done: false,
                  value: { content: result.content },
                };
              },
            };
          },
        };
        return { stream: asyncIterable };
      }

      console.log('[Kilo] Tool call turn', turn, '- executing', result.tool_calls.length, 'tool(s)');
      const extraMessages: { role: string; content: string; tool_calls?: unknown[]; tool_call_id?: string }[] = [
        {
          role: 'assistant',
          content: result.content || '',
          tool_calls: result.tool_calls.map(tc => ({
            id: tc.id,
            type: 'function',
            function: {
              name: tc.function.name,
              arguments: tc.function.arguments,
            },
          })),
        },
      ];

      for (const tc of result.tool_calls) {
        const key = tc.function.name;
        const tool = this.toolsMap.get(key);
        let resultStr: string;
        if (tool) {
          try {
            const handlerResult = await tool.handler(tc.function.arguments);
            resultStr = typeof handlerResult === 'string' ? handlerResult : JSON.stringify(handlerResult);
          } catch (err: unknown) {
            resultStr = `Error executing ${key}: ${err instanceof Error ? err.message : String(err)}`;
          }
        } else {
          resultStr = `Tool "${key}" not found`;
        }
        extraMessages.push({
          role: 'tool',
          tool_call_id: tc.id,
          content: resultStr,
        });
      }

      (body.messages as unknown[]).push(...extraMessages);
    }

    console.log('[Kilo] Max turns reached, returning fallback');
    const fallbackIterable: AsyncIterable<LanguageModelStreamResponsePart> = {
      [Symbol.asyncIterator](): AsyncIterator<LanguageModelStreamResponsePart> {
        let yielded = false;
        return {
          async next(): Promise<IteratorResult<LanguageModelStreamResponsePart>> {
            if (yielded) return { done: true, value: undefined };
            yielded = true;
            return { done: false, value: { content: 'I was unable to complete the request within the allowed number of steps.' } };
          },
        };
      },
    };
    return { stream: fallbackIterable };
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
