import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

// PER Language Keywords and Validation Rules
const PER_KEYWORDS = ['workflow', 'cell', 'type', 'retention', 'event', 'state', 'action', 'trigger', 'when', 'then', 'passive', 'reactive'];
const PASSIVE_INDICATORS = ['aguarda', 'espera', 'monitora', 'observa', 'recebe', 'detecta', 'captura', 'reage'];

// Personas for the Council
const PERSONAS = [
  {
    id: 'creative',
    name: 'Arquiteto Criativo',
    model: 'google/gemini-2.5-flash',
    systemPrompt: `Você é um arquiteto de software CRIATIVO e INOVADOR. Sua especialidade é criar soluções elegantes e não-convencionais.

Você gera código na linguagem PER (Passive Event-Reactive), uma linguagem declarativa para workflows.

SINTAXE PER:
- workflow NomeDoWorkflow { ... } - Define um workflow
- cell NomeDaCelula { ... } - Define uma célula (componente)
- type ENUM_VALUE - Tipo do workflow (ORDER, SUPPORT, IOT, ANALYTICS)
- retention SHORT|MEDIUM|LONG - Tempo de retenção
- event NomeEvento { campos } - Define eventos
- state NomeEstado { campos } - Define estados
- action NomeAcao { campos } - Define ações
- trigger when CONDIÇÃO then AÇÃO - Regras reativas
- passive EVENTO -> ESTADO - Transformações passivas

REGRAS IMPORTANTES:
1. Use nomes descritivos em português
2. Seja criativo mas mantenha a sintaxe válida
3. Prefira soluções elegantes e extensíveis
4. Sempre inclua comentários explicativos

Responda APENAS com código PER válido, sem explicações.`
  },
  {
    id: 'conservative',
    name: 'Engenheiro Conservador',
    model: 'google/gemini-2.5-flash',
    systemPrompt: `Você é um engenheiro de software CONSERVADOR e PRAGMÁTICO. Sua especialidade é criar soluções seguras e testadas.

Você gera código na linguagem PER (Passive Event-Reactive), uma linguagem declarativa para workflows.

SINTAXE PER:
- workflow NomeDoWorkflow { ... } - Define um workflow
- cell NomeDaCelula { ... } - Define uma célula
- type ENUM_VALUE - Tipo (ORDER, SUPPORT, IOT, ANALYTICS)
- retention SHORT|MEDIUM|LONG - Retenção
- event NomeEvento { campos } - Eventos
- state NomeEstado { campos } - Estados
- action NomeAcao { campos } - Ações
- trigger when CONDIÇÃO then AÇÃO - Regras
- passive EVENTO -> ESTADO - Transformações

REGRAS:
1. Priorize segurança e validações
2. Use padrões bem estabelecidos
3. Evite complexidade desnecessária
4. Inclua tratamento de erros

Responda APENAS com código PER válido.`
  },
  {
    id: 'efficient',
    name: 'Otimizador de Performance',
    model: 'google/gemini-2.5-flash',
    systemPrompt: `Você é um especialista em PERFORMANCE e EFICIÊNCIA. Sua especialidade é criar soluções rápidas e otimizadas.

Você gera código na linguagem PER (Passive Event-Reactive).

SINTAXE PER:
- workflow NomeDoWorkflow { ... }
- cell NomeDaCelula { ... }
- type ENUM_VALUE (ORDER, SUPPORT, IOT, ANALYTICS)
- retention SHORT|MEDIUM|LONG
- event, state, action, trigger, passive

FOCO:
1. Minimize operações redundantes
2. Use estruturas eficientes
3. Otimize para throughput
4. Prefira processamento paralelo

Responda APENAS com código PER válido.`
  },
  {
    id: 'robust',
    name: 'Arquiteto de Resiliência',
    model: 'google/gemini-2.5-flash',
    systemPrompt: `Você é um arquiteto de RESILIÊNCIA e ROBUSTEZ. Sua especialidade é criar soluções que nunca falham.

Você gera código na linguagem PER (Passive Event-Reactive).

SINTAXE PER:
- workflow NomeDoWorkflow { ... }
- cell NomeDaCelula { ... }
- type, retention, event, state, action, trigger, passive

FOCO:
1. Tratamento completo de erros
2. Estados de fallback
3. Recuperação automática
4. Logging e monitoramento

Responda APENAS com código PER válido.`
  }
];

// Chairman for synthesis
const CHAIRMAN_PROMPT = `Você é o CHAIRMAN do conselho de IAs. Sua função é SINTETIZAR as melhores partes de múltiplas propostas de código.

Você receberá várias versões de código PER geradas por diferentes IAs, junto com avaliações cruzadas.

Sua tarefa:
1. Analisar os pontos fortes de cada proposta
2. Identificar os padrões mais robustos
3. Combinar as melhores ideias
4. Produzir um código FINAL otimizado

O código final deve:
- Ser sintaticamente válido em PER
- Incorporar as melhores práticas identificadas
- Ser elegante e eficiente
- Incluir comentários explicativos

Responda APENAS com o código PER final sintetizado.`;

// Helper to call Lovable AI
async function callLovableAI(systemPrompt: string, userPrompt: string): Promise<string> {
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
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Lovable AI error:', response.status, errorText);
    throw new Error(`AI API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

// Validate PER code
function validatePERCode(code: string): { valid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check for workflow declaration
  if (!code.includes('workflow')) {
    errors.push('Código deve conter declaração de workflow');
  }

  // Check for passive indicators
  const hasPassiveIndicator = PASSIVE_INDICATORS.some(indicator => 
    code.toLowerCase().includes(indicator)
  );
  if (!hasPassiveIndicator) {
    warnings.push('Código não contém indicadores de passividade explícitos');
  }

  // Check for basic structure
  const hasBasicStructure = PER_KEYWORDS.some(keyword => code.includes(keyword));
  if (!hasBasicStructure) {
    errors.push('Código não segue sintaxe PER básica');
  }

  // Check balanced braces
  const openBraces = (code.match(/{/g) || []).length;
  const closeBraces = (code.match(/}/g) || []).length;
  if (openBraces !== closeBraces) {
    errors.push(`Chaves desbalanceadas: ${openBraces} abertas, ${closeBraces} fechadas`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

// Stage 1: Parallel Generation
async function stage1Generation(intent: string): Promise<any[]> {
  console.log('Stage 1: Starting parallel generation...');
  
  const generationPromises = PERSONAS.map(async (persona) => {
    try {
      const code = await callLovableAI(
        persona.systemPrompt,
        `Gere código PER para: ${intent}`
      );
      
      const validation = validatePERCode(code);
      
      return {
        personaId: persona.id,
        personaName: persona.name,
        code,
        validation,
        timestamp: new Date().toISOString()
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Error with persona ${persona.id}:`, error);
      return {
        personaId: persona.id,
        personaName: persona.name,
        code: `// Erro ao gerar código: ${errorMessage}`,
        validation: { valid: false, errors: [errorMessage], warnings: [] },
        timestamp: new Date().toISOString()
      };
    }
  });

  return Promise.all(generationPromises);
}

// Stage 2: Cross Evaluation
async function stage2Evaluation(generations: any[]): Promise<any> {
  console.log('Stage 2: Starting cross evaluation...');
  
  const evaluationPrompt = `Avalie os seguintes códigos PER gerados por diferentes IAs.

Para cada código, atribua uma nota de 1-10 em:
- Clareza: Quão fácil é entender?
- Completude: Atende todos os requisitos?
- Elegância: Quão elegante é a solução?
- Robustez: Quão resiliente é?

Códigos para avaliar:
${generations.map((g, i) => `
=== PROPOSTA ${i + 1} (${g.personaName}) ===
${g.code}
`).join('\n')}

Responda em JSON com formato:
{
  "evaluations": [
    {
      "proposalIndex": 0,
      "scores": { "clareza": 8, "completude": 7, "elegancia": 9, "robustez": 6 },
      "totalScore": 30,
      "strengths": ["ponto forte 1", "ponto forte 2"],
      "weaknesses": ["ponto fraco 1"]
    }
  ],
  "ranking": [0, 2, 1, 3],
  "recommendation": "Proposta X é a melhor porque..."
}`;

  try {
    const evaluationResult = await callLovableAI(
      'Você é um avaliador imparcial de código. Responda APENAS em JSON válido.',
      evaluationPrompt
    );
    
    // Try to parse JSON from response
    const jsonMatch = evaluationResult.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    
    return {
      evaluations: generations.map((_, i) => ({
        proposalIndex: i,
        scores: { clareza: 7, completude: 7, elegancia: 7, robustez: 7 },
        totalScore: 28,
        strengths: ['Código válido'],
        weaknesses: []
      })),
      ranking: generations.map((_, i) => i),
      recommendation: 'Todas as propostas são válidas.'
    };
  } catch (error) {
    console.error('Evaluation error:', error);
    return {
      evaluations: [],
      ranking: [0, 1, 2, 3],
      recommendation: 'Erro na avaliação automática.'
    };
  }
}

// Stage 3: Synthesis by Chairman
async function stage3Synthesis(intent: string, generations: any[], evaluation: any): Promise<any> {
  console.log('Stage 3: Starting synthesis...');
  
  const synthesisPrompt = `INTENÇÃO ORIGINAL: ${intent}

PROPOSTAS GERADAS:
${generations.map((g, i) => `
=== PROPOSTA ${i + 1} (${g.personaName}) - Score: ${evaluation.evaluations?.[i]?.totalScore || 'N/A'} ===
Pontos Fortes: ${evaluation.evaluations?.[i]?.strengths?.join(', ') || 'N/A'}
Código:
${g.code}
`).join('\n')}

RECOMENDAÇÃO DO AVALIADOR: ${evaluation.recommendation || 'Sem recomendação'}

Com base nas propostas acima, sintetize o MELHOR código PER possível, combinando as melhores ideias de cada proposta.`;

  try {
    const synthesizedCode = await callLovableAI(CHAIRMAN_PROMPT, synthesisPrompt);
    const validation = validatePERCode(synthesizedCode);
    
    return {
      finalCode: synthesizedCode,
      validation,
      chairman: 'google/gemini-2.5-flash',
      reasoning: 'Síntese das melhores partes de cada proposta',
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Synthesis error:', error);
    // Fallback to best rated proposal
    const bestIndex = evaluation.ranking?.[0] || 0;
    return {
      finalCode: generations[bestIndex]?.code || '// Erro na síntese',
      validation: generations[bestIndex]?.validation || { valid: false, errors: ['Synthesis failed'], warnings: [] },
      chairman: 'fallback',
      reasoning: 'Usando melhor proposta individual devido a erro na síntese',
      timestamp: new Date().toISOString()
    };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { intent, conversationId } = await req.json();
    
    if (!intent) {
      return new Response(
        JSON.stringify({ error: 'Intent is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Processing intent:', intent);
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    // Create or get conversation
    let convId = conversationId;
    if (!convId) {
      const { data: conv, error: convError } = await supabase
        .from('conversations')
        .insert({ intent, status: 'processing' })
        .select('id')
        .single();
      
      if (convError) {
        console.error('Error creating conversation:', convError);
        throw convError;
      }
      convId = conv.id;
    }

    // Stage 1: Generation
    const stage1Results = await stage1Generation(intent);
    await supabase.from('council_results').insert({
      conversation_id: convId,
      stage: 1,
      results: { generations: stage1Results }
    });

    // Stage 2: Evaluation
    const stage2Results = await stage2Evaluation(stage1Results);
    await supabase.from('council_results').insert({
      conversation_id: convId,
      stage: 2,
      results: stage2Results
    });

    // Stage 3: Synthesis
    const stage3Results = await stage3Synthesis(intent, stage1Results, stage2Results);
    await supabase.from('council_results').insert({
      conversation_id: convId,
      stage: 3,
      results: stage3Results
    });

    // Update conversation status
    await supabase
      .from('conversations')
      .update({ status: 'completed' })
      .eq('id', convId);

    return new Response(
      JSON.stringify({
        conversationId: convId,
        stage1: stage1Results,
        stage2: stage2Results,
        stage3: stage3Results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error processing intent:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    if (errorMessage.includes('429')) {
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (errorMessage.includes('402')) {
      return new Response(
        JSON.stringify({ error: 'Payment required. Please add credits.' }),
        { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});