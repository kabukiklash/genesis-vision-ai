type LlmProvider = 'lovable' | 'openai' | 'openrouter' | 'custom';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content?: string;
  name?: string;
  tool_call_id?: string;
  tool_calls?: unknown;
}

interface LlmConfig {
  provider: LlmProvider;
  apiKey: string;
  baseUrl: string;
  model: string;
}

interface ChatCompletionRequest {
  messages: ChatMessage[];
  model?: string;
  temperature?: number;
  tools?: unknown[];
  tool_choice?: unknown;
  max_tokens?: number;
}

const DEFAULTS: Record<LlmProvider, { baseUrl: string; model: string }> = {
  lovable: { baseUrl: 'https://ai.gateway.lovable.dev/v1', model: 'google/gemini-2.5-flash' },
  openai: { baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini' },
  openrouter: { baseUrl: 'https://openrouter.ai/api/v1', model: 'openai/gpt-4o-mini' },
  custom: { baseUrl: '', model: 'gpt-4o-mini' },
};

function normalizeProvider(value?: string): LlmProvider | undefined {
  if (!value) return undefined;
  const normalized = value.toLowerCase();
  if (normalized === 'lovable') return 'lovable';
  if (normalized === 'openai') return 'openai';
  if (normalized === 'openrouter') return 'openrouter';
  if (normalized === 'custom') return 'custom';
  return undefined;
}

function resolveProvider(): LlmProvider {
  const explicit = normalizeProvider(Deno.env.get('LLM_PROVIDER'));
  if (explicit) return explicit;
  if (Deno.env.get('LOVABLE_API_KEY')) return 'lovable';
  return 'openai';
}

export function getLlmConfig(): LlmConfig {
  const provider = resolveProvider();
  const defaultConfig = DEFAULTS[provider];
  const apiKey = Deno.env.get('LLM_API_KEY')
    ?? (provider === 'lovable' ? Deno.env.get('LOVABLE_API_KEY') : undefined);

  if (!apiKey) {
    throw new Error('LLM_API_KEY is not configured');
  }

  const baseUrl = Deno.env.get('LLM_BASE_URL') ?? defaultConfig.baseUrl;
  if (!baseUrl) {
    throw new Error('LLM_BASE_URL is not configured');
  }

  const model = Deno.env.get('LLM_MODEL') ?? defaultConfig.model;

  return {
    provider,
    apiKey,
    baseUrl,
    model,
  };
}

function buildEndpoint(baseUrl: string): string {
  if (baseUrl.endsWith('/v1')) {
    return `${baseUrl}/chat/completions`;
  }
  return `${baseUrl}/v1/chat/completions`;
}

function buildHeaders(provider: LlmProvider, apiKey: string): Record<string, string> {
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  };

  if (provider === 'openrouter') {
    const siteUrl = Deno.env.get('OPENROUTER_SITE_URL');
    const appName = Deno.env.get('OPENROUTER_APP_NAME');
    if (siteUrl) headers['HTTP-Referer'] = siteUrl;
    if (appName) headers['X-Title'] = appName;
  }

  return headers;
}

export async function callChatCompletion(request: ChatCompletionRequest): Promise<Response> {
  const config = getLlmConfig();
  const endpoint = buildEndpoint(config.baseUrl);

  return fetch(endpoint, {
    method: 'POST',
    headers: buildHeaders(config.provider, config.apiKey),
    body: JSON.stringify({
      model: request.model ?? config.model,
      messages: request.messages,
      temperature: request.temperature,
      tools: request.tools,
      tool_choice: request.tool_choice,
      max_tokens: request.max_tokens,
    }),
  });
}
