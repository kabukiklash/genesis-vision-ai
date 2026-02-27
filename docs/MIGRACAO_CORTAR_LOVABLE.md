# Migração: Cortar Lovable e Usar Outra API

Plano para substituir a dependência do Lovable por outra API de LLM.

---

## Objetivo

Remover `LOVABLE_API_KEY` e `https://ai.gateway.lovable.dev`, usando em seu lugar uma API configurável via variáveis de ambiente.

---

## Padrão: OpenAI direta (sem OpenRouter)

| Provedor | URL | Modelo padrão |
|----------|-----|---------------|
| **OpenAI** (padrão) | `https://api.openai.com/v1/chat/completions` | `gpt-4o-mini` |

Configure apenas `LLM_API_KEY` com sua chave OpenAI. Sem intermediários.

---

## Escopo da Mudança

### Arquivos a alterar

| Arquivo | O que mudar |
|---------|-------------|
| `supabase/functions/process-intent/index.ts` | `callLovableAI` → função genérica com URL/key configuráveis |
| `supabase/functions/generate-app/index.ts` | `fetch` direto → usar mesma URL/key configuráveis |
| `docs/DEPLOY_EDGE_FUNCTIONS.md` | Documentar novos secrets |
| `README.md` | Atualizar instruções de configuração |

### Nova configuração (Secrets)

| Secret | Descrição | Exemplo |
|--------|-----------|---------|
| `LLM_API_KEY` | Chave de autenticação | Chave OpenAI (sk-...) |
| `LLM_API_URL` | URL (opcional) | Default: `https://api.openai.com/v1/chat/completions` |
| `LLM_MODEL` | Modelo (opcional) | Default: `gpt-4o-mini` |

### Fallback para compatibilidade

Se `LLM_API_KEY` não existir, pode-se manter suporte a `LOVABLE_API_KEY` como fallback (ou remover completamente).

---

## Implementação

### 1. Helper compartilhado (novo arquivo)

**Arquivo:** `supabase/functions/_shared/llm.ts`

```
- Ler LLM_API_URL (ou default OpenAI)
- Ler LLM_API_KEY (obrigatório ou fallback LOVABLE_API_KEY)
- Ler LLM_MODEL (ou default google/gemini-2.5-flash)
- Função callLLM(systemPrompt, userPrompt): Promise<string>
- Mesmo contrato que callLovableAI
- Validar API_KEY antes de chamar (fail-fast)
```

### 2. process-intent/index.ts

- Remover `callLovableAI`
- Importar `callLLM` de `_shared/llm.ts`
- Substituir todas as chamadas
- Validar `LLM_API_KEY` no início do handler

### 3. generate-app/index.ts

- Remover `LOVABLE_API_KEY` e URL hardcoded
- Usar `callLLM` ou o mesmo helper
- generate-app usa tools — o helper precisa suportar `tools` e `tool_choice`

### 4. Obter chave OpenAI

1. Acessar https://platform.openai.com/api-keys
2. Criar conta / fazer login
3. Create new secret key
4. Copiar a chave (sk-...)
5. `npx supabase secrets set LLM_API_KEY=sk-...`

Opcional: `LLM_MODEL=gpt-4o` para modelo mais capaz.

---

## Checklist de Migração

- [x] Criar `supabase/functions/_shared/llm.ts`
- [x] Atualizar `process-intent/index.ts` para usar `callLLM`
- [x] Atualizar `generate-app/index.ts` para usar `callLLM` (com suporte a tools)
- [ ] Configurar secrets no Supabase (`LLM_API_KEY`, etc.)
- [ ] Deploy das Edge Functions
- [ ] Testar fluxo completo (Gerar Código → VibeCode válido → Gerar App)

**Nota:** `LOVABLE_API_KEY` permanece como fallback opcional.

---

## Formato de resposta

OpenAI usa o mesmo formato que Lovable (chat completions):

```json
{
  "choices": [{ "message": { "content": "..." } }]
}
```

Não é necessário alterar o parsing da resposta.
