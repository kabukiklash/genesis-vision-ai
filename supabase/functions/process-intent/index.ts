import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callLLM, requireLLMApiKey } from "../_shared/llm.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

// VibeCode Validation Rules (STRICT)
const VALID_STATES = ['CANDIDATE', 'RUNNING', 'COOLING', 'DONE', 'ERROR'];

// Personas for the Council - with STRICT VibeCode prompts
const VIBECODE_EXAMPLE = `
\`\`\`vibecode
workflow NomeDoWorkflow

type TIPO
retention LONG

on EVENTO_1 {
  set state = CANDIDATE
  set friction = 5
}

on EVENTO_2 {
  set state = RUNNING
  increase friction by 20
}

on EVENTO_3 {
  set state = DONE
  set friction = 10
}

on EVENTO_ERRO {
  set state = ERROR
  set friction = 100
}
\`\`\``;

const VIBECODE_RULES = `
**REGRAS ABSOLUTAS DO VIBECODE:**
1. ✅ PERMITIDO: "set state =", "set friction =", "increase friction by"
2. ❌ PROIBIDO: if, else, for, while, cell, trigger, when, event declarations, variáveis, cálculos, operações matemáticas (+, -, *, /), comparações, property access (x.y)
3. Estados VÁLIDOS: CANDIDATE, RUNNING, COOLING, DONE, ERROR
4. Friction: número entre 0 e 100
5. Type: uma palavra em MAIÚSCULAS (ORDER, FINANCE, TICKET, etc)
6. Retention: EPHEMERAL ou LONG

**FORMATO OBRIGATÓRIO:**
${VIBECODE_EXAMPLE}

**IMPORTANTE:** 
- Cada "on EVENTO { }" é independente e passivo
- NÃO adicione: cell, state variables, trigger, when, cálculos, condicionais
- Use APENAS a sintaxe mostrada no exemplo acima`;

const PERSONAS = [
  {
    id: 'creative',
    name: 'Arquiteto Criativo',
    model: 'google/gemini-2.5-flash',
    systemPrompt: `Você é um desenvolvedor CRIATIVO mas RIGOROSO com sintaxe. Gere soluções elegantes SEGUINDO EXATAMENTE as regras do VibeCode.

${VIBECODE_RULES}

Responda APENAS com código VibeCode válido seguindo o formato do exemplo.`
  },
  {
    id: 'conservative',
    name: 'Engenheiro Conservador',
    model: 'google/gemini-2.5-flash',
    systemPrompt: `Você é um desenvolvedor CONSERVADOR e CAUTELOSO. Gere soluções ESTRITAMENTE conforme especificado, sem adicionar features ou sintaxe extra.

${VIBECODE_RULES}

Responda APENAS com código VibeCode válido seguindo o formato do exemplo.`
  },
  {
    id: 'efficient',
    name: 'Otimizador de Performance',
    model: 'google/gemini-2.5-flash',
    systemPrompt: `Você é um desenvolvedor focado em EFICIÊNCIA. Gere soluções MÍNIMAS e DIRETAS, sem complexidade desnecessária.

${VIBECODE_RULES}

Responda APENAS com código VibeCode válido seguindo o formato do exemplo.`
  },
  {
    id: 'robust',
    name: 'Arquiteto de Resiliência',
    model: 'google/gemini-2.5-flash',
    systemPrompt: `Você é um arquiteto focado em ROBUSTEZ. Gere soluções COMPLETAS mas SIMPLES, cobrindo todos os casos de erro.

${VIBECODE_RULES}

Responda APENAS com código VibeCode válido seguindo o formato do exemplo.`
  }
];

// Chairman for synthesis - STRICT
const CHAIRMAN_PROMPT = `Você é o CHAIRMAN do conselho. Sua função é SINTETIZAR o MELHOR código VibeCode.

**REGRA DE OURO:** Use APENAS sintaxe VibeCode válida!

${VIBECODE_RULES}

Analise as propostas recebidas e produza um código FINAL que:
1. Siga EXATAMENTE a sintaxe do exemplo
2. Combine as melhores ideias
3. NÃO adicione sintaxe inventada (cell, trigger, when, variáveis, cálculos)

Responda APENAS com o código VibeCode final.`;

// STRICT VibeCode Validator
function validatePERCode(code: string): { valid: boolean; errors: string[]; warnings: string[]; rulesPassed: number; totalRules: number } {
  const errors: string[] = [];
  const warnings: string[] = [];
  let rulesPassed = 0;
  const totalRules = 8;

  // PER-001: Workflow declaration required
  if (/^\s*workflow\s+[A-Za-z_][A-Za-z0-9_]*/m.test(code)) {
    rulesPassed++;
  } else {
    errors.push('PER-001: Falta declaração de workflow');
  }

  // PER-002: Type declaration required
  if (/^\s*type\s+[A-Z_]+/m.test(code)) {
    rulesPassed++;
  } else {
    errors.push('PER-002: Falta declaração de type (ex: type ORDER)');
  }

  // PER-003: Retention required
  if (/^\s*retention\s+(EPHEMERAL|LONG)/m.test(code)) {
    rulesPassed++;
  } else {
    errors.push('PER-003: Falta retention (EPHEMERAL ou LONG)');
  }

  // PER-004: Valid states only
  const stateAssignments = code.match(/set\s+state\s*=\s*([A-Z_]+)/g);
  let hasInvalidState = false;
  if (stateAssignments) {
    stateAssignments.forEach(match => {
      const state = match.match(/=\s*([A-Z_]+)/)?.[1];
      if (state && !VALID_STATES.includes(state)) {
        hasInvalidState = true;
        errors.push(`PER-004: Estado inválido: ${state}. Válidos: ${VALID_STATES.join(', ')}`);
      }
    });
  }
  if (!hasInvalidState) rulesPassed++;

  // PER-005: Passive commands exist
  const hasSetState = /set\s+state\s*=/.test(code);
  const hasSetFriction = /set\s+friction\s*=/.test(code);
  const hasIncreaseFriction = /increase\s+friction\s+by/.test(code);
  if (hasSetState || hasSetFriction || hasIncreaseFriction) {
    rulesPassed++;
  } else {
    errors.push('PER-005: Nenhum comando passivo encontrado (set state, set friction, increase friction)');
  }

  // PER-006: Friction range 0-100
  const frictionValues = code.match(/friction\s*=\s*(\d+)/g);
  const frictionIncreases = code.match(/increase\s+friction\s+by\s+(\d+)/g);
  let hasInvalidFriction = false;
  frictionValues?.forEach(match => {
    const value = parseInt(match.match(/=\s*(\d+)/)?.[1] || '0');
    if (value < 0 || value > 100) {
      hasInvalidFriction = true;
      errors.push(`PER-006: Friction inválido: ${value} (deve ser 0-100)`);
    }
  });
  frictionIncreases?.forEach(match => {
    const value = parseInt(match.match(/by\s+(\d+)/)?.[1] || '0');
    if (value < 0 || value > 100) {
      hasInvalidFriction = true;
      errors.push(`PER-006: Increment de friction inválido: ${value} (deve ser 0-100)`);
    }
  });
  if (!hasInvalidFriction) rulesPassed++;

  // PER-007: Event handlers exist (aceita on EVENTO, On evento, etc — case-insensitive, em qualquer posição)
  if (/\bon\s+[A-Za-z0-9_]+\s*\{/i.test(code)) {
    rulesPassed++;
  } else {
    errors.push('PER-007: Falta handlers de evento (on EVENTO { })');
  }

  // PER-008: NO ACTIVE LOGIC (STRICT!)
  const forbiddenPatterns = [
    { pattern: /\bif\s*\(/i, name: 'if statements' },
    { pattern: /\belse\s*\{/i, name: 'else statements' },
    { pattern: /\bfor\s*\(/i, name: 'for loops' },
    { pattern: /\bwhile\s*\(/i, name: 'while loops' },
    { pattern: /\bexecute\s*\(/i, name: 'execute calls' },
    { pattern: /\bawait\s+/i, name: 'await statements' },
    { pattern: /\bfunction\s+/i, name: 'function declarations' },
    { pattern: /\breturn\s+/i, name: 'return statements' },
    { pattern: /\bcell\s+\w+/i, name: 'cell declarations' },
    { pattern: /\btrigger\s+\w+/i, name: 'trigger statements' },
    { pattern: /\bwhen\s+/i, name: 'when conditions' },
    { pattern: /\bstate\s+\w+\s+(STRING|DECIMAL|BOOLEAN|INT|NUMBER)/i, name: 'state variable declarations' },
    { pattern: /\bevent\s+[A-Z_]+\s*\{/i, name: 'event declarations' },
    { pattern: /\baction\s+[A-Z_]+/i, name: 'action declarations' },
    { pattern: /\w+\s*\+\s*\w+/i, name: 'addition operations' },
    { pattern: /\w+\s*-\s*\w+/i, name: 'subtraction operations' },
    { pattern: /\w+\s*\*\s*\w+/i, name: 'multiplication operations' },
    { pattern: /\w+\s*\/\s*\w+/i, name: 'division operations' },
    { pattern: /\w+\.\w+/i, name: 'property access' },
    { pattern: /==|!=|<=|>=|<|>/i, name: 'comparison operators' },
  ];

  const foundForbidden: string[] = [];
  forbiddenPatterns.forEach(({ pattern, name }) => {
    if (pattern.test(code)) {
      foundForbidden.push(name);
    }
  });

  if (foundForbidden.length > 0) {
    errors.push(`PER-008: Lógica ativa detectada: ${foundForbidden.join(', ')}. VibeCode permite apenas: "set state =", "set friction =", "increase friction by"`);
  } else {
    rulesPassed++;
  }

  // Balanced braces check (warning only)
  const openBraces = (code.match(/{/g) || []).length;
  const closeBraces = (code.match(/}/g) || []).length;
  if (openBraces !== closeBraces) {
    warnings.push(`Chaves desbalanceadas: ${openBraces} abertas, ${closeBraces} fechadas`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    rulesPassed,
    totalRules
  };
}

// Stage 1: Geração paralela (Lovable)
async function stage1Generation(intent: string): Promise<any[]> {
  console.log('Stage 1: Starting parallel generation...');
  
  const userPrompt = `**INTENÇÃO DO USUÁRIO:**
${intent}

**INSTRUÇÕES (OBRIGATÓRIAS):**
1. Identifique os principais EVENTOS mencionados na intenção (ex: SUBMIT_PEDIDO, CONFIRMAR_PAGAMENTO)
2. Para CADA evento, crie um bloco "on EVENTO { }" com set state e/ou set friction
3. OBRIGATÓRIO: pelo menos 2 blocos "on EVENTO_XYZ { }" — sem isso o código é rejeitado
4. Use APENAS: workflow, type, retention, on EVENTO { set state / set friction / increase friction }
5. Eventos em MAIÚSCULAS. NÃO use: cell, trigger, when, cálculos, condicionais

**RESPONDA EXATAMENTE ASSIM:**

\`\`\`vibecode
workflow NomeDescritivo

type TIPO
retention LONG

on EVENTO_1 {
  set state = ESTADO
  set friction = NUMERO
}

on EVENTO_2 {
  set state = ESTADO
  increase friction by NUMERO
}
\`\`\`

**IMPORTANTE:** Siga EXATAMENTE o formato. Sem blocos "on EVENTO { }" o código é inválido!`;

  // Sequencial com delay para evitar 429 (rate limit)
  const DELAY_MS = 2000;
  const results: any[] = [];
  for (let i = 0; i < PERSONAS.length; i++) {
    if (i > 0) await new Promise(r => setTimeout(r, DELAY_MS));
    const persona = PERSONAS[i];
    try {
      const { content: response } = await callLLM({ systemPrompt: persona.systemPrompt, userPrompt });
      let code = response;
      const vibeCodeMatch = response.match(/```vibecode\s*\n([\s\S]+?)\n```/);
      if (vibeCodeMatch) {
        code = vibeCodeMatch[1].trim();
      } else {
        const anyCodeMatch = response.match(/```\s*\n?([\s\S]+?)\n?```/);
        if (anyCodeMatch) code = anyCodeMatch[1].trim();
      }
      const validation = validatePERCode(code);
      results.push({
        personaId: persona.id,
        personaName: persona.name,
        code,
        validation,
        timestamp: new Date().toISOString()
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Error with persona ${persona.id}:`, error);
      results.push({
        personaId: persona.id,
        personaName: persona.name,
        code: `// Erro ao gerar código: ${errorMessage}`,
        validation: { valid: false, errors: [errorMessage], warnings: [], rulesPassed: 0, totalRules: 8 },
        timestamp: new Date().toISOString()
      });
    }
  }
  return results;
}

// Stage 2: Cross Evaluation with VibeCode-aware criteria
async function stage2Evaluation(generations: any[]): Promise<any> {
  console.log('Stage 2: Starting cross evaluation...');
  
  // Include validation results in evaluation
  const validGenerations = generations.filter(g => g.validation?.valid);
  const invalidCount = generations.length - validGenerations.length;
  
  if (invalidCount > 0) {
    console.log(`⚠️ ${invalidCount}/${generations.length} codes failed validation`);
  }
  
  const evaluationPrompt = `Avalie os seguintes códigos VibeCode.

**CRITÉRIOS DE AVALIAÇÃO:**
1. Validade: Segue EXATAMENTE a sintaxe VibeCode? (workflow, type, retention, on EVENTO, set state/friction)
2. Simplicidade: Usa APENAS comandos permitidos? Sem cell/trigger/when/cálculos?
3. Completude: Cobre todos os eventos importantes da intenção?
4. Clareza: Nomes de eventos são descritivos?

**IMPORTANTE:** Códigos com cell, trigger, when, cálculos, ou variáveis são INVÁLIDOS!

Códigos para avaliar:
${generations.map((g, i) => `
=== PROPOSTA ${i + 1} (${g.personaName}) - Validação: ${g.validation?.valid ? '✅ VÁLIDO' : '❌ INVÁLIDO: ' + (g.validation?.errors?.[0] || 'erro')} ===
\`\`\`vibecode
${g.code}
\`\`\`
`).join('\n')}

Responda em JSON:
{
  "evaluations": [
    {
      "proposalIndex": 0,
      "scores": { "validade": 10, "simplicidade": 8, "completude": 7, "clareza": 9 },
      "totalScore": 34,
      "strengths": ["ponto forte"],
      "weaknesses": ["ponto fraco"]
    }
  ],
  "ranking": [0, 2, 1, 3],
  "recommendation": "Proposta X é a melhor porque..."
}`;

  try {
    const { content: evaluationResult } = await callLLM({
      systemPrompt: 'Você é um avaliador ESPECIALISTA em VibeCode. Penalize códigos que usam sintaxe inválida (cell, trigger, when, cálculos). Responda APENAS em JSON válido.',
      userPrompt: evaluationPrompt,
    });
    
    // Try to parse JSON from response
    const jsonMatch = evaluationResult.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      
      // Adjust ranking to prioritize valid codes
      if (validGenerations.length > 0 && parsed.ranking) {
        const validIndices = generations.map((g, i) => g.validation?.valid ? i : -1).filter(i => i >= 0);
        const invalidIndices = generations.map((g, i) => !g.validation?.valid ? i : -1).filter(i => i >= 0);
        parsed.ranking = [...validIndices, ...invalidIndices];
      }
      
      return parsed;
    }
    
    return {
      evaluations: generations.map((g, i) => ({
        proposalIndex: i,
        scores: { validade: g.validation?.valid ? 10 : 0, simplicidade: 7, completude: 7, clareza: 7 },
        totalScore: g.validation?.valid ? 31 : 21,
        strengths: g.validation?.valid ? ['Código válido'] : [],
        weaknesses: g.validation?.errors || []
      })),
      ranking: generations.map((_, i) => i).sort((a, b) => 
        (generations[b].validation?.valid ? 1 : 0) - (generations[a].validation?.valid ? 1 : 0)
      ),
      recommendation: 'Ranking ajustado pela validação VibeCode.'
    };
  } catch (error) {
    console.error('Evaluation error:', error);
    return {
      evaluations: [],
      ranking: generations.map((_, i) => i).sort((a, b) => 
        (generations[b].validation?.valid ? 1 : 0) - (generations[a].validation?.valid ? 1 : 0)
      ),
      recommendation: 'Erro na avaliação. Ranking por validação.'
    };
  }
}

// Stage 3: Synthesis by Chairman - STRICT VibeCode
async function stage3Synthesis(intent: string, generations: any[], evaluation: any): Promise<any> {
  console.log('Stage 3: Starting synthesis...');
  
  // Filter to only valid codes if available
  const validGenerations = generations.filter(g => g.validation?.valid);
  const codesToUse = validGenerations.length > 0 ? validGenerations : generations;
  
  const synthesisPrompt = `**INTENÇÃO ORIGINAL:** ${intent}

**PROPOSTAS VÁLIDAS:**
${codesToUse.map((g, i) => `
=== ${g.personaName} (Score: ${evaluation.evaluations?.find((e: any) => e.proposalIndex === generations.indexOf(g))?.totalScore || 'N/A'}) ===
\`\`\`vibecode
${g.code}
\`\`\`
`).join('\n')}

**RECOMENDAÇÃO:** ${evaluation.recommendation || 'Escolha a melhor proposta'}

**SUA TAREFA:**
Combine as melhores ideias em um código VibeCode SIMPLES e VÁLIDO.

**LEMBRE-SE:**
- Use APENAS: workflow, type, retention, on EVENTO { set state / set friction / increase friction }
- NÃO use: cell, trigger, when, variáveis, cálculos, comparações

**RESPONDA APENAS COM O CÓDIGO:**

\`\`\`vibecode
workflow NomeDescritivo

type TIPO
retention LONG

on EVENTO {
  set state = ESTADO
  set friction = NUMERO
}
\`\`\``;

  try {
    const { content: response } = await callLLM({ systemPrompt: CHAIRMAN_PROMPT, userPrompt: synthesisPrompt });
    
    // Extract code from response
    let finalCode = response;
    const vibeCodeMatch = response.match(/```vibecode\s*\n([\s\S]+?)\n```/);
    if (vibeCodeMatch) {
      finalCode = vibeCodeMatch[1].trim();
    } else {
      const anyCodeMatch = response.match(/```\s*\n?([\s\S]+?)\n?```/);
      if (anyCodeMatch) {
        finalCode = anyCodeMatch[1].trim();
      }
    }
    
    const validation = validatePERCode(finalCode);
    
    // If chairman's code is invalid but we have valid codes, use the best valid one
    if (!validation.valid && validGenerations.length > 0) {
      console.log('⚠️ Chairman code invalid, using best valid proposal');
      const bestValidIndex = evaluation.ranking?.find((i: number) => generations[i]?.validation?.valid) ?? 0;
      const bestValid = generations[bestValidIndex];
      return {
        finalCode: bestValid.code,
        validation: bestValid.validation,
        chairman: 'fallback-best-valid',
        reasoning: 'Usando melhor proposta válida (síntese do chairman foi inválida)',
        timestamp: new Date().toISOString()
      };
    }
    
    return {
      finalCode,
      validation,
      chairman: 'google/gemini-2.5-flash',
      reasoning: 'Síntese das melhores partes de cada proposta',
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Synthesis error:', error);
    // Fallback to best rated valid proposal
    const bestValidIndex = evaluation.ranking?.find((i: number) => generations[i]?.validation?.valid);
    const bestIndex = bestValidIndex ?? evaluation.ranking?.[0] ?? 0;
    return {
      finalCode: generations[bestIndex]?.code || '// Erro na síntese',
      validation: generations[bestIndex]?.validation || { valid: false, errors: ['Synthesis failed'], warnings: [], rulesPassed: 0, totalRules: 8 },
      chairman: 'fallback',
      reasoning: 'Usando melhor proposta individual devido a erro na síntese',
      timestamp: new Date().toISOString()
    };
  }
}

// Direct generation (skip council) - single AI call
async function directGeneration(intent: string): Promise<any> {
  console.log('Direct generation mode (council disabled)...');
  
  const userPrompt = `**INTENÇÃO DO USUÁRIO:**
${intent}

**INSTRUÇÕES (OBRIGATÓRIAS):**
1. Identifique os principais EVENTOS mencionados na intenção (ex: SUBMIT_PEDIDO, CONFIRMAR_PAGAMENTO, CANCELAR)
2. Para cada evento, crie um bloco "on EVENTO { }" com set state e/ou set friction
3. OBRIGATÓRIO: pelo menos 2 blocos "on EVENTO_XYZ { }" — sem isso o código é inválido
4. Use APENAS: workflow, type, retention, on EVENTO { set state = X / set friction = N / increase friction by N }
5. Eventos em MAIÚSCULAS (ex: on SUBMIT_PEDIDO { })

**RESPONDA EXATAMENTE ASSIM (nada além do bloco vibecode):**

\`\`\`vibecode
workflow NomeDescritivo

type TIPO
retention LONG

on EVENTO_1 {
  set state = ESTADO
  set friction = NUMERO
}

on EVENTO_2 {
  set state = ESTADO
  increase friction by NUMERO
}
\`\`\``;

  const { content: response } = await callLLM({ systemPrompt: PERSONAS[0].systemPrompt, userPrompt });
  
  let code = response;
  const vibeCodeMatch = response.match(/```vibecode\s*\n([\s\S]+?)\n```/);
  if (vibeCodeMatch) {
    code = vibeCodeMatch[1].trim();
  } else {
    const anyCodeMatch = response.match(/```\s*\n?([\s\S]+?)\n?```/);
    if (anyCodeMatch) {
      code = anyCodeMatch[1].trim();
    }
  }
  
  const validation = validatePERCode(code);
  
  return {
    code,
    validation,
    model: 'google/gemini-2.5-flash',
    timestamp: new Date().toISOString()
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { intent, conversationId, skipCouncil } = await req.json();
    
    if (!intent) {
      return new Response(
        JSON.stringify({ error: 'Intent is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    requireLLMApiKey();

    console.log('Processing intent:', intent, skipCouncil ? '(direct mode)' : '(council mode)');
    
    // Get user from JWT if available (auth header)
    const authHeader = req.headers.get('Authorization');
    let userId: string | null = null;
    
    if (authHeader) {
      try {
        const token = authHeader.replace('Bearer ', '');
        const supabaseWithAuth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
          global: {
            headers: { Authorization: authHeader }
          }
        });
        const { data: { user } } = await supabaseWithAuth.auth.getUser(token);
        userId = user?.id ?? null;
      } catch (e) {
        console.warn('Could not extract user from JWT:', e);
      }
    }
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: {
        headers: authHeader ? { Authorization: authHeader } : {}
      }
    });
    
    // Create or get conversation
    let convId = conversationId;
    if (!convId) {
      // user_id será setado automaticamente pelo trigger se userId for null
      const { data: conv, error: convError } = await supabase
        .from('conversations')
        .insert({ 
          intent, 
          status: 'processing',
          user_id: userId ?? null // Trigger vai preencher se null
        })
        .select('id')
        .single();
      
      if (convError) {
        console.error('Error creating conversation:', convError);
        throw convError;
      }
      convId = conv.id;
    }

    // DIRECT MODE: Skip council, single AI call
    if (skipCouncil) {
      const directResult = await directGeneration(intent);
      
      // Create simplified response structure
      const stage1Results = [{
        personaId: 'direct',
        personaName: 'Geração Direta',
        code: directResult.code,
        validation: directResult.validation,
        timestamp: directResult.timestamp
      }];
      
      const stage2Results = {
        evaluations: [],
        ranking: [0],
        recommendation: 'Modo direto - sem avaliação cruzada'
      };
      
      const stage3Results = {
        finalCode: directResult.code,
        validation: directResult.validation,
        chairman: 'direct',
        reasoning: 'Gerado diretamente sem conselho',
        timestamp: directResult.timestamp
      };
      
      // Save to DB (user_id será setado automaticamente pelo trigger)
      await supabase.from('council_results').insert({
        conversation_id: convId,
        stage: 1,
        results: { generations: stage1Results },
        user_id: userId ?? null
      });
      
      await supabase
        .from('conversations')
        .update({ status: 'completed' })
        .eq('id', convId);
      
      return new Response(
        JSON.stringify({
          conversationId: convId,
          stage1: stage1Results,
          stage2: stage2Results,
          stage3: stage3Results,
          mode: 'direct'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // COUNCIL MODE: Full 3-stage process
    // Stage 1: Generation
    const stage1Results = await stage1Generation(intent);
    await supabase.from('council_results').insert({
      conversation_id: convId,
      stage: 1,
      results: { generations: stage1Results },
      user_id: userId ?? null
    });

    // Stage 2: Evaluation
    const stage2Results = await stage2Evaluation(stage1Results);
    await supabase.from('council_results').insert({
      conversation_id: convId,
      stage: 2,
      results: stage2Results,
      user_id: userId ?? null
    });

    // Stage 3: Synthesis
    const stage3Results = await stage3Synthesis(intent, stage1Results, stage2Results);
    await supabase.from('council_results').insert({
      conversation_id: convId,
      stage: 3,
      results: stage3Results,
      user_id: userId ?? null
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
        stage3: stage3Results,
        mode: 'council'
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