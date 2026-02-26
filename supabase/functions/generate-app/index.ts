import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

const SYSTEM_PROMPT = `Você é um gerador de código React especializado. Sua função é criar componentes React COMPLETOS e FUNCIONAIS baseados na intenção do usuário.

**REGRAS DE GERAÇÃO CRÍTICAS:**
1. Gere um componente React funcional e auto-contido
2. Use componentes do shadcn/ui (já instalados no projeto): Card, Button, Input, Tabs, Progress, Badge, Alert, Select, etc.
3. Use ícones do lucide-react
4. Implemente TODOS os recursos mencionados na intenção
5. Use Tailwind CSS para estilização
6. Inclua estados locais com useState quando necessário
7. Adicione interatividade: botões funcionais, formulários, toggles
8. Crie dados mock realistas para demonstração

**VALIDAÇÃO DE SINTAXE OBRIGATÓRIA:**
- ✅ TODAS as strings devem ser fechadas (aspas simples, duplas ou template strings)
- ✅ TODAS as chaves { } devem ser fechadas
- ✅ TODOS os parênteses ( ) devem ser fechados
- ✅ TODOS os colchetes [ ] devem ser fechados
- ✅ Verifique que não há vírgulas faltando em objetos/arrays
- ✅ Verifique que não há ponto-e-vírgula faltando onde necessário
- ✅ O código DEVE ser sintaticamente válido e executável

**IMPORTANTE:**
- O componentCode deve ser TSX executável no browser (evite declarações TypeScript de tipo/interface no topo; use tipagem inline mínima se necessário)
- Use export default para o componente principal
- O código deve ser COMPLETO e PRONTO para colar em um arquivo .tsx
- NUNCA corte o código no meio - sempre feche todas as estruturas
- Se o código for muito longo, priorize funcionalidade completa sobre detalhes extras`;

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

serve(async (req): Promise<Response> => {
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

**ANTES DE RETORNAR O CÓDIGO:**
1. Verifique se TODAS as strings estão fechadas
2. Verifique se TODAS as chaves { } estão balanceadas
3. Verifique se TODOS os parênteses ( ) estão balanceados
4. Verifique se o componente tem return e está completo
5. Verifique se há export default no final

Gere o código React COMPLETO e VÁLIDO. O código será validado e qualquer erro de sintaxe causará falha.`;
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

    // Função para validar sintaxe básica do código
    function validateCodeSyntax(code: string): { valid: boolean; error?: string } {
      if (!code) return { valid: false, error: 'Código vazio' };
      
      // Verificar balanceamento de chaves
      const openBraces = (code.match(/{/g) || []).length;
      const closeBraces = (code.match(/}/g) || []).length;
      if (openBraces !== closeBraces) {
        return { valid: false, error: `Chaves desbalanceadas: ${openBraces} abertas, ${closeBraces} fechadas` };
      }
      
      // Verificar balanceamento de parênteses
      const openParens = (code.match(/\(/g) || []).length;
      const closeParens = (code.match(/\)/g) || []).length;
      if (openParens !== closeParens) {
        return { valid: false, error: `Parênteses desbalanceados: ${openParens} abertos, ${closeParens} fechados` };
      }
      
      // Verificar balanceamento de colchetes
      const openBrackets = (code.match(/\[/g) || []).length;
      const closeBrackets = (code.match(/\]/g) || []).length;
      if (openBrackets !== closeBrackets) {
        return { valid: false, error: `Colchetes desbalanceados: ${openBrackets} abertos, ${closeBrackets} fechados` };
      }
      
      // Verificar strings não fechadas (básico)
      const lines = code.split('\n');
      let inString = false;
      let stringChar = '';
      for (const line of lines) {
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          const prevChar = i > 0 ? line[i - 1] : '';
          
          if (!inString && (char === '"' || char === "'" || char === '`')) {
            inString = true;
            stringChar = char;
          } else if (inString && char === stringChar && prevChar !== '\\') {
            inString = false;
            stringChar = '';
          }
        }
      }
      
      if (inString) {
        return { valid: false, error: 'String não fechada detectada' };
      }
      
      return { valid: true };
    }

    // Retry com validação
    let attempts = 0;
    const maxAttempts = 3;
    let lastError: string | null = null;
    
    while (attempts < maxAttempts) {
      attempts++;
      
      const response: Response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt + (attempts > 1 ? `\n\n⚠️ TENTATIVA ${attempts}: O código anterior tinha erros de sintaxe. ${lastError ? `Erro: ${lastError}` : ''} Por favor, gere código COMPLETO e VÁLIDO, verificando todas as strings, chaves e parênteses.` : '') }
          ],
          tools,
          tool_choice,
          max_tokens: 8192, // Aumentar limite de tokens
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
        if (attempts < maxAttempts) {
          lastError = `Erro HTTP ${response.status}`;
          continue;
        }
        throw new Error(`AI API error: ${response.status}`);
      }

      const data = await response.json();

      // Prefer tool-calling output
      const toolCall = data?.choices?.[0]?.message?.tool_calls?.[0];
      if (toolCall?.function?.arguments) {
        try {
          const args = JSON.parse(toolCall.function.arguments);
          const componentCode = isModify ? args.updatedCode : args.componentCode;
          
          // Validar sintaxe do código gerado
          const validation = validateCodeSyntax(componentCode);
          if (!validation.valid) {
            lastError = validation.error || 'Erro de sintaxe';
            console.warn(`Tentativa ${attempts}: Código inválido - ${lastError}`);
            if (attempts < maxAttempts) {
              continue; // Tentar novamente
            } else {
              // Na última tentativa, retornar mesmo com erro (melhor que nada)
              console.error('Máximo de tentativas atingido. Retornando código com possível erro.');
            }
          }
          
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
          lastError = 'Erro ao parsear resposta da IA';
          if (attempts < maxAttempts) continue;
        }
      }
      
      // Fallback (should be rare)
      const content = data?.choices?.[0]?.message?.content ?? '';
      if (attempts < maxAttempts) {
        lastError = 'Resposta da IA não está no formato esperado';
        continue;
      }
      
      return new Response(
        JSON.stringify({
          error: 'Failed to parse structured response após múltiplas tentativas',
          raw: content.substring(0, 500), // Limitar tamanho
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    } // Fim do while loop

    // Fallback - should not reach here
    return new Response(
      JSON.stringify({ error: 'Unexpected: no response generated' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

    console.error('Generate app error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
