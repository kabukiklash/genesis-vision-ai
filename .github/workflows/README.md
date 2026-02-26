# CI/CD Pipeline Documentation

## Overview

Esta pasta contém workflows do GitHub Actions que automatizam:

- ✅ Testes unitários
- ✅ Validação de código (ESLint)
- ✅ Build de produção
- ✅ Testes E2E
- ✅ Coverage reports

## Workflows

### ci.yml

**Triggered quando:**
- Push para `main` ou `development`
- Pull request para `main` ou `development`

**O que faz:**
1. **lint** – Instala dependências, roda ESLint
2. **test** – Testes unitários (Vitest), gera coverage report, envia para Codecov
3. **build** – Build para produção (Vite), salva artifact
4. **e2e** – Testes E2E com Playwright (opcional, `continue-on-error: true`)
5. **deploy-preview** – Em pull requests (placeholder para Vercel/Netlify)
6. **deploy-production** – Em push para `main` (placeholder)

**Tempo de execução:** ~5-10 minutos

**Resultado:**
- ✅ Se tudo passar: pode fazer merge
- ❌ Se lint/test/build falhar: pipeline falha, não pode fazer merge
- ⚠️ E2E pode falhar sem bloquear (continue-on-error)

### Como adicionar nova action

1. Criar arquivo: `.github/workflows/novo-workflow.yml`
2. Documentar neste README
3. Testar em branch novo
4. Fazer PR com workflow

## Status

Check: https://github.com/GenesisVision/genesis-vision-ai/actions

## Troubleshooting

### Testes falhando no CI mas passando local?

1. Verificar Node version: `node --version` (CI usa Node 20)
2. Executar: `npm ci` em vez de `npm install`
3. Limpar: `rm -rf node_modules package-lock.json && npm ci`

### Build falhando?

1. Ver logs completos no GitHub Actions
2. Replicar localmente: `npm run build`
3. Verificar variáveis de ambiente (não são usadas no build atual)
4. Verificar que todas dependências estão em package.json

### E2E tests muito lentos ou falhando?

1. E2E usa `continue-on-error: true` – não bloqueia o pipeline
2. Baixar o artifact `playwright-report` para ver o relatório
3. Rodar localmente: `npm run test:e2e`

## Secrets necessários

Para alguns deploys (Vercel, Netlify etc.), adicionar em **Settings → Secrets and variables → Actions**:

| Secret | Uso |
|--------|-----|
| `SUPABASE_URL` | URL do projeto Supabase |
| `SUPABASE_ANON_KEY` | Chave pública Supabase |
| `LOVABLE_API_KEY` | Chave da Lovable AI (se usar) |
| `CODECOV_TOKEN` | Token do codecov.io (opcional) |

**NUNCA commitar secrets em código!**
