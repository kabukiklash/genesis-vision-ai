import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

const SYSTEM_PROMPT = `Você é um gerador de código React especializado. Sua função é criar componentes React COMPLETOS e FUNCIONAIS baseados na intenção do usuário.

**REGRAS DE GERAÇÃO:**
1. Gere um componente React funcional e auto-contido
2. Use componentes do shadcn/ui (já instalados no projeto): Card, Button, Input, Tabs, Progress, Badge, Alert, Select, etc.
3. Use ícones do lucide-react
4. Implemente TODOS os recursos mencionados na intenção
5. Use Tailwind CSS para estilização
6. Inclua estados locais com useState quando necessário
7. Adicione interatividade: botões funcionais, formulários, toggles
8. Crie dados mock realistas para demonstração

**IMPORTANTE:**
- O componentCode deve ser TSX executável no browser (evite declarações TypeScript de tipo/interface no topo; use tipagem inline mínima se necessário)
- Use export default para o componente principal
- O código deve ser pronto para colar em um arquivo .tsx`;

const MODIFICATION_PROMPT = `Você é um modificador de código React. Sua função é aplicar alterações ao código existente baseado nas instruções do usuário.

**REGRAS:**
1. Mantenha a estrutura existente do código
2. Aplique APENAS as alterações solicitadas
3. Preserve funcionalidades não mencionadas
4. Use a mesma biblioteca de componentes (shadcn/ui)
5. Mantenha o estilo consistente

**IMPORTANTE:**
- Retorne o código completo atualizado (TSX executável)`;

interface GenerateRequest {
  intent: string;
  vibeCode?: string;
  type: 'generate' | 'modify';
  currentCode?: string;
  modification?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { intent, vibeCode, type, currentCode, modification } = await req.json() as GenerateRequest;

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    let systemPrompt: string;
    let userPrompt: string;

    if (type === 'modify' && currentCode && modification) {
      systemPrompt = MODIFICATION_PROMPT;
      userPrompt = `**CÓDIGO ATUAL:**
\`\`\`tsx
${currentCode}
\`\`\`

**ALTERAÇÃO SOLICITADA:**
${modification}

Aplique a alteração mantendo o restante do código.`;
    } else {
      systemPrompt = SYSTEM_PROMPT;
      userPrompt = `**INTENÇÃO DO USUÁRIO:**
${intent}

${vibeCode ? `**VIBECODE (Estados do App):**
\`\`\`
${vibeCode}
\`\`\`

Use estes estados (CANDIDATE, RUNNING, COOLING, DONE, ERROR) para controlar a UI.` : ''}

**INSTRUÇÕES ESPECÍFICAS:**
1. Analise a intenção e identifique TODOS os recursos necessários
2. Crie um app React COMPLETO com:
   - Dashboard principal com visão geral
   - Seções/tabs para cada funcionalidade
   - Formulários para entrada de dados
   - Listas e cards para exibição
   - Alertas e notificações
   - Dados mock realistas
3. O app deve ser visualmente rico e funcional

Gere o código React completo.`;
    }

    const isModify = type === 'modify' && currentCode && modification;

    const tools = isModify
      ? [
          {
            type: 'function',
            function: {
              name: 'modify_app',
              description: 'Apply a modification to existing React TSX code and return the full updated code.',
              parameters: {
                type: 'object',
                properties: {
                  updatedCode: { type: 'string', description: 'Full updated TSX code' },
                  changes: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Short list of changes applied'
                  }
                },
                required: ['updatedCode'],
                additionalProperties: false
              }
            }
          }
        ]
      : [
          {
            type: 'function',
            function: {
              name: 'generate_app',
              description: 'Generate a complete React TSX component for the user intent.',
              parameters: {
                type: 'object',
                properties: {
                  appName: { type: 'string' },
                  description: { type: 'string' },
                  imports: { type: 'array', items: { type: 'string' } },
                  componentCode: { type: 'string' },
                  mockData: { type: 'string' }
                },
                required: ['appName', 'description', 'componentCode'],
                additionalProperties: false
              }
            }
          }
        ];

    const tool_choice = isModify
      ? { type: 'function', function: { name: 'modify_app' } }
      : { type: 'function', function: { name: 'generate_app' } };

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        tools,
        tool_choice,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit excedido. Tente novamente em alguns minutos.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'Créditos insuficientes. Adicione créditos à sua conta.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const errorText = await response.text();
      console.error('AI error:', response.status, errorText);
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();

    // Prefer tool-calling output
    const toolCall = data?.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      try {
        const args = JSON.parse(toolCall.function.arguments);
        const result = isModify
          ? { updatedCode: args.updatedCode, changes: args.changes }
          : {
              appName: args.appName,
              description: args.description,
              imports: args.imports,
              componentCode: args.componentCode,
              mockData: args.mockData,
            };

        return new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch (e) {
        console.error('Tool args parse error:', e, toolCall.function.arguments);
      }
    }

    // Fallback (should be rare)
    const content = data?.choices?.[0]?.message?.content ?? '';
    return new Response(
      JSON.stringify({
        error: 'Failed to parse structured response',
        raw: content,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );

  } catch (error) {
    console.error('Generate app error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
