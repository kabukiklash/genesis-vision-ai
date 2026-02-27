# Análise do Repositório Main (Atualizado)

## Status do Clone
✅ **Repositório clonado com sucesso**
- Localização: `../genesis-vision-ai-main-test`
- Branch: `main`
- Último commit: `0f1a00b - Code edited in Lovable Code Editor`
- Status: Working tree clean

---

## Estrutura do Repositório Main

### Arquivos Principais
- ✅ `package.json` - Dependências básicas (sem testes, sem banco local)
- ✅ `supabase/functions/process-intent/index.ts` - Edge Function para processar intenções
- ✅ `supabase/functions/generate-app/index.ts` - Edge Function para gerar apps
- ✅ `src/lib/api.ts` - API client básico
- ✅ `src/pages/Index.tsx` - Página principal

### Migrações do Banco
- ✅ `supabase/migrations/20260103001902_6f54af37-09c2-4300-a191-c20de34d3dfa.sql`
- ❌ **NÃO existe** migração para `user_ai_providers`
- ❌ **NÃO existe** migração para `intent_examples`
- ❌ **NÃO existe** migração para `financial_data` ou `app_states`

---

## Análise do Código

### 1. Edge Functions

#### `process-intent/index.ts`
- ✅ Usa `callLovableAI()` - **hardcoded para Lovable**
- ✅ 4 personas definidas (creative, conservative, efficient, robust)
- ✅ 3 stages: Generation, Evaluation, Synthesis
- ✅ Validação VibeCode implementada
- ❌ **NÃO suporta** múltiplas IAs do usuário
- ❌ **Dependente** de `LOVABLE_API_KEY`

#### `generate-app/index.ts`
- ✅ Usa `fetch()` direto para Lovable
- ✅ Suporta `generate` e `modify`
- ❌ **NÃO suporta** IAs customizadas
- ❌ **Dependente** de `LOVABLE_API_KEY`

### 2. Frontend

#### `src/lib/api.ts`
- ✅ Função `processIntent()` básica
- ✅ Função `getConversations()` básica
- ✅ Função `getConversationResults()` básica
- ❌ **NÃO tem** funções para gerenciar IAs
- ❌ **NÃO tem** autenticação integrada

#### `src/pages/Index.tsx`
- ✅ Toggle Council/Direto
- ✅ Interface básica funcionando
- ❌ **NÃO tem** link para gerenciar IAs
- ❌ **NÃO tem** autenticação (AuthButton)

### 3. Componentes

#### Componentes Existentes
- ✅ `IntentInput` - Input de intenções
- ✅ `LoadingStages` - Loading durante processamento
- ✅ `CouncilResults` - Exibição de resultados
- ✅ `DynamicAppPreview` - Preview de apps gerados
- ✅ `LiveCodeRenderer` - Renderização de código dinâmico

#### Componentes Faltando
- ❌ `AIProviderManager` - Gerenciamento de IAs
- ❌ `AuthButton` / `AuthDialog` - Autenticação
- ❌ `ErrorBoundary` - Tratamento de erros
- ❌ `EnvValidator` - Validação de variáveis de ambiente

---

## Diferenças vs. Branch Development

### O que TEM na Development mas NÃO tem na Main:
1. ✅ Sistema de autenticação (Google OAuth)
2. ✅ Tabela `user_ai_providers` (migração deletada, mas código existe)
3. ✅ Tabela `intent_examples`
4. ✅ Tabela `financial_data` e `app_states`
5. ✅ Componentes de autenticação
6. ✅ Melhorias no `LiveCodeRenderer` (cache, validação)
7. ✅ Validação de sintaxe melhorada no `generate-app`
8. ✅ Retry automático (3 tentativas)
9. ✅ Sistema de testes (Vitest, Playwright)
10. ✅ CI/CD workflows

### O que TEM na Main mas pode estar diferente na Development:
1. ⚠️ Código mais "limpo" (sem as melhorias recentes)
2. ⚠️ Sem dependências extras (testes, banco local)

---

## Estado Atual do Sistema de IAs

### ❌ **PROBLEMA IDENTIFICADO**:
O código na `main` está **100% dependente do Lovable**:
- `callLovableAI()` hardcoded
- URL fixa: `https://ai.gateway.lovable.dev/v1/chat/completions`
- API Key obrigatória: `LOVABLE_API_KEY`
- **NÃO existe** sistema para cadastrar IAs do usuário

### ✅ **SOLUÇÃO NECESSÁRIA** (conforme plano):
1. Criar tabela `user_ai_providers`
2. Criar helper `ai-provider.ts` para chamadas genéricas
3. Modificar Edge Functions para usar IAs do usuário
4. Criar interface de gerenciamento
5. Manter Lovable como fallback (não obrigatório)

---

## Próximos Passos Recomendados

### 1. Testar o Estado Atual
- [ ] Verificar se o código da main compila
- [ ] Testar se as Edge Functions funcionam
- [ ] Verificar se o frontend roda

### 2. Aplicar Implementação do Plano
- [ ] Criar migração `user_ai_providers`
- [ ] Criar helper `ai-provider.ts`
- [ ] Modificar `process-intent/index.ts`
- [ ] Modificar `generate-app/index.ts`
- [ ] Criar interface de gerenciamento
- [ ] Testar com múltiplas IAs

### 3. Garantir Compatibilidade
- [ ] Manter fallback para Lovable
- [ ] Não quebrar código existente
- [ ] Testar com e sem IAs cadastradas

---

## Conclusão

O repositório `main` está em um estado **mais básico** que a `development`:
- ✅ Código funcional mas dependente do Lovable
- ❌ Não tem sistema de gerenciamento de IAs
- ❌ Não tem autenticação
- ❌ Não tem melhorias recentes (cache, validação, retry)

**Recomendação**: Aplicar o plano de implementação do sistema de IAs, mantendo compatibilidade com o código atual e adicionando as funcionalidades necessárias.
