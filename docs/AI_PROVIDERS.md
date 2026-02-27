# Provedores de IA - Genesis Vision

Suporta **OpenAI** e **Anthropic (Claude)**. Configure via `LLM_PROVIDER`.

## Configuração

| Secret | Obrigatório | Descrição |
|--------|-------------|-----------|
| `LLM_PROVIDER` | Não | `openai` (default) ou `anthropic` |
| `LLM_API_KEY` | Sim* | Chave da API (OpenAI ou Anthropic) |
| `LLM_MODEL` | Não | Modelo (ver abaixo) |

\* Fallback: `ANTHROPIC_API_KEY` ou `LOVABLE_API_KEY`

## Anthropic (Claude)

1. https://console.anthropic.com → API Keys
2. Criar chave
3. Configurar secrets:
```bash
npx supabase secrets set LLM_PROVIDER=anthropic
npx supabase secrets set LLM_API_KEY=sk-ant-...
```
4. Modelo default: `claude-haiku-4-5` (Claude Haiku 4.5 — rápido e econômico)

## OpenAI

1. https://platform.openai.com/api-keys
2. `npx supabase secrets set LLM_PROVIDER=openai` (ou omitir)
3. `npx supabase secrets set LLM_API_KEY=sk-...`
4. Modelo default: `gpt-4o-mini`
