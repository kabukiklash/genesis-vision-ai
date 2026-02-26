# Auditoria: Fluxo "Gerar Código"

## Objetivo

Documentar o fluxo completo para entender onde o erro 429 ocorre e qual a relação com banco de dados, APIs e componentes.

---

## 1. Visão geral do fluxo

```
[IntentInput] → usuário clica "Gerar Código"
       ↓
[Index.tsx] handleSubmit(intent)
       ↓
[api.ts] processIntent(intent, { skipCouncil })
       ↓
[Supabase Edge Function] process-intent
       ↓
   ┌── Council ON  → Stage 1 (4 paralelo) → Stage 2 → Stage 3 → 6 chamadas IA
   └── Council OFF → directGeneration()   → 1 chamada IA
       ↓
[Banco] conversations + council_results (Supabase)
       ↓
[Index] setResults(response) → CouncilResults
       ↓
[CouncilResults] → GeneratedAppPreview (se VibeCode válido) OU "VibeCode Inválido"
```

---

## 2. Componentes e responsabilidades

### Frontend

| Arquivo | Função |
|---------|--------|
| `src/components/IntentInput.tsx` | Campo de texto, botão "Gerar Código", exemplos rápidos |
| `src/pages/Index.tsx` | Orquestra: chama `processIntent`, gerencia estado (input/loading/results), toggle Council |
| `src/lib/api.ts` | `processIntent()` → `supabase.functions.invoke('process-intent', ...)` |
| `src/integrations/supabase/client.ts` | Cliente Supabase (URL/KEY do `.env`) |
| `src/components/CouncilResults.tsx` | Exibe Stage 1/2/3, App preview ou "VibeCode Inválido" |
| `src/components/GeneratedAppPreview.tsx` | Wrapper para DynamicAppPreview |
| `src/components/preview/DynamicAppPreview.tsx` | Preview do app, botão "Gerar App" (chama Edge Function `generate-app`) |

### Backend (Edge Functions)

| Função | O que faz |
|--------|-----------|
| `process-intent` | Recebe intent, cria conversation, executa Council (4 personas + eval + synthesis) ou modo direto |
| `generate-app` | Gera app final a partir do VibeCode (chamado ao clicar "Gerar App") |

### Banco de dados

| Tabela | Uso |
|--------|-----|
| `conversations` | Uma linha por intenção (intent, status, user_id) |
| `council_results` | Três linhas por conversation (stage 1, 2, 3) com os resultados em JSONB |
| `intent_examples` | Exemplos de intenções (ex.: "Sistema de gestão de vendas...") |

**Supabase vs Lovable Cloud:** O `.env` aponta para Supabase (`VITE_SUPABASE_URL`). Projetos no Lovable Cloud usam Supabase internamente. O print com 57 conversations e 167 council_results pode ser do mesmo projeto Supabase ou de outro (Lovable cria instância própria).

---

## 3. Detalhamento da Edge Function `process-intent`

### Modo Council (4 personas em paralelo)

1. **Stage 1 – Geração**  
   - `stage1Generation()` executa `PERSONAS.map()` com `Promise.all`
   - **4 chamadas simultâneas** para `callAI()` (Gemini ou Lovable)
   - Cada persona: Arquiteto Criativo, Engenheiro Conservador, Otimizador de Performance, Arquiteto de Resiliência

2. **Stage 2 – Avaliação**  
   - `stage2Evaluation()` faz **1 chamada** a `callAI()` para avaliar as 4 propostas

3. **Stage 3 – Síntese**  
   - `stage3Synthesis()` faz **1 chamada** a `callAI()` para o Chairman gerar o código final

**Total Council:** **6 chamadas** à API de IA (4 paralelas + 1 + 1)

### Modo Direto (Council desligado)

- `directGeneration()` faz **1 chamada** a `callAI()`

### Persistência

- Cria 1 registro em `conversations`
- Cria 3 registros em `council_results` (stage 1, 2, 3)
- Usa `user_id` quando o usuário está logado

---

## 4. Análise do erro 429

### O que aconteceu

1. As **4 propostas do Stage 1 falharam** com `Gemini API error: 429`
2. Cada persona retornou `// Erro ao gerar código: Gemini API error: 429`
3. Stage 2 e 3 foram executados, mas receberam “código” de erro em vez de VibeCode válido
4. O Chairman gerou um “VibeCode” a partir desses erros → inválido
5. A UI exibiu "VibeCode Inválido" e "Erro 429: Rate limit excedido"

### Causa raiz

- **429 Too Many Requests** = limite de requisições da API atingido  
- Gemini (tier gratuito) tem limites como:
  - ~15 RPM (requests per minute)
  - ~1 500 tokens/min  
- **4 requisições em paralelo no Stage 1** podem exceder o limite de uma vez
- Ou vários testes seguidos esgotaram a cota do minuto

### Conclusão

O problema vem **da API Gemini**, não da lógica interna do app ou do banco. O fluxo de negócio está correto; o gargalo é o rate limit do provedor de IA.

---

## 5. Diagrama de chamadas à API

```
Council ON:
  t=0s    → 4x callAI() em paralelo (Stage 1)
  t=~5s   → 1x callAI() (Stage 2)
  t=~10s  → 1x callAI() (Stage 3)

Se 4 requisições no mesmo segundo excederem o RPM do Gemini → 429
```

---

## 6. Mitigação implementada (429)

**Alteração em `process-intent`:** Stage 1 passou a executar as 4 personas **em sequência** com 2,5 s de delay entre cada chamada, em vez de 4 em paralelo. Isso distribui as requisições no tempo e evita estourar o rate limit do Gemini (15 RPM no tier gratuito).

- Antes: 4 requisições no mesmo momento → 429  
- Depois: 4 requisições ao longo de ~10 s → tende a respeitar o limite

---

## 7. Relação com o banco (Lovable Cloud)

- Lovable Cloud usa Supabase por baixo; as tabelas `conversations` e `council_results` seguem o mesmo modelo  
- O Genesis Vision pode estar conectado a:
  - Um projeto Supabase standalone (ex.: `zquhibncpluvnqcdlipg`), ou  
  - Um Supabase gerenciado pelo Lovable Cloud  
- Os 57 conversations e 167 council_results indicam execuções anteriores do fluxo; os erros 429 não alteram a escrita no banco — a conversa e os resultados são gravados mesmo quando a IA falha.
