# RELATÓRIO DE AUDITORIA MILITAR — ERRO "VIBECODE INVÁLIDO"

**Classificação:** ANÁLISE FUNDAMENTALISTA — SEM CORREÇÕES  
**Data:** 27/02/2026  
**Sistema:** Genesis Vision v1.0  
**Foco:** Etapa de geração do VibeCode (causa raiz do sintoma "VibeCode Inválido")  
**Premissa validada:** A lógica de processamento de estágios e a UI estão corretas; o problema está na camada de geração.

---

## I. SUMÁRIO EXECUTIVO

O sintoma **"VibeCode Inválido"** apresentado ao usuário **não é falha do parser, validação ou UI**. É consequência direta de falha na **camada de comunicação com o serviço de LLM** (Lovable AI Gateway). O relatório do Perplexity indica **401 Unauthorized em 100% das requisições** à API de LLMs. Esta auditoria confirma que a arquitetura de geração do VibeCode está correta, mas **o pipeline é vulnerável a falhas de autenticação, rate limit e créditos**, que se propagam como "código inválido" até a interface.

---

## II. MAPEAMENTO DO FLUXO DE GERAÇÃO DO VIBECODE

### 2.1 Pipeline Completo (Sem Código)

```
[Usuário] → IntentInput ("Gerar Código")
      ↓
[api.ts] processIntent(intent, { skipCouncil })
      ↓
[Supabase] Edge Function: process-intent
      ↓
      ├─ Council ON  → Stage 1 (4 personas) → Stage 2 (avaliação) → Stage 3 (Chairman) → 6 chamadas LLM
      └─ Council OFF → directGeneration() → 1 chamada LLM
      ↓
[callLovableAI()] → fetch(https://ai.gateway.lovable.dev/v1/chat/completions)
      ↓
[Headers] Authorization: Bearer ${LOVABLE_API_KEY}
      ↓
[Resposta LLM] → Extração de bloco ```vibecode → validatePERCode() → Resposta JSON
      ↓
[CouncilResults] → stage3.validation.valid ?
      ├─ TRUE  → GeneratedAppPreview (vibeCode utilizado)
      └─ FALSE → "VibeCode Inválido" + stage3.validation.errors
```

### 2.2 Pontos de Falha (Single Points of Failure)

| # | Componente | Variável Crítica | Efeito se Falhar |
|---|------------|------------------|------------------|
| 1 | **Secrets Supabase** | `LOVABLE_API_KEY` | `undefined` → `Bearer undefined` → **401** |
| 2 | **Lovable API** | Auth, rate limit, créditos | 401, 429, 402 → Exceção em `callLovableAI` |
| 3 | **Stage 1 catch** | Erro não interrompe pipeline | Erro vira "código": `// Erro ao gerar código: AI API error: 401` |
| 4 | **Stage 2/3** | Recebem "códigos" de erro | Chairman sintetiza lixo → `validatePERCode` falha |
| 5 | **Fallback Stage 3** | Usa "melhor" de gerações | Se todas falharam, "melhor" = mensagem de erro |

---

## III. ANÁLISE DA CAUSA RAIZ — POR QUE O VIBECODE FICA INVÁLIDO?

### 3.1 Propagação em Cascata (Chain of Failures)

1. **Stage 1 — Geração paralela (4 personas)**
   - Cada persona chama `callLovableAI(systemPrompt, userPrompt)`.
   - Se **qualquer** falha de API ocorre (401, 429, 402, 500):
     - `callLovableAI` lança `throw new Error(\`AI API error: ${response.status}\`)`.
     - O `catch` em `stage1Generation` **não propaga** o erro.
     - Retorna objeto: `{ code: "// Erro ao gerar código: AI API error: 401", validation: { valid: false, errors: [...] } }`.
   - Ou seja: **erro de API vira string de "código"** e segue no pipeline.

2. **Stage 2 — Avaliação**
   - Recebe as 4 "propostas" (que podem ser 4 mensagens de erro).
   - Chama `callLovableAI` para avaliar. Se essa chamada falhar (ex.: 401), `stage2Evaluation` usa fallback local (ranking por validação) e **continua**.
   - Envia ao Stage 3 as mesmas entradas, incluindo códigos de erro.

3. **Stage 3 — Síntese**
   - Chairman recebe "propostas" que podem ser `// Erro ao gerar código: AI API error: 401`.
   - Tenta sintetizar um VibeCode a partir disso → gera texto inválido.
   - `validatePERCode(finalCode)` falha (PER-001, PER-002, etc.).
   - Se existir ao menos uma proposta válida → fallback para a melhor.
   - Se **todas** falharam no Stage 1 → fallback retorna uma delas → `finalCode = "// Erro ao gerar código: AI API error: 401"`.

4. **Resposta ao frontend**
   - `stage3.validation.valid = false`.
   - `stage3.validation.errors` contém PER-* e/ou mensagem de API.
   - UI exibe **"VibeCode Inválido"** com lista de erros.

**Conclusão:** O "VibeCode Inválido" é o **sintoma final** de falha na camada LLM. O fluxo foi desenhado para **nunca interromper** e sempre retornar algo; erros de API são tratados como "código ruim" e passam até o fim.

### 3.2 Assimetria Crítica: process-intent vs generate-app

| Aspecto | process-intent | generate-app |
|---------|----------------|---------------|
| Verifica `LOVABLE_API_KEY` antes de usar? | ❌ **NÃO** | ✅ Sim (`if (!LOVABLE_API_KEY) throw`) |
| Comportamento se key ausente | Usa `Bearer undefined` → **401** | Falha imediata com mensagem clara |
| Tratamento de 401/429/402 | Silencioso no Stage 1 (catch) | Retry + resposta HTTP explícita |

O `process-intent` **não valida** a existência de `LOVABLE_API_KEY`. Se o secret não estiver configurado no Supabase, `Deno.env.get('LOVABLE_API_KEY')` retorna `undefined`. O header fica `Authorization: Bearer undefined` e a Lovable rejeita com **401 Unauthorized**.

### 3.3 Origem da LOVABLE_API_KEY

- **Local (.env):** O `.env` do projeto **não contém** `LOVABLE_API_KEY` (apenas variáveis `VITE_*` e Sentry).
- **Edge Functions:** Usam `Deno.env.get('LOVABLE_API_KEY')`, alimentado por **Supabase Secrets**.
- **Configuração esperada:** `npx supabase secrets set LOVABLE_API_KEY=sua_chave_aqui`
- **Fonte da chave:** https://lovable.dev → conta → API / Integrations

**Risco:** Se o secret não foi configurado (ou o projeto Supabase estiver incorreto), **100% das chamadas** falham com 401, coerente com o relatório do Perplexity.

---

## IV. DIAGNÓSTICO POR TIPO DE ERRO

### 4.1 401 Unauthorized (Prioridade do Perplexity)

- **Causas prováveis:** API key ausente, inválida, expirada ou mal formatada.
- **Onde verificar:** Supabase Dashboard → Project Settings → Edge Functions → Secrets.
- **Evidência no código:** Nenhuma validação de `LOVABLE_API_KEY` em `process-intent`; uso direto em `Authorization: Bearer ${LOVABLE_API_KEY}`.

### 4.2 429 Too Many Requests (Já documentado em AUDITORIA_GERAR_CODIGO.md)

- **Causa:** 4 chamadas paralelas no Stage 1 podem exceder RPM do tier gratuito (ex.: ~15 RPM no Gemini).
- **Propagação:** Igual à do 401 — vira "código" de erro e resulta em "VibeCode Inválido".
- **Observação:** Documento de auditoria menciona mitigação (sequência com delay); confirmar se ainda está aplicada no código atual.

### 4.3 402 Payment Required

- **Causa:** Créditos Lovable esgotados.
- **Tratamento no CouncilResults:** Mensagem específica e guia para adicionar créditos.
- **Propagação:** Mesmo padrão dos demais — falha vira "código" inválido.

### 4.4 Outros 4xx/5xx

- **Comportamento:** Qualquer `!response.ok` em `callLovableAI` gera exceção.
- **Mensagem:** `AI API error: ${response.status}` (corpo da resposta não é exposto ao parser).
- **Resultado:** Mesma cascata até "VibeCode Inválido".

---

## V. VALIDAÇÃO DO VIBECODE — O QUE NÃO É O PROBLEMA

A validação em `validatePERCode` (regras PER-001 a PER-008) está **correta** e necessária:

- PER-001: workflow  
- PER-002: type  
- PER-003: retention  
- PER-004: estados (CANDIDATE, RUNNING, COOLING, DONE, ERROR)  
- PER-005: comandos passivos  
- PER-006: friction 0–100  
- PER-007: handlers `on EVENTO`  
- PER-008: sem lógica ativa (if, for, cell, trigger, etc.)

O parser (`parseVibeCode`) e o interpretador são usados **após** obter VibeCode válido. O problema ocorre **antes**: o LLM nunca entrega VibeCode válido porque a chamada à API falha ou retorna erro.

---

## VI. CONFIGURAÇÃO E AMBIENTE

### 6.1 Projeto Supabase

- **Frontend (.env):** `VITE_SUPABASE_PROJECT_ID="zquhibncpluvnqcdlipg"`  
- **config.toml:** `project_id = "poqeroefputjfikzutxw"`  

**Divergência:** IDs diferentes. O frontend usa `zquhibncpluvnqcdlipg`; o `config.toml` pode representar outro projeto. Isso pode levar a:
- Deploy de Edge Functions em projeto diferente do que o frontend usa.
- Secrets configurados em um projeto, mas funções rodando em outro.

### 6.2 Autenticação no Frontend

- `processIntent()` envia `Authorization: Bearer ${session.access_token}` quando há sessão.
- Esse token é JWT do Supabase Auth (usuário), **não** a chave Lovable.
- A Lovable é chamada somente no backend; a chave nunca vai para o frontend.

---

## VII. PLANO DE AÇÃO — AVALIAÇÃO (SEM IMPLEMENTAÇÃO)

### PRIORIDADE 1 — IMEDIATO (Verificação)

| # | Ação | Objetivo | Critério de Sucesso |
|---|------|----------|---------------------|
| 1 | Verificar status do backend em localhost (se aplicável) | Confirmar que Edge Functions sobem corretamente | `supabase functions serve` sem erros |
| 2 | Validar `LOVABLE_API_KEY` nos Supabase Secrets | Garantir chave presente e correta | Dashboard → Secrets → `LOVABLE_API_KEY` existe e não está vazia |
| 3 | Validar headers de autenticação | Confirmar uso correto da chave | Log (ou teste) mostrando `Authorization: Bearer [chave válida]` (sem expor a chave) |
| 4 | Verificar rate limits e quotas | Evitar 429 por uso excessivo | Documentação Lovable/Gemini e comportamento em Stage 1 |

### PRIORIDADE 2 — 24 HORAS (Observabilidade)

| # | Ação | Objetivo | Critério de Sucesso |
|---|------|----------|---------------------|
| 5 | Implementar logging detalhado de request/response | Rastrear status HTTP e corpo de erro | Logs com status, URL, e trecho seguro do erro |
| 6 | Adicionar retry com exponential backoff | Reduzir falhas transitórias (429, 5xx) | Política de retry definida e documentada |
| 7 | Criar fallback para LLM alternativo | Continuar operação se Lovable falhar | Lista de provedores alternativos e critério de fallback |
| 8 | Adicionar health checks periódicos | Detectar indisponibilidade antes do uso | Endpoint ou job que valida conectividade com Lovable |

### PRIORIDADE 3 — 72 HORAS (Resiliência)

| # | Ação | Objetivo | Critério de Sucesso |
|---|------|----------|---------------------|
| 9 | Implementar fallback para LLM local (ex.: Ollama) | Operação offline ou sem dependência de nuvem | Documentação e rota de fallback testada |
| 10 | Cache de respostas | Reduzir chamadas repetidas e custo | Política de cache (TTL, invalidação) definida |
| 11 | Melhorar tratamento 401 vs outros 4xx | Mensagens específicas e ações corretivas | 401 → “Chave inválida ou ausente”; 429 → “Limite excedido”; etc. |
| 12 | Dashboard de monitoramento de API | Visibilidade operacional | Métricas de sucesso/falha e status por provider |

### PRIORIDADE 4 — CORREÇÃO ESTRUTURAL (Não codar ainda)

| # | Ação | Objetivo | Observação |
|---|------|----------|------------|
| 13 | Alinhar `project_id` (config.toml x .env) | Evitar deploy/secret em projeto errado | Decidir projeto canônico e atualizar configs |
| 14 | Replicar validação de `LOVABLE_API_KEY` do generate-app no process-intent | Falha rápida e mensagem clara se key ausente | Fail-fast na inicialização da função |
| 15 | Avaliar early-exit em Stage 1 | Não prosseguir se todas as personas falharem | Evitar que erros de API sejam tratados como “propostas” |

---

## VIII. CONCLUSÃO

**Status:** 🔴 SISTEMA CRÍTICO (conforme Perplexity)

O Genesis Vision tem uma **falha de autenticação/configuração na camada de API de LLMs** que torna a geração de VibeCode inviável quando:

1. `LOVABLE_API_KEY` não está configurada ou está incorreta → 401 em todas as chamadas.
2. Rate limit ou créditos são excedidos → 429/402.
3. Qualquer falha é absorvida pelo pipeline e se manifesta como "VibeCode Inválido".

**Ação recomendada:** Pausar operações até concluir as verificações da Prioridade 1 (especialmente item 2 — validação de `LOVABLE_API_KEY`) e, em seguida, executar o plano de prioridades 2 e 3 conforme a capacidade da equipe.

**Resultado da auditoria:** ⚠️ FALHA CRÍTICA NA CAMADA LLM IDENTIFICADA  
**Próximo passo:** Executar itens do Plano de Ação em ordem de prioridade; nenhuma alteração de código até validação da causa raiz (401, 429, 402).

---

*Relatório compilado por auditoria automatizada. Sem alterações de código aplicadas.*
