/**
 * LLM helper - OpenAI, Anthropic ou customizado via env.
 * LLM_PROVIDER=anthropic | openai (default)
 */

const LLM_PROVIDER = Deno.env.get('LLM_PROVIDER') || 'openai';
const LLM_API_KEY = Deno.env.get('LLM_API_KEY') || Deno.env.get('ANTHROPIC_API_KEY') || Deno.env.get('LOVABLE_API_KEY');
const LLM_MODEL = Deno.env.get('LLM_MODEL') || (LLM_PROVIDER === 'anthropic' ? 'claude-haiku-4-5' : 'gpt-4o-mini');

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';
const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';

const LLM_API_URL = Deno.env.get('LLM_API_URL') || (LLM_PROVIDER === 'anthropic' ? ANTHROPIC_URL : OPENAI_URL);

export interface LLMOptions {
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
  max_tokens?: number;
  tools?: unknown[];
  tool_choice?: unknown;
}

export interface LLMResponse {
  content: string;
  raw: { choices?: { message?: { content?: string; tool_calls?: { function?: { arguments?: string } }[] } }[] };
}

/**
 * Valida se a API key está configurada. Fail-fast.
 */
export function requireLLMApiKey(): void {
  if (!LLM_API_KEY) {
    throw new Error(
      'LLM_API_KEY não configurada. Configure: npx supabase secrets set LLM_API_KEY=sua_chave. ' +
      'Para Anthropic: LLM_PROVIDER=anthropic e chave em https://console.anthropic.com'
    );
  }
}

function buildOpenAIBody(options: LLMOptions): Record<string, unknown> {
  const { systemPrompt, userPrompt, temperature = 0.3, max_tokens = 4096, tools, tool_choice } = options;
  const body: Record<string, unknown> = {
    model: LLM_MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature,
    max_tokens,
  };
  if (tools) body.tools = tools;
  if (tool_choice) body.tool_choice = tool_choice;
  return body;
}

function convertToolsToAnthropic(tools: unknown[]): unknown[] {
  return tools.map((t) => {
    const openai = t as { type?: string; function?: { name?: string; description?: string; parameters?: unknown } };
    if (openai.function) {
      return {
        name: openai.function.name,
        description: openai.function.description || '',
        input_schema: openai.function.parameters || { type: 'object', properties: {} },
      };
    }
    return t;
  });
}

function buildAnthropicBody(options: LLMOptions): Record<string, unknown> {
  const { systemPrompt, userPrompt, temperature = 0.3, max_tokens = 4096, tools, tool_choice } = options;
  const body: Record<string, unknown> = {
    model: LLM_MODEL,
    max_tokens,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  };
  if (temperature > 0) body.temperature = temperature;
  if (tools && tools.length > 0) {
    body.tools = convertToolsToAnthropic(tools);
    const tc = tool_choice as { type?: string; function?: { name?: string } };
    if (tc?.type === 'function' && tc.function?.name) {
      body.tool_choice = { type: 'tool', name: tc.function.name };
    } else {
      body.tool_choice = { type: 'auto' };
    }
  }
  return body;
}

function parseOpenAIResponse(data: unknown): LLMResponse {
  const d = data as LLMResponse['raw'];
  return {
    content: d?.choices?.[0]?.message?.content ?? '',
    raw: d,
  };
}

function parseAnthropicResponse(data: unknown): LLMResponse {
  const d = data as {
    content?: { type: string; text?: string; name?: string; input?: unknown }[];
  };
  let content = '';
  const contentBlocks = d?.content ?? [];
  for (const block of contentBlocks) {
    if (block.type === 'text' && block.text) content += block.text;
  }
  // Normalizar para formato OpenAI (generate-app espera choices[].message.tool_calls)
  const toolUse = contentBlocks.find((b: { type: string }) => b.type === 'tool_use') as { name?: string; input?: unknown } | undefined;
  const normalized: LLMResponse['raw'] = toolUse
    ? {
        choices: [{
          message: {
            content,
            tool_calls: [{
              function: {
                name: toolUse.name || 'generate_app',
                arguments: typeof toolUse.input === 'string' ? toolUse.input : JSON.stringify(toolUse.input || {}),
              },
            }],
          },
        }],
      }
    : { choices: [{ message: { content } }] };
  return { content, raw: normalized };
}

/**
 * Chama o LLM (OpenAI ou Anthropic)
 */
export async function callLLM(options: LLMOptions): Promise<LLMResponse> {
  requireLLMApiKey();

  const isAnthropic = LLM_PROVIDER === 'anthropic';
  const body = isAnthropic ? buildAnthropicBody(options) : buildOpenAIBody(options);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(isAnthropic
      ? {
          'x-api-key': LLM_API_KEY,
          'anthropic-version': '2023-06-01',
        }
      : {
          'Authorization': `Bearer ${LLM_API_KEY}`,
        }),
  };

  const maxRetries = 3;
  const requestTimeoutMs = 60000;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), requestTimeoutMs);

      const response = await fetch(LLM_API_URL, {
        method: 'POST',
        signal: controller.signal,
        headers,
        body: JSON.stringify(body),
      });

      clearTimeout(timeoutId);

      if (response.status === 429 && attempt < maxRetries) {
        const waitMs = Math.min(5000 * Math.pow(2, attempt - 1), 30000);
        console.warn(`LLM 429 (tentativa ${attempt}/${maxRetries}), aguardando ${waitMs}ms...`);
        await new Promise(r => setTimeout(r, waitMs));
        continue;
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error('LLM error:', response.status, LLM_PROVIDER, errorText);
        throw new Error(`AI API error: ${response.status} - ${errorText.substring(0, 200)}`);
      }

      const data = await response.json();
      return isAnthropic ? parseAnthropicResponse(data) : parseOpenAIResponse(data);
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
      if (e instanceof Error && e.name === 'AbortError') {
        lastError = new Error('AI API timeout: requisição demorou mais de 60 segundos.');
        throw lastError;
      }
      if (attempt < maxRetries && lastError.message.includes('429')) {
        const waitMs = Math.min(5000 * Math.pow(2, attempt - 1), 30000);
        await new Promise(r => setTimeout(r, waitMs));
      } else {
        throw lastError;
      }
    }
  }

  throw lastError || new Error('AI API error: unknown');
}
