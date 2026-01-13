# Genesis Vision AI

Programação por intenção com LLM Council, VibeCode e geração automática de apps React.

Este repositório contém:
- Frontend React (Vite + TypeScript + shadcn-ui)
- Integração com Supabase (banco, Auth e Edge Functions)
- Funções `process-intent` e `generate-app` para orquestrar o Council e gerar código

Para entender o conceito e a arquitetura:
- Conceito: [`CONCEITO.md`](./CONCEITO.md)
- Análise de mocks: [`RELATORIO_MOCK_DATA.md`](./RELATORIO_MOCK_DATA.md)
- Plano de implementação: [`PLANO_IMPLEMENTACAO.md`](./PLANO_IMPLEMENTACAO.md)
- Resumo do plano: [`RESUMO_PLANO.md`](./RESUMO_PLANO.md)

---

## Requisitos

- Node.js 18+ (recomendado via nvm)
- npm (ou pnpm/yarn, se preferir adaptar os comandos)

---

## Configuração de ambiente

As variáveis de ambiente são carregadas via Vite e validadas em `src/lib/env.ts`.

Crie um arquivo `.env.local` na raiz do projeto com o seguinte conteúdo:

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sua-chave-publica

# Opcional: modo mock para desenvolvimento (usa dados locais em vez de chamar APIs)
VITE_USE_MOCK_DATA=false
```

Como obter as chaves no Supabase:
1. Acesse `https://app.supabase.com`
2. Selecione seu projeto
3. Vá em **Settings > API**
4. Copie:
   - `Project URL` → `VITE_SUPABASE_URL`
   - `anon public` key → `VITE_SUPABASE_PUBLISHABLE_KEY`

Se alguma variável estiver faltando ou inválida, o componente `EnvValidator` mostrará uma tela com instruções claras ao subir o app.

---

## Rodando o projeto localmente

```bash
# 1. Clonar o repositório
git clone <SEU_GIT_URL>
cd genesis-vision-ai

# 2. Instalar dependências
npm install

# 3. Configurar .env.local (veja seção acima)

# 4. Rodar ambiente de desenvolvimento
npm run dev
```

O servidor padrão do Vite foi configurado para rodar em `http://localhost:8080`.

---

## Supabase e Edge Functions

Este projeto usa Supabase para:
- Banco de dados (`conversations`, `council_results`, e futuras tabelas como `financial_data`, `app_states`, `intent_examples`)
- Edge Functions:
  - `process-intent`: orquestra o LLM Council e gera VibeCode
  - `generate-app`: gera/atualiza o código React com base na intenção e no VibeCode

Para rodar/localizar as functions:
- Código das functions: `supabase/functions/`
- Configuração: `supabase/config.toml`
- Migrações: `supabase/migrations/`

As funções esperam que os seguintes secrets estejam configurados no projeto Supabase (via Dashboard ou CLI):
- `LLM_PROVIDER` (`openai`, `openrouter`, `custom`, ou `lovable`)
- `LLM_API_KEY`
- `LLM_MODEL` (opcional, usa um padrão do provedor)
- `LLM_BASE_URL` (obrigatório para `custom`, opcional nos demais)
- `OPENROUTER_SITE_URL` e `OPENROUTER_APP_NAME` (opcionais para OpenRouter)
- `LOVABLE_API_KEY` (opcional, apenas se você usar `LLM_PROVIDER=lovable`)
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

Consulte `PLANO_IMPLEMENTACAO.md` para os detalhes da Fase 1 (Configuração) e Fase 2 (substituição de mocks).

---

## Tecnologias

- Vite + React + TypeScript
- Tailwind CSS + shadcn-ui + Radix UI
- Supabase (Postgres, Auth, Edge Functions)
- Multi-provider LLM (OpenAI, OpenRouter, endpoints customizados ou Lovable AI Gateway)

---

## Testes

O projeto inclui testes automatizados:

```bash
# Testes unitários (Vitest)
npm run test

# Testes com UI interativa
npm run test:ui

# Testes com cobertura
npm run test:coverage

# Testes E2E (Playwright)
npm run test:e2e

# Testes E2E com UI
npm run test:e2e:ui
```

## CI/CD

O projeto inclui pipelines GitHub Actions:
- `.github/workflows/ci.yml` - Lint, testes, build e deploy
- `.github/workflows/supabase-migrations.yml` - Migrações do Supabase

## Próximos passos de desenvolvimento

O plano de evolução do projeto está descrito em:
- [`PLANO_IMPLEMENTACAO.md`](./PLANO_IMPLEMENTACAO.md)
- [`RESUMO_PLANO.md`](./RESUMO_PLANO.md)

**Status das fases:**
- ✅ Fase 1: Configuração e setup (env, Supabase, documentação)
- ✅ Fase 2: Substituição de dados mockados críticos
- ✅ Fase 3: Autenticação e segurança (Auth + RLS)
- ✅ Fase 4: Melhorias de UX
- ✅ Fase 5: Testes (unitários, integração, E2E)
- ✅ Fase 6: Performance e observabilidade
- ✅ Fase 7: Deploy e CI/CD

Use esses arquivos como guia para priorizar as próximas tarefas.
