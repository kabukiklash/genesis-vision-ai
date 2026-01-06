# Plano de Implementação - Genesis Vision AI

**Data de Criação**: Janeiro 2025  
**Versão**: 1.0  
**Status**: Planejamento

---

## 📋 Visão Geral

Este plano de implementação visa transformar a aplicação Genesis Vision AI de um MVP criado em Lovable para uma solução de produção completa, abordando:

1. Configuração de ambiente e variáveis
2. Substituição de dados mockados por integrações reais
3. Melhorias de segurança e autenticação
4. Testes e validação
5. Preparação para deploy

---

## 🎯 Objetivos

### Objetivos Principais
- ✅ Configurar ambiente de desenvolvimento completo
- ✅ Substituir dados mockados por integrações reais
- ✅ Implementar autenticação e segurança
- ✅ Adicionar testes automatizados
- ✅ Preparar para deploy em produção

### Objetivos Secundários
- Melhorar UX com sugestões contextuais
- Adicionar modo offline para desenvolvimento
- Implementar monitoramento e logging
- Otimizar performance

---

## 📅 Fases de Implementação

### **FASE 1: Configuração e Setup** (Semana 1)
**Prioridade**: 🔴 CRÍTICA  
**Estimativa**: 2-3 dias

#### Tarefas

##### 1.1 Configuração de Variáveis de Ambiente
- [ ] Criar arquivo `.env.example` com todas as variáveis necessárias
- [ ] Criar arquivo `.env.local` (não versionado)
- [ ] Documentar processo de obtenção das chaves
- [ ] Adicionar validação de variáveis no startup

**Arquivos a criar/modificar:**
- `.env.example`
- `src/lib/env.ts` (novo - validação)
- `README.md` (atualizar seção de setup)

**Variáveis necessárias:**
```env
# Frontend
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sua-chave-publica

# Supabase Edge Functions (via Supabase Dashboard)
LOVABLE_API_KEY=sua-chave-lovable
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_ANON_KEY=sua-chave-anon
```

##### 1.2 Configuração do Supabase
- [ ] Verificar projeto Supabase ativo
- [ ] Configurar variáveis de ambiente nas Edge Functions
- [ ] Testar conexão com Supabase
- [ ] Verificar migrações aplicadas

**Comandos:**
```bash
# Instalar Supabase CLI (se necessário)
npm install -g supabase

# Login no Supabase
supabase login

# Linkar projeto
supabase link --project-ref poqeroefputjfikzutxw

# Verificar status
supabase status
```

##### 1.3 Validação de Ambiente
- [ ] Criar componente de validação de variáveis
- [ ] Adicionar mensagens de erro amigáveis
- [ ] Criar página de "Setup Required" se variáveis faltarem
- [ ] Testar em diferentes ambientes

**Arquivo a criar:**
- `src/components/EnvValidator.tsx`

---

### **FASE 2: Substituição de Dados Mockados** (Semana 1-2)
**Prioridade**: 🟡 ALTA  
**Estimativa**: 3-4 dias

#### Tarefas

##### 2.1 FinancialAppPreview - Integração com API
- [ ] Criar tabela `financial_data` no Supabase
- [ ] Criar API endpoint ou Supabase Function para dados financeiros
- [ ] Substituir dados mockados por chamadas à API
- [ ] Implementar cache local (React Query)
- [ ] Adicionar loading states
- [ ] Adicionar tratamento de erros

**Estrutura da tabela:**
```sql
CREATE TABLE financial_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  income JSONB,
  expenses JSONB,
  cards JSONB,
  goals JSONB,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);
```

**Arquivos a modificar:**
- `src/components/vibecode/FinancialAppPreview.tsx`
- `src/lib/api.ts` (adicionar funções financeiras)
- `supabase/migrations/` (nova migration)

##### 2.2 LiveAppPreview - Persistência de Estado
- [ ] Criar tabela `app_states` no Supabase
- [ ] Implementar salvamento automático de estado
- [ ] Adicionar sincronização entre sessões
- [ ] Implementar debounce para evitar muitas chamadas
- [ ] Adicionar histórico de estados

**Estrutura da tabela:**
```sql
CREATE TABLE app_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  conversation_id UUID REFERENCES conversations(id),
  state_data JSONB,
  created_at TIMESTAMP DEFAULT now()
);
```

**Arquivos a modificar:**
- `src/components/vibecode/LiveAppPreview.tsx`
- `src/hooks/useVibeCode.ts` (adicionar persistência)
- `src/lib/api.ts`

##### 2.3 Modo de Desenvolvimento com Dados Mockados
- [ ] Criar flag `VITE_USE_MOCK_DATA`
- [ ] Implementar provider de dados mockados
- [ ] Adicionar toggle no UI (apenas em dev)
- [ ] Documentar uso

**Arquivos a criar:**
- `src/lib/mockData.ts`
- `src/providers/MockDataProvider.tsx`

---

### **FASE 3: Autenticação e Segurança** (Semana 2-3)
**Prioridade**: 🔴 CRÍTICA  
**Estimativa**: 3-4 dias

#### Tarefas

##### 3.1 Implementar Autenticação Supabase
- [ ] Configurar Supabase Auth
- [ ] Criar componentes de login/registro
- [ ] Implementar proteção de rotas
- [ ] Adicionar contexto de autenticação
- [ ] Implementar refresh token automático

**Arquivos a criar:**
- `src/components/auth/LoginForm.tsx`
- `src/components/auth/RegisterForm.tsx`
- `src/contexts/AuthContext.tsx`
- `src/hooks/useAuth.ts`

##### 3.2 Atualizar Row Level Security (RLS)
- [ ] Revisar políticas RLS atuais
- [ ] Implementar políticas baseadas em usuário
- [ ] Adicionar políticas para `conversations`
- [ ] Adicionar políticas para `council_results`
- [ ] Adicionar políticas para `financial_data`
- [ ] Testar políticas com diferentes usuários

**Arquivos a modificar:**
- `supabase/migrations/` (nova migration para RLS)

**Políticas a implementar:**
```sql
-- Exemplo para conversations
CREATE POLICY "Users can view own conversations"
ON conversations FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own conversations"
ON conversations FOR INSERT
WITH CHECK (auth.uid() = user_id);
```

##### 3.3 Validação e Sanitização
- [ ] Adicionar validação de inputs
- [ ] Implementar sanitização de dados
- [ ] Adicionar rate limiting nas APIs
- [ ] Implementar validação de VibeCode no backend

**Arquivos a criar/modificar:**
- `src/lib/validation.ts`
- `src/lib/sanitize.ts`
- `supabase/functions/process-intent/index.ts` (adicionar rate limiting)

---

### **FASE 4: Melhorias de UX e Funcionalidades** (Semana 3-4)
**Prioridade**: 🟡 MÉDIA  
**Estimativa**: 4-5 dias

#### Tarefas

##### 4.1 Sugestões Contextuais no Chat
- [ ] Analisar código atual do app gerado
- [ ] Criar endpoint para análise de código via IA
- [ ] Gerar sugestões baseadas no contexto
- [ ] Implementar cache de sugestões
- [ ] Adicionar UI para sugestões contextuais

**Arquivos a criar/modificar:**
- `src/components/chat/AppChat.tsx`
- `supabase/functions/analyze-code/index.ts` (nova function)

##### 4.2 Exemplos Dinâmicos de Intenções
- [ ] Criar tabela `intent_examples`
- [ ] Popular com exemplos iniciais
- [ ] Implementar endpoint para buscar exemplos
- [ ] Adicionar categorização
- [ ] Permitir favoritar exemplos

**Estrutura da tabela:**
```sql
CREATE TABLE intent_examples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  intent_text TEXT NOT NULL,
  category TEXT,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT now()
);
```

##### 4.3 Melhorias no Preview
- [ ] Adicionar zoom no preview
- [ ] Implementar modo fullscreen
- [ ] Adicionar exportação de screenshot
- [ ] Melhorar responsividade mobile
- [ ] Adicionar animações de transição

**Arquivos a modificar:**
- `src/components/preview/DynamicAppPreview.tsx`
- `src/components/preview/LiveCodeRenderer.tsx`

---

### **FASE 5: Testes e Qualidade** (Semana 4-5)
**Prioridade**: 🟡 ALTA  
**Estimativa**: 3-4 dias

#### Tarefas

##### 5.1 Testes Unitários
- [ ] Configurar Vitest
- [ ] Testar parser de VibeCode
- [ ] Testar interpreter de VibeCode
- [ ] Testar validação de VibeCode
- [ ] Testar hooks customizados

**Arquivos a criar:**
- `vitest.config.ts`
- `src/lib/vibecode/__tests__/parser.test.ts`
- `src/lib/vibecode/__tests__/interpreter.test.ts`
- `src/hooks/__tests__/useVibeCode.test.ts`

##### 5.2 Testes de Integração
- [ ] Testar fluxo completo de geração
- [ ] Testar integração com Supabase
- [ ] Testar Edge Functions
- [ ] Testar autenticação

**Arquivos a criar:**
- `src/__tests__/integration/flow.test.ts`
- `src/__tests__/integration/auth.test.ts`

##### 5.3 Testes E2E
- [ ] Configurar Playwright ou Cypress
- [ ] Criar testes de fluxo principal
- [ ] Testar diferentes cenários
- [ ] Adicionar ao CI/CD

**Arquivos a criar:**
- `playwright.config.ts` ou `cypress.config.ts`
- `e2e/flows/generate-app.spec.ts`

##### 5.4 Dados Seed para Testes
- [ ] Criar script de seed
- [ ] Popular banco com dados de teste
- [ ] Criar fixtures para testes
- [ ] Documentar uso

**Arquivos a criar:**
- `supabase/seed.sql`
- `scripts/seed.ts`

---

### **FASE 6: Performance e Otimização** (Semana 5)
**Prioridade**: 🟢 BAIXA  
**Estimativa**: 2-3 dias

#### Tarefas

##### 6.1 Otimização de Bundle
- [ ] Analisar bundle size
- [ ] Implementar code splitting
- [ ] Lazy loading de componentes
- [ ] Otimizar imports

**Ferramentas:**
- `vite-bundle-visualizer`
- `rollup-plugin-visualizer`

##### 6.2 Cache e Performance
- [ ] Implementar cache de resultados
- [ ] Otimizar queries do Supabase
- [ ] Adicionar service worker (PWA)
- [ ] Implementar debounce/throttle

##### 6.3 Monitoramento
- [ ] Adicionar Sentry ou similar
- [ ] Implementar logging estruturado
- [ ] Adicionar métricas de performance
- [ ] Criar dashboard de monitoramento

---

### **FASE 7: Deploy e DevOps** (Semana 6)
**Prioridade**: 🔴 CRÍTICA  
**Estimativa**: 3-4 dias

#### Tarefas

##### 7.1 Preparação para Deploy
- [ ] Configurar variáveis de ambiente de produção
- [ ] Otimizar build de produção
- [ ] Configurar domínio customizado
- [ ] Preparar documentação de deploy

##### 7.2 CI/CD Pipeline
- [ ] Configurar GitHub Actions
- [ ] Adicionar testes automatizados
- [ ] Configurar deploy automático
- [ ] Adicionar preview deployments

**Arquivo a criar:**
- `.github/workflows/ci.yml`
- `.github/workflows/deploy.yml`

##### 7.3 Deploy Frontend
- [ ] Deploy no Vercel/Netlify
- [ ] Configurar variáveis de ambiente
- [ ] Testar em produção
- [ ] Configurar CDN

##### 7.4 Deploy Backend (Supabase)
- [ ] Verificar Edge Functions em produção
- [ ] Configurar variáveis de ambiente
- [ ] Testar todas as functions
- [ ] Configurar backups

---

## 📊 Cronograma Resumido

| Fase | Duração | Prioridade | Status |
|------|---------|------------|--------|
| Fase 1: Configuração | 2-3 dias | 🔴 Crítica | ⏳ Pendente |
| Fase 2: Dados Mockados | 3-4 dias | 🟡 Alta | ⏳ Pendente |
| Fase 3: Autenticação | 3-4 dias | 🔴 Crítica | ⏳ Pendente |
| Fase 4: Melhorias UX | 4-5 dias | 🟡 Média | ⏳ Pendente |
| Fase 5: Testes | 3-4 dias | 🟡 Alta | ⏳ Pendente |
| Fase 6: Performance | 2-3 dias | 🟢 Baixa | ⏳ Pendente |
| Fase 7: Deploy | 3-4 dias | 🔴 Crítica | ⏳ Pendente |

**Total Estimado**: 20-27 dias úteis (4-5 semanas)

---

## 🛠️ Stack Tecnológico Adicional Necessário

### Ferramentas de Desenvolvimento
- [ ] Supabase CLI
- [ ] Vitest (testes unitários)
- [ ] Playwright/Cypress (testes E2E)
- [ ] ESLint/Prettier (já configurado)

### Serviços Externos
- [ ] Conta Supabase (já configurada)
- [ ] Conta Lovable AI (já configurada)
- [ ] Vercel/Netlify (para deploy)
- [ ] Sentry (opcional - monitoramento)

---

## 📝 Checklist de Implementação

### Setup Inicial
- [ ] Clonar repositório
- [ ] Instalar dependências (`npm install`)
- [ ] Configurar variáveis de ambiente
- [ ] Testar servidor local
- [ ] Verificar conexão com Supabase

### Configuração
- [ ] Criar `.env.example`
- [ ] Criar validação de variáveis
- [ ] Configurar Supabase Edge Functions
- [ ] Testar todas as integrações

### Desenvolvimento
- [ ] Substituir dados mockados
- [ ] Implementar autenticação
- [ ] Atualizar RLS policies
- [ ] Adicionar testes

### Deploy
- [ ] Configurar CI/CD
- [ ] Deploy frontend
- [ ] Deploy backend
- [ ] Testar em produção

---

## 🚨 Riscos e Mitigações

### Riscos Identificados

1. **Variáveis de Ambiente Não Configuradas**
   - **Risco**: Aplicação não funciona
   - **Mitigação**: Validação no startup + documentação clara

2. **Custos de API (Lovable AI)**
   - **Risco**: Custos elevados com uso
   - **Mitigação**: Implementar rate limiting + cache

3. **Performance com Muitos Usuários**
   - **Risco**: Supabase pode ter limites
   - **Mitigação**: Otimizar queries + considerar upgrade

4. **Segurança (RLS Público)**
   - **Risco**: Dados expostos
   - **Mitigação**: Implementar autenticação + RLS adequado

---

## 📚 Documentação a Criar/Atualizar

- [ ] README.md (setup completo)
- [ ] `.env.example` (template)
- [ ] `CONTRIBUTING.md` (guia de contribuição)
- [ ] `DEPLOY.md` (guia de deploy)
- [ ] `TESTING.md` (guia de testes)
- [ ] `ARCHITECTURE.md` (arquitetura do sistema)

---

## 🎯 Critérios de Sucesso

### Fase 1 (Configuração)
- ✅ Aplicação roda localmente sem erros
- ✅ Todas as variáveis validadas
- ✅ Conexão com Supabase funcionando

### Fase 2 (Dados Mockados)
- ✅ FinancialAppPreview usando dados reais
- ✅ LiveAppPreview persistindo estado
- ✅ Modo mock disponível para dev

### Fase 3 (Autenticação)
- ✅ Login/registro funcionando
- ✅ RLS implementado corretamente
- ✅ Rotas protegidas

### Fase 4 (Melhorias)
- ✅ Sugestões contextuais funcionando
- ✅ Exemplos dinâmicos implementados
- ✅ Preview melhorado

### Fase 5 (Testes)
- ✅ Cobertura de testes > 70%
- ✅ Testes E2E passando
- ✅ CI/CD configurado

### Fase 6 (Performance)
- ✅ Bundle size otimizado
- ✅ Lighthouse score > 90
- ✅ Monitoramento ativo

### Fase 7 (Deploy)
- ✅ Deploy em produção
- ✅ Todas as funcionalidades testadas
- ✅ Documentação completa

---

## 📞 Próximos Passos Imediatos

1. **Hoje**:
   - [ ] Criar `.env.example`
   - [ ] Criar validação de variáveis
   - [ ] Atualizar README

2. **Esta Semana**:
   - [ ] Configurar Supabase completamente
   - [ ] Testar todas as integrações
   - [ ] Iniciar Fase 2

3. **Próxima Semana**:
   - [ ] Implementar autenticação
   - [ ] Substituir dados mockados
   - [ ] Iniciar testes

---

## 🔄 Atualizações do Plano

Este plano será atualizado conforme o progresso da implementação.

**Última atualização**: Janeiro 2025  
**Próxima revisão**: Após conclusão da Fase 1

---

## 📎 Referências

- [CONCEITO.md](./CONCEITO.md) - Conceito da aplicação
- [RELATORIO_MOCK_DATA.md](./RELATORIO_MOCK_DATA.md) - Relatório de dados mockados
- [README.md](./README.md) - Documentação básica

---

**Criado por**: Análise Automatizada  
**Aprovado por**: [Pendente]  
**Status**: 📋 Planejamento

