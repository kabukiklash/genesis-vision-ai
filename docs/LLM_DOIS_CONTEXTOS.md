# LLM — Dois Contextos de Uso

Referência rápida dos dois contextos em que o LLM é usado no Genesis Vision.

---

## Visão Geral

O LLM (Lovable AI Gateway / Gemini) é usado em **dois contextos distintos**:

| # | Contexto | Edge Function | O que gera |
|---|----------|---------------|------------|
| 1 | Conselho / Modo Direto | `process-intent` | **VibeCode** (linguagem declarativa de estados) |
| 2 | Geração do App | `generate-app` | **Código React/TSX** |

Ambos usam a mesma configuração: `LLM_API_KEY` (+ `LLM_API_URL`, `LLM_MODEL`). Fallback: `LOVABLE_API_KEY`.

---

## Contexto 1 — Geração do VibeCode

**Função:** `process-intent`  
**Entrada:** Intenção do usuário (ex: "Sistema de gestão de vendas")  
**Saída:** VibeCode (workflow, type, retention, `on EVENTO { set state = ... }`)

### Council ON (6 chamadas LLM)

- **Stage 1:** 4 personas em paralelo → 4 chamadas
- **Stage 2:** Avaliação cruzada → 1 chamada
- **Stage 3:** Chairman sintetiza → 1 chamada

### Council OFF (1 chamada LLM)

- `directGeneration()` → 1 chamada direta

---

## Contexto 2 — Geração do App React

**Função:** `generate-app`  
**Entrada:** Intent + VibeCode (resultado do Contexto 1)  
**Saída:** Código TSX completo (componentes React, shadcn/ui, etc.)

- Usa o VibeCode para orientar estados da UI (CANDIDATE, RUNNING, COOLING, DONE, ERROR)
- Pode usar tools (function calling) para retornar código estruturado

---

## Fluxo Completo

```
[Intenção do usuário]
        ↓
  process-intent (LLM)  ←── Contexto 1: gera VibeCode
        ↓
     VibeCode
        ↓
  generate-app (LLM)    ←── Contexto 2: gera app React
        ↓
  Código React/TSX
```

---

## Nota

Se `LLM_API_KEY` (ou `LOVABLE_API_KEY`) falhar (401, 429, 402), **ambos os contextos** param. O erro no Contexto 1 propaga como "VibeCode Inválido"; o Contexto 2 nem é chamado se não houver VibeCode válido.
