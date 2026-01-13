# Changelog - Genesis Vision AI

Todas as mudanças notáveis neste projeto serão documentadas neste arquivo.

## [1.0.0] - 2025-01-08

### Adicionado

#### Fase 1: Configuração e Setup
- Sistema de validação de variáveis de ambiente (`src/lib/env.ts`)
- Componente `EnvValidator` para validação no startup
- Documentação completa de setup no README

#### Fase 2: Substituição de Dados Mockados
- Integração com Supabase para dados financeiros
- Tabelas `financial_data` e `app_states` no banco
- Modo mock via `VITE_USE_MOCK_DATA`
- Funções de API para persistência de dados

#### Fase 3: Autenticação e Segurança
- Sistema completo de autenticação Supabase
- Componentes: `LoginForm`, `RegisterForm`, `AuthDialog`, `AuthButton`, `AuthGuard`
- Contexto de autenticação (`AuthContext`)
- Migração de RLS com políticas baseadas em usuário
- Triggers automáticos para `user_id`
- Integração de JWT nas Edge Functions

#### Fase 4: Melhorias de UX
- Exemplos dinâmicos de intenções (`intent_examples` table)
- Contador de uso para popularidade de exemplos
- Preview melhorado com fullscreen e zoom
- Controles de visualização (mobile/desktop)

#### Fase 5: Testes
- Configuração do Vitest para testes unitários
- Testes para `parser.ts`, `interpreter.ts`, `useVibeCode.ts`
- Configuração do Playwright para testes E2E
- Testes E2E para fluxo principal e autenticação
- Cobertura de código configurada

#### Fase 6: Performance e Observabilidade
- Lazy loading de componentes pesados
- Error Boundary para captura de erros
- Monitor de performance (`src/lib/performance.ts`)
- Code splitting no build (chunks separados)
- Otimização de React Query (cache, staleTime)

#### Fase 7: Deploy e CI/CD
- GitHub Actions para CI/CD
- Workflow de migrações do Supabase
- Pipeline completo: lint, test, build, deploy
- Documentação de deploy (`DEPLOY.md`)

### Modificado
- `src/App.tsx`: Adicionado ErrorBoundary, lazy loading, Suspense
- `src/components/preview/DynamicAppPreview.tsx`: Lazy loading, fullscreen, zoom
- `vite.config.ts`: Code splitting, configuração de testes
- `package.json`: Scripts de teste, dependências de teste

### Documentação
- README atualizado com todas as fases
- DEPLOY.md criado com guia completo
- CHANGELOG.md criado

---

## Formato

Este changelog segue [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adere ao [Semantic Versioning](https://semver.org/lang/pt-BR/).
