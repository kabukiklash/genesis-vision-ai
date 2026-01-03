import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

const SYSTEM_PROMPT = `Você é um gerador de código React especializado. Sua função é criar componentes React COMPLETOS e FUNCIONAIS baseados na intenção do usuário.

**REGRAS DE GERAÇÃO:**
1. Gere APENAS código JSX/TSX válido e executável
2. Use componentes do shadcn/ui: Card, Button, Input, Tabs, Progress, Badge, Alert, etc.
3. Use ícones do lucide-react: DollarSign, TrendingUp, AlertCircle, CheckCircle, etc.
4. Implemente TODOS os recursos mencionados na intenção
5. Use Tailwind CSS para estilização
6. Inclua estados locais com useState quando necessário
7. Adicione interatividade: botões funcionais, formulários, toggles
8. Crie dados mock realistas para demonstração

**FORMATO DE RESPOSTA:**
Responda APENAS com um objeto JSON válido:
{
  "appName": "NomeDoApp",
  "description": "Descrição breve",
  "imports": ["lista de imports necessários"],
  "componentCode": "código do componente React completo",
  "mockData": "dados mock para o app"
}

**IMPORTANTE:**
- O componentCode deve ser um componente funcional React válido
- Use export default para o componente principal
- Inclua tipos TypeScript quando apropriado
- O código deve ser auto-contido e pronto para uso`;

const MODIFICATION_PROMPT = `Você é um modificador de código React. Sua função é aplicar alterações ao código existente baseado nas instruções do usuário.

**REGRAS:**
1. Mantenha a estrutura existente do código
2. Aplique APENAS as alterações solicitadas
3. Preserve funcionalidades não mencionadas
4. Use a mesma biblioteca de componentes (shadcn/ui)
5. Mantenha o estilo consistente

**FORMATO DE RESPOSTA:**
Responda APENAS com um objeto JSON válido:
{
  "updatedCode": "código completo atualizado",
  "changes": ["lista de alterações feitas"]
}`;

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
        temperature: 0.7,
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
    const content = data.choices[0].message.content;

    // Try to parse JSON from response
    let result;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Parse error:', parseError);
      // If JSON parsing fails, wrap raw content
      result = {
        appName: 'GeneratedApp',
        description: 'App gerado por IA',
        componentCode: content,
        error: 'Failed to parse structured response'
      };
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Generate app error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
