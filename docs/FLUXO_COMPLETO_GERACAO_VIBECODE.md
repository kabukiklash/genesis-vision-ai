# Fluxo Completo da Geração — Do Clique ao Resultado

Rastreamento detalhado de cada etapa para identificar onde o processo falha.

---

## PASSO 1 — Usuário clica "Gerar Código"

**Arquivo:** `src/pages/Index.tsx`  
**Função:** `handleSubmit(intent)`

```
1. Valida intent.trim() não vazio
2. setState("loading"), setCurrentStage(1)
3. Chama: processIntent(intent, { skipCouncil: !councilEnabled })
4. Se sucesso → setResults(response), setState("results")
5. Se erro → setState("input"), toast.error()
```

**Possível falha aqui:**  
- `processIntent` lança exceção (ex: rede, 429, 402, 500 da Edge Function).  
- Usuário volta para tela de input e vê toast de erro.  
- Não chega ao CouncilResults.

---

## PASSO 2 — api.ts invoca a Edge Function

**Arquivo:** `src/lib/api.ts`  
**Função:** `processIntent(intent, options)`

```
1. Obtém session do Supabase (supabase.auth.getSession())
2. supabase.functions.invoke('process-intent', {
     body: { intent, skipCouncil },
     headers: { Authorization: Bearer session.access_token }  // JWT do usuário, NÃO Lovable
   })
3. Se error → throw new Error(error.message)
4. Retorna data (ProcessIntentResponse)
```

**Possível falha aqui:**  
- CORS, função não deployada, timeout, erro 500 da função.  
- Exceção sobe para Index → usuário vê toast e não vê resultados.

---

## PASSO 3 — Edge Function process-intent recebe request

**Arquivo:** `supabase/functions/process-intent/index.ts`  
**Handler:** `serve(async (req) => ...)`

```
1. OPTIONS → retorna CORS
2. Parse body: { intent, conversationId, skipCouncil }
3. Se !intent → 400 "Intent is required"
4. Extrai userId do JWT (se Authorization header)
5. Cria/usa conversation no Supabase
6. SE skipCouncil → directGeneration(intent) [1 chamada LLM]
   SENÃO → stage1Generation → stage2Evaluation → stage3Synthesis [6 chamadas LLM]
7. Persiste em council_results (stage 1, 2, 3)
8. Retorna JSON: { conversationId, stage1, stage2, stage3, mode }
```

**Possível falha aqui:**  
- Erro ao criar conversation (DB).  
- Qualquer exceção não tratada → 500.  
- Se directGeneration ou stage1 lançar E não for catchada no nível da persona → 500.

---

## PASSO 4 — Stage 1: Geração (cada persona)

**Função:** `stage1Generation(intent)`  
**Para cada persona (4 em paralelo ou 1 no modo direto):**

### 4.1 Chamada ao LLM

```
callLovableAI(persona.systemPrompt, userPrompt)
  → fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      headers: { Authorization: Bearer LOVABLE_API_KEY },
      body: { model: 'google/gemini-2.5-flash', messages: [...], temperature: 0.3 }
    })
```

**Possível falha A:**  
- `LOVABLE_API_KEY` undefined → `Bearer undefined` → **401**  
- API retorna 429, 402, 5xx → `throw new Error('AI API error: N')`  
- Exceção capturada no catch da persona (não propaga).

### 4.2 Se a chamada der certo

```
response = texto da LLM (pode ter explicação + bloco ```vibecode)
code = extrair com regex /```vibecode\s*\n([\s\S]+?)\n```/
       ou fallback /```\s*\n?([\s\S]+?)\n?```/
validation = validatePERCode(code)
return { personaId, personaName, code, validation, timestamp }
```

### 4.3 Se a chamada der erro (catch)

```
return {
  code: "// Erro ao gerar código: AI API error: 401",
  validation: { valid: false, errors: ["AI API error: 401"], rulesPassed: 0, totalRules: 8 }
}
```

**PONTO CRÍTICO:** Erro de API vira "código" e segue no pipeline. Stage 1 sempre retorna um array de 4 objetos (ou 1 no modo direto). Nunca interrompe.

---

## PASSO 5 — Stage 2: Avaliação

**Função:** `stage2Evaluation(generations)`  

Recebe as 4 (ou 1) "propostas" — que podem ser mensagens de erro.

```
1. Monta prompt com TODAS as propostas (incluindo "// Erro ao gerar...")
2. callLovableAI(evaluatorPrompt, evaluationPrompt)
```

**Possível falha:**  
- 401/429/402 na chamada do avaliador → catch retorna fallback local:
  - ranking = índices ordenados por validation.valid (válidos primeiro)
  - evaluations = dados sintéticos baseados em validation
  - Continua sem quebrar.

```
3. Se LLM respondeu → parse JSON, ajusta ranking priorizando válidos
4. Retorna { evaluations, ranking, recommendation }
```

**Observação:** Mesmo com 4 códigos inválidos, Stage 2 conclui. O ranking pode ser [0,1,2,3] (todos inválidos) ou priorizar algum se houver.

---

## PASSO 6 — Stage 3: Síntese (Chairman)

**Função:** `stage3Synthesis(intent, generations, evaluation)`

### 6.1 Escolha do que sintetizar

```
validGenerations = generations.filter(g => g.validation?.valid)
codesToUse = validGenerations.length > 0 ? validGenerations : generations
```

Se as 4 personas falharam com 401 → `validGenerations = []` → `codesToUse = generations` (as 4 mensagens de erro).

### 6.2 Prompt ao Chairman

O Chairman recebe algo como:

```
=== Arquiteto Criativo (Score: N/A) ===
```vibecode
// Erro ao gerar código: AI API error: 401
```
=== Engenheiro Conservador ===
```vibecode
// Erro ao gerar código: AI API error: 401
```
...
```

### 6.3 Chamada ao LLM

```
callLovableAI(CHAIRMAN_PROMPT, synthesisPrompt)
```

**Possível falha:**  
- 401/429/402 → cai no catch.

### 6.4 Se a chamada der certo

```
finalCode = extrair bloco ```vibecode da resposta
validation = validatePERCode(finalCode)
```

O Chairman pode gerar algo inválido (sintetizando a partir de erros) → `validation.valid = false`.

Se `!validation.valid && validGenerations.length > 0`:  
- Fallback para a melhor proposta válida.  
Se TODAS falharam no Stage 1 → `validGenerations = []` → **não há fallback para proposta válida**.

### 6.5 Se a chamada der erro (catch)

```
bestValidIndex = evaluation.ranking.find(i => generations[i]?.validation?.valid)
bestIndex = bestValidIndex ?? evaluation.ranking?.[0] ?? 0
return {
  finalCode: generations[bestIndex]?.code || '// Erro na síntese',
  validation: generations[bestIndex]?.validation
}
```

Se as 4 propostas são mensagens de erro:  
- `generations[bestIndex].code` = "// Erro ao gerar código: AI API error: 401"  
- `generations[bestIndex].validation` = { valid: false, errors: ["AI API error: 401"] }  
- **stage3.validation.valid = false**  
- **stage3.finalCode = "// Erro ao gerar código: AI API error: 401"**

---

## PASSO 7 — Resposta retornada ao Frontend

**Estrutura:**

```json
{
  "conversationId": "...",
  "stage1": [{ code, validation }, ...],
  "stage2": { evaluations, ranking, recommendation },
  "stage3": {
    "finalCode": "// Erro ao gerar código: AI API error: 401",
    "validation": { "valid": false, "errors": ["AI API error: 401"] },
    "chairman": "fallback",
    "reasoning": "..."
  },
  "mode": "council"
}
```

O frontend recebe isso sem erro HTTP. A falha está nos dados, não na comunicação.

---

## PASSO 8 — Index.tsx setResults(response)

```
setResults(response)
setState("results")
toast.success("Código gerado pelo Council!")
```

O Index não checa `stage3.validation.valid`. Qualquer resposta 200 é tratada como sucesso.

---

## PASSO 9 — CouncilResults renderiza

**Arquivo:** `src/components/CouncilResults.tsx`  
**Props:** stage1, stage2, stage3, intent, conversationId

### 9.1 Decisão na aba "App"

```
stage3.validation.valid ?
  SIM → <GeneratedAppPreview vibeCode={stage3.finalCode} intent={...} />
  NÃO → <Card className="border-destructive">
          <CardTitle>VibeCode Inválido</CardTitle>
          {stage3.validation.errors.map(...)}
        </Card>
```

Com `stage3.validation.valid = false` → **exibe "VibeCode Inválido"** e lista de erros (ex: "Erro da API: 401").

---

## PASSO 10 — Se VibeCode fosse válido: DynamicAppPreview

**Arquivo:** `src/components/preview/DynamicAppPreview.tsx`

Só é montado quando `stage3.validation.valid === true`.

```
1. useEffect: se intent && vibeCode && !isGenerating → generateApp()
2. generateApp() → supabase.functions.invoke('generate-app', {
     body: { intent, vibeCode, type: 'generate' }
   })
3. generate-app (2º contexto LLM) gera código React
4. setGeneratedApp(data) → renderiza app no iframe
```

Como o fluxo quebrado nunca chega a ter VibeCode válido, este passo não é executado.

---

## ONDE O PROCESSO DÁ ERRADO — RESUMO

| Etapa | Onde falha | Efeito |
|-------|------------|--------|
| **4.1** | `LOVABLE_API_KEY` ausente/inválida | 401 em todas as chamadas LLM |
| **4.1** | Rate limit (429) ou créditos (402) | 401/429/402 em todas as chamadas |
| **4.3** | Catch transforma erro em "código" | "// Erro ao gerar código: ..." entra no pipeline |
| **5** | Stage 2 recebe propostas inválidas | Avaliação ocorre sobre erros; fallback local se Stage 2 falhar |
| **6** | Chairman recebe só mensagens de erro | Sintetiza lixo ou catch usa fallback |
| **6.5** | Fallback usa "melhor" proposta | Melhor = uma das mensagens de erro |
| **7** | Resposta com stage3.validation.valid = false | Dados inválidos retornados com HTTP 200 |
| **9** | CouncilResults checa stage3.validation.valid | Renderiza "VibeCode Inválido" |

A cadeia de falha é:

```
LOVABLE_API_KEY inválida/ausente
  → 401 em callLovableAI (Stage 1)
  → persona retorna "// Erro ao gerar código: AI API error: 401"
  → Stage 2 e 3 processam esses "códigos"
  → stage3.finalCode = mensagem de erro
  → stage3.validation.valid = false
  → CouncilResults exibe "VibeCode Inválido"
```

O "VibeCode Inválido" é o **sintoma final** de falha na autenticação com o LLM no início do pipeline.
