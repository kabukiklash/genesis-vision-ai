# Plano de Implementação: Sistema de Gerenciamento de IAs

## Objetivo
Permitir que o usuário cadastre **múltiplas IAs** e o sistema use essas IAs no **LLM Council**:
- **IA Local** (exposta via Cloudflare)
- **Gemini** (Google)
- **OpenAI** (GPT-4, etc.)
- **Anthropic** (Claude)
- **Lovable** (fallback padrão, não obrigatório)

**Arquitetura do Council**:
- **Stage 1 (Generation)**: Cada persona do conselho pode usar uma IA diferente (ou todas a mesma)
- **Stage 2 (Evaluation)**: Usa IAs cadastradas para avaliar propostas
- **Stage 3 (Synthesis)**: Usa IA cadastrada (ou Lovable como fallback) para sintetizar

**Princípio**: Mínima intervenção, sem quebrar funcionalidades existentes. **Não ficar preso ao Lovable**.

---

## Análise do Estado Atual

### 1. Chamadas de IA Atuais
- **`supabase/functions/process-intent/index.ts`**:
  - Função `callLovableAI()` - linha 121
  - Usada em: `stage1Generation()`, `stage2Evaluation()`, `stage3Synthesis()`, `directGeneration()`
  - URL fixa: `https://ai.gateway.lovable.dev/v1/chat/completions`
  - API Key: `LOVABLE_API_KEY` (env var)

- **`supabase/functions/generate-app/index.ts`**:
  - Chamada direta via `fetch()` - linha 228
  - URL fixa: `https://ai.gateway.lovable.dev/v1/chat/completions`
  - API Key: `LOVABLE_API_KEY` (env var)

### 2. Estrutura de Dados
- **Não existe** tabela `user_ai_providers` (migração foi deletada)
- **Existe** autenticação via `AuthContext` com `user.id`
- **Existe** Supabase client configurado

### 3. Frontend
- **Não existe** interface de gerenciamento de IAs
- **Existe** `AuthButton` e `AuthContext` para autenticação

---

## Plano de Implementação

### FASE 1: Banco de Dados (Mínima Intervenção)
**Arquivo**: `supabase/migrations/20260110000000_add_user_ai_providers.sql`

**Criar tabela**:
```sql
CREATE TABLE IF NOT EXISTS public.user_ai_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  provider_type VARCHAR(50) NOT NULL, -- 'lovable', 'gemini', 'local', 'openai', 'anthropic', 'custom'
  api_url TEXT, -- Para IAs locais/custom (ex: https://sua-ia.cloudflare.com/v1/chat/completions)
  api_key TEXT NOT NULL, -- Criptografado ou não (depende da segurança desejada)
  model VARCHAR(255), -- Ex: 'google/gemini-2.5-flash', 'gpt-4', etc.
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false, -- Apenas uma por usuário pode ser default
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, is_default) WHERE is_default = true
);

-- RLS
ALTER TABLE public.user_ai_providers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own providers"
  ON public.user_ai_providers FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own providers"
  ON public.user_ai_providers FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own providers"
  ON public.user_ai_providers FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own providers"
  ON public.user_ai_providers FOR DELETE
  USING (auth.uid() = user_id);
```

**Índices**:
```sql
CREATE INDEX idx_user_ai_providers_user_id ON public.user_ai_providers(user_id);
CREATE INDEX idx_user_ai_providers_active ON public.user_ai_providers(user_id, is_active) WHERE is_active = true;
```

---

## Arquitetura do LLM Council com Múltiplas IAs

Baseado no repositório [LLM-Council_and_PER-Integration](https://github.com/kabukiklash/LLM-Council_and_PER-Integration), o sistema deve:

1. **Stage 1 (Generation)**: 
   - 4 personas geram propostas em paralelo
   - Cada persona pode usar uma IA diferente (distribuição round-robin)
   - Se usuário tiver 2 IAs cadastradas:
     - Persona 1 e 3 → IA 1
     - Persona 2 e 4 → IA 2
   - Se usuário tiver 1 IA cadastrada:
     - Todas as 4 personas → mesma IA
   - Se usuário não tiver IAs → Lovable (fallback)

2. **Stage 2 (Evaluation)**:
   - Usa a IA padrão do usuário (ou primeira disponível)
   - Avalia todas as propostas geradas no Stage 1

3. **Stage 3 (Synthesis)**:
   - Usa a IA padrão do usuário (ou primeira disponível)
   - Sintetiza o código final baseado nas avaliações

**Vantagens**:
- Diversidade: Diferentes IAs podem gerar abordagens diferentes
- Flexibilidade: Usuário controla quais IAs usar
- Não preso ao Lovable: Sistema funciona completamente com IAs próprias

---

### FASE 2: Helper de Chamada de IA (Refatoração Mínima)
**Arquivo**: `supabase/functions/_shared/ai-provider.ts` (NOVO)

**Função genérica** para chamar qualquer IA:
```typescript
interface AIProvider {
  id: string;
  name: string;
  provider_type: 'lovable' | 'gemini' | 'local' | 'openai' | 'anthropic' | 'custom';
  api_url?: string;
  api_key: string;
  model?: string;
}

interface AICallOptions {
  systemPrompt: string;
  userPrompt: string;
  model?: string;
  temperature?: number;
  max_tokens?: number;
  tools?: any[];
  tool_choice?: any;
}

async function callAIProvider(
  provider: AIProvider,
  options: AICallOptions
): Promise<string> {
  const url = provider.api_url || getDefaultURL(provider.provider_type);
  const model = options.model || provider.model || getDefaultModel(provider.provider_type);
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${provider.api_key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: options.systemPrompt },
        { role: 'user', content: options.userPrompt }
      ],
      temperature: options.temperature ?? 0.3,
      max_tokens: options.max_tokens ?? 4096,
      ...(options.tools && { tools: options.tools }),
      ...(options.tool_choice && { tool_choice: options.tool_choice }),
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`AI API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return extractContentFromResponse(data, provider.provider_type);
}

function getDefaultURL(providerType: string): string {
  switch (providerType) {
    case 'lovable':
      return 'https://ai.gateway.lovable.dev/v1/chat/completions';
    case 'gemini':
      return 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';
    case 'openai':
      return 'https://api.openai.com/v1/chat/completions';
    case 'anthropic':
      return 'https://api.anthropic.com/v1/messages';
    default:
      throw new Error(`Unknown provider type: ${providerType}`);
  }
}

function getDefaultModel(providerType: string): string {
  switch (providerType) {
    case 'lovable':
      return 'google/gemini-2.5-flash';
    case 'gemini':
      return 'gemini-pro';
    case 'openai':
      return 'gpt-4';
    case 'anthropic':
      return 'claude-3-opus-20240229';
    case 'local':
    case 'custom':
      // Para IAs locais/custom, o modelo deve ser especificado pelo usuário
      return 'default';
    default:
      return 'google/gemini-2.5-flash';
  }
}

// Função para normalizar formato de resposta (algumas APIs retornam formatos diferentes)
function extractContentFromResponse(data: any, providerType: string): string {
  // OpenAI/Lovable format
  if (data.choices && data.choices[0]?.message?.content) {
    return data.choices[0].message.content;
  }
  
  // Anthropic format
  if (data.content && Array.isArray(data.content)) {
    return data.content[0].text || data.content[0];
  }
  
  // Gemini format (se aplicável)
  if (data.candidates && data.candidates[0]?.content?.parts) {
    return data.candidates[0].content.parts[0].text;
  }
  
  throw new Error(`Unable to extract content from ${providerType} response`);
}
```

---

### FASE 3: Modificar Edge Functions (Substituir `callLovableAI`)

#### 3.1 `supabase/functions/process-intent/index.ts`
**Mudanças mínimas**:
1. Importar helper: `import { callAIProvider, getProviderForPersona, getDefaultProvider } from '../_shared/ai-provider.ts';`
2. **Remover** função `callLovableAI()` (linha 121)
3. Modificar assinaturas das funções para receber `userId` e `supabase`:
   - `stage1Generation(intent, userId, supabase)` - linha 314
   - `stage2Evaluation(generations, userId, supabase)` - linha 356
   - `stage3Synthesis(intent, generations, evaluation, userId, supabase)` - linha 447
   - `directGeneration(intent, userId, supabase)` - linha 541
4. Substituir todas as chamadas `callLovableAI()` por `callAIProvider()` usando providers do usuário
5. Atualizar chamadas no `serve()` para passar `userId` e `supabase`

**Funções auxiliares para obter providers do usuário**:
```typescript
// Obter todas as IAs ativas do usuário
async function getUserAIProviders(userId: string | null, supabase: any): Promise<AIProvider[]> {
  if (!userId) return [];
  
  const { data, error } = await supabase
    .from('user_ai_providers')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: false });
  
  if (error || !data) return [];
  return data;
}

// Obter provider padrão (ou primeira IA disponível)
async function getDefaultProvider(userId: string | null, supabase: any): Promise<AIProvider | null> {
  const providers = await getUserAIProviders(userId, supabase);
  
  if (providers.length > 0) {
    return providers.find(p => p.is_default) || providers[0];
  }
  
  return null;
}

// Obter provider para uma persona específica (distribuir entre IAs disponíveis)
async function getProviderForPersona(
  personaIndex: number,
  userId: string | null,
  supabase: any
): Promise<AIProvider> {
  const providers = await getUserAIProviders(userId, supabase);
  
  if (providers.length > 0) {
    // Distribuir personas entre IAs disponíveis (round-robin)
    const providerIndex = personaIndex % providers.length;
    return providers[providerIndex];
  }
  
  // Fallback para Lovable (apenas se não houver IAs cadastradas)
  const lovableKey = Deno.env.get('LOVABLE_API_KEY');
  if (!lovableKey) {
    throw new Error('No AI provider configured. Please register at least one AI provider.');
  }
  
  return {
    id: 'lovable-fallback',
    name: 'Lovable (Fallback)',
    provider_type: 'lovable',
    api_key: lovableKey,
    model: 'google/gemini-2.5-flash'
  };
}
```

**Modificar `stage1Generation()` para usar múltiplas IAs**:
```typescript
async function stage1Generation(
  intent: string,
  userId: string | null,
  supabase: any
): Promise<any[]> {
  const userPrompt = `**INTENÇÃO DO USUÁRIO:**
${intent}

// ... resto do prompt`;

  // Cada persona pode usar uma IA diferente
  const generationPromises = PERSONAS.map(async (persona, index) => {
    try {
      const provider = await getProviderForPersona(index, userId, supabase);
      
      const response = await callAIProvider(provider, {
        systemPrompt: persona.systemPrompt,
        userPrompt: userPrompt,
        temperature: 0.3
      });
      
      // ... extração e validação do código
      return {
        personaId: persona.id,
        personaName: persona.name,
        providerId: provider.id,
        providerName: provider.name,
        code,
        validation,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      // ... tratamento de erro
    }
  });
  
  return Promise.all(generationPromises);
}
```

**Modificar `stage2Evaluation()`**:
```typescript
async function stage2Evaluation(
  generations: any[],
  userId: string | null,
  supabase: any
): Promise<any> {
  // Usar provider padrão ou primeira IA disponível para avaliação
  const provider = await getDefaultProvider(userId, supabase) || 
    await getProviderForPersona(0, userId, supabase);
  
  const evaluationPrompt = `// ... prompt de avaliação`;
  
  const evaluationResult = await callAIProvider(provider, {
    systemPrompt: 'Você é um avaliador ESPECIALISTA em VibeCode...',
    userPrompt: evaluationPrompt
  });
  
  // ... parse e retorno
}
```

**Modificar `stage3Synthesis()`**:
```typescript
async function stage3Synthesis(
  intent: string,
  generations: any[],
  evaluation: any,
  userId: string | null,
  supabase: any
): Promise<any> {
  // Usar provider padrão para síntese
  const provider = await getDefaultProvider(userId, supabase) || 
    await getProviderForPersona(0, userId, supabase);
  
  const synthesisPrompt = `// ... prompt de síntese`;
  
  const response = await callAIProvider(provider, {
    systemPrompt: CHAIRMAN_PROMPT,
    userPrompt: synthesisPrompt
  });
  
  // ... extração e validação
}
```

**Modificar `directGeneration()`**:
```typescript
async function directGeneration(
  intent: string,
  userId: string | null,
  supabase: any
): Promise<any> {
  const provider = await getDefaultProvider(userId, supabase) || 
    await getProviderForPersona(0, userId, supabase);
  
  const userPrompt = `// ... prompt`;
  
  const response = await callAIProvider(provider, {
    systemPrompt: PERSONAS[0].systemPrompt,
    userPrompt: userPrompt
  });
  
  // ... extração e validação
}
```

#### 3.2 `supabase/functions/generate-app/index.ts`
**Mudanças mínimas**:
1. Importar helper
2. Substituir `fetch()` direto por `callAIProvider()` - linha 228
3. Obter provider do usuário antes do loop de retry

---

### FASE 4: Frontend - Interface de Gerenciamento

#### 4.1 API Client
**Arquivo**: `src/lib/api.ts` (adicionar funções)

```typescript
export interface AIProvider {
  id: string;
  user_id: string;
  name: string;
  provider_type: 'lovable' | 'gemini' | 'local' | 'openai' | 'anthropic' | 'custom';
  api_url?: string;
  api_key: string; // Não retornar em GET, apenas em POST/PUT
  model?: string;
  is_active: boolean;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export async function getAIProviders(): Promise<AIProvider[]> {
  const { data, error } = await supabase
    .from('user_ai_providers')
    .select('id, name, provider_type, api_url, model, is_active, is_default, created_at, updated_at')
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data || [];
}

export async function createAIProvider(provider: Omit<AIProvider, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<AIProvider> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  
  const { data, error } = await supabase
    .from('user_ai_providers')
    .insert({
      ...provider,
      user_id: user.id
    })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function updateAIProvider(id: string, updates: Partial<AIProvider>): Promise<AIProvider> {
  const { data, error } = await supabase
    .from('user_ai_providers')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function deleteAIProvider(id: string): Promise<void> {
  const { error } = await supabase
    .from('user_ai_providers')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
}

export async function setDefaultAIProvider(id: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  
  // Desativar outros defaults
  await supabase
    .from('user_ai_providers')
    .update({ is_default: false })
    .eq('user_id', user.id)
    .neq('id', id);
  
  // Ativar este como default
  await supabase
    .from('user_ai_providers')
    .update({ is_default: true })
    .eq('id', id);
}
```

#### 4.2 Componente de Gerenciamento
**Arquivo**: `src/components/ai/AIProviderManager.tsx` (NOVO)

**Funcionalidades**:
- Listar IAs cadastradas (com indicador de qual está sendo usada no Council)
- Formulário para cadastrar nova IA:
  - **Tipo**: Lovable, Gemini, OpenAI, Anthropic, Local (Custom), Outro
  - **Nome**: Nome descritivo (ex: "Minha IA Local via Cloudflare")
  - **URL da API**: Para IAs locais/custom (ex: `https://sua-ia.cloudflare.com/v1/chat/completions`)
  - **API Key**: Chave de autenticação
  - **Model**: Modelo específico (opcional, usa default do tipo se não informado)
- Ativar/desativar IA
- Definir como padrão (usado em síntese e avaliação)
- Deletar IA
- Testar conexão (validação antes de salvar)
- **Visualização**: Mostrar quantas personas estão usando cada IA no Council

#### 4.3 Página de Configuração
**Arquivo**: `src/pages/AIProviders.tsx` (NOVO)

**Rota**: `/ai-providers`

**Integração no App**:
- Adicionar link no `AuthButton` ou criar menu de configurações

---

### FASE 5: Testes e Validação

1. **Testar com Lovable** (fallback padrão)
2. **Testar com Gemini** (cadastrar e usar)
3. **Testar com IA Local** (Cloudflare)
4. **Testar sem IAs cadastradas** (deve usar Lovable)
5. **Testar múltiplas IAs** (trocar entre elas)

---

## Resumo de Arquivos a Criar/Modificar

### Criar:
1. `supabase/migrations/20260110000000_add_user_ai_providers.sql`
2. `supabase/functions/_shared/ai-provider.ts`
3. `src/components/ai/AIProviderManager.tsx`
4. `src/pages/AIProviders.tsx`

### Modificar:
1. `supabase/functions/process-intent/index.ts` (substituir `callLovableAI`)
2. `supabase/functions/generate-app/index.ts` (substituir `fetch` direto)
3. `src/lib/api.ts` (adicionar funções de gerenciamento)
4. `src/App.tsx` (adicionar rota `/ai-providers`)
5. `src/components/auth/AuthButton.tsx` (adicionar link para configurações - opcional)

---

## Garantias de Não Quebra

1. **Fallback automático**: Se usuário não tiver IA cadastrada, usa Lovable (mas não é obrigatório ter Lovable configurado)
2. **Compatibilidade**: IAs devem seguir formato OpenAI (chat completions) - padrão da indústria
3. **Validação**: Testar conexão antes de salvar
4. **RLS**: Apenas usuário autenticado pode gerenciar suas próprias IAs
5. **Backward compatibility**: Código existente continua funcionando
6. **Múltiplas IAs**: Cada persona do conselho pode usar uma IA diferente (distribuição round-robin)
7. **Flexibilidade**: Usuário pode cadastrar quantas IAs quiser e escolher qual usar
8. **Não preso ao Lovable**: Sistema funciona completamente sem Lovable se usuário tiver IAs cadastradas

---

## Próximos Passos

1. ✅ Criar plano (este arquivo)
2. ⏳ Criar migração do banco
3. ⏳ Criar helper de chamada de IA
4. ⏳ Modificar Edge Functions
5. ⏳ Criar interface frontend
6. ⏳ Testar e validar
