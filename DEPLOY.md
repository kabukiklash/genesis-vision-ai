# Guia de Deploy - Genesis Vision AI

Este documento descreve o processo de deploy do Genesis Vision AI para produção.

## Pré-requisitos

1. Conta no Supabase com projeto criado
2. Conta no GitHub para CI/CD
3. Serviço de hospedagem para frontend (Vercel, Netlify, etc.)
4. Variáveis de ambiente configuradas

## 1. Configuração do Supabase

### 1.1 Secrets das Edge Functions

Configure os seguintes secrets no Supabase Dashboard:

1. Acesse: **Project Settings > Edge Functions > Secrets**
2. Adicione:
   - `LOVABLE_API_KEY`: Sua chave da API Lovable
   - `SUPABASE_URL`: URL do seu projeto Supabase
   - `SUPABASE_ANON_KEY`: Chave anon do Supabase

### 1.2 Aplicar Migrações

```bash
# Via CLI do Supabase
supabase db push

# Ou via Dashboard: SQL Editor > executar migrações manualmente
```

### 1.3 Deploy das Edge Functions

```bash
# Deploy de todas as functions
supabase functions deploy

# Ou deploy individual
supabase functions deploy process-intent
supabase functions deploy generate-app
```

## 2. Configuração do Frontend

### 2.1 Variáveis de Ambiente

Configure as seguintes variáveis no seu serviço de hospedagem:

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sua-chave-publica
VITE_USE_MOCK_DATA=false
```

### 2.2 Build

```bash
npm install
npm run build
```

O build será gerado em `dist/`.

## 3. Deploy no Vercel

### 3.1 Via Dashboard

1. Conecte seu repositório GitHub ao Vercel
2. Configure as variáveis de ambiente
3. Deploy automático será feito via GitHub Actions

### 3.2 Via CLI

```bash
npm i -g vercel
vercel --prod
```

## 4. Deploy no Netlify

### 4.1 Via Dashboard

1. Conecte seu repositório GitHub ao Netlify
2. Configure:
   - Build command: `npm run build`
   - Publish directory: `dist`
3. Adicione variáveis de ambiente

### 4.2 Via CLI

```bash
npm i -g netlify-cli
netlify deploy --prod
```

## 5. CI/CD com GitHub Actions

### 5.1 Secrets do GitHub

Configure os seguintes secrets no GitHub (Settings > Secrets):

- `SUPABASE_ACCESS_TOKEN`: Token de acesso do Supabase
- `SUPABASE_DB_URL`: URL de conexão do banco
- `SUPABASE_DB_PASSWORD`: Senha do banco
- `VERCEL_TOKEN` (opcional): Para deploy automático no Vercel
- `VERCEL_ORG_ID` (opcional)
- `VERCEL_PROJECT_ID` (opcional)

### 5.2 Workflows

Os workflows já estão configurados em:
- `.github/workflows/ci.yml` - Pipeline principal
- `.github/workflows/supabase-migrations.yml` - Migrações automáticas

### 5.3 Ativar Workflows

1. Vá em **Actions** no GitHub
2. Ative os workflows se necessário
3. Os workflows rodarão automaticamente em push/PR

## 6. Verificação Pós-Deploy

### 6.1 Checklist

- [ ] Frontend acessível e carregando
- [ ] Variáveis de ambiente configuradas
- [ ] Autenticação funcionando
- [ ] Edge Functions respondendo
- [ ] Banco de dados com migrações aplicadas
- [ ] RLS configurado corretamente
- [ ] Testes passando no CI

### 6.2 Testes de Produção

```bash
# Testar autenticação
# Testar geração de código
# Testar preview de apps
# Verificar logs de erro
```

## 7. Monitoramento

### 7.1 Logs

- **Supabase**: Dashboard > Logs
- **Vercel/Netlify**: Dashboard > Functions/Logs
- **GitHub Actions**: Actions > Workflow runs

### 7.2 Erros

Configure integração com Sentry (opcional) para monitoramento de erros:

```bash
npm install @sentry/react
```

## 8. Rollback

### 8.1 Frontend

```bash
# Vercel
vercel rollback

# Netlify
# Via Dashboard: Deploys > selecionar deploy anterior > Publish deploy
```

### 8.2 Supabase

```bash
# Reverter migração
supabase migration repair --status reverted <migration_id>
```

## 9. Troubleshooting

### Problema: Variáveis de ambiente não carregam

**Solução**: Verifique se as variáveis começam com `VITE_` no frontend.

### Problema: Edge Functions retornam erro

**Solução**: 
1. Verifique logs no Supabase Dashboard
2. Confirme que os secrets estão configurados
3. Teste localmente com `supabase functions serve`

### Problema: RLS bloqueando requisições

**Solução**:
1. Verifique políticas RLS no Supabase
2. Confirme que usuário está autenticado
3. Teste com usuário de teste

## 10. Próximos Passos

Após deploy bem-sucedido:

1. Configure domínio customizado
2. Configure SSL/HTTPS
3. Configure CDN (se necessário)
4. Configure monitoramento de performance
5. Configure alertas de erro

---

**Nota**: Este guia assume que você já tem as credenciais necessárias. Se precisar de ajuda com configuração inicial, consulte o README.md principal.
