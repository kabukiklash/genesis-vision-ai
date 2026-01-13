# 🧪 Guia de Teste no Browser - Genesis Vision AI

## 📍 URL da Aplicação
**http://localhost:8080**

---

## ✅ Checklist de Testes

### 1. Tela Inicial e Validação de Ambiente

#### 1.1 Validação de Variáveis de Ambiente
- [ ] **Cenário A**: Se `.env.local` não existe ou está incompleto
  - Deve mostrar tela de erro com instruções claras
  - Deve ter botão para copiar instruções
  - Deve ter link para documentação do Supabase

- [ ] **Cenário B**: Se `.env.local` está completo
  - Deve carregar a aplicação normalmente
  - Não deve mostrar tela de erro

#### 1.2 Interface Principal
- [ ] Título "🎯 Genesis Vision" visível
- [ ] Subtítulo "Programação por Intenção com LLM Council" visível
- [ ] Campo de texto para intenção visível
- [ ] Botão "Gerar Código" visível
- [ ] Botão de autenticação no canto superior direito visível

---

### 2. Autenticação

#### 2.1 Botão de Autenticação
- [ ] Clicar no botão "Entrar" abre modal de autenticação
- [ ] Modal tem duas abas: "Entrar" e "Criar Conta"

#### 2.2 Login
- [ ] Formulário de login tem campos: Email e Senha
- [ ] Botão "Esqueceu a senha?" visível
- [ ] Validação de campos obrigatórios funciona
- [ ] Mensagens de erro aparecem se credenciais inválidas

#### 2.3 Registro
- [ ] Formulário de registro tem: Email, Senha, Confirmar Senha
- [ ] Validação de senha mínima (6 caracteres)
- [ ] Validação de senhas coincidentes
- [ ] Mensagem de sucesso após registro

#### 2.4 Estado Autenticado
- [ ] Após login, botão mostra email do usuário
- [ ] Clicar no botão mostra opção de logout
- [ ] Logout funciona corretamente

---

### 3. Input de Intenção

#### 3.1 Campo de Texto
- [ ] Campo aceita texto livre
- [ ] Placeholder "Descreva o sistema que você quer criar..." visível
- [ ] Campo é editável

#### 3.2 Exemplos de Intenção
- [ ] Seção "💡 Exemplos rápidos:" visível
- [ ] Pelo menos 5 exemplos de botões visíveis
- [ ] Clicar em um exemplo preenche o campo
- [ ] Exemplos são carregados dinamicamente (se banco configurado)

#### 3.3 Botão Gerar
- [ ] Botão desabilitado quando campo vazio
- [ ] Botão habilitado quando há texto
- [ ] Ícone de sparkles visível no botão

---

### 4. Toggle Council/Direto

#### 4.1 Toggle Switch
- [ ] Toggle visível abaixo do campo de intenção
- [ ] Por padrão, "Council" está selecionado
- [ ] Alternar entre "Direto" e "Council" funciona
- [ ] Ícones (Zap e Users) mudam de cor conforme seleção

#### 4.2 Descrição
- [ ] Texto explicativo muda conforme modo selecionado
- [ ] Texto explica diferença entre modos

---

### 5. Processamento de Intenção

#### 5.1 Estado de Loading
- [ ] Ao clicar "Gerar Código", mostra tela de loading
- [ ] Componente `LoadingStages` aparece
- [ ] Mostra estágios do Council (se modo Council)
- [ ] Mostra progresso visual

#### 5.2 Modo Direto
- [ ] Processa mais rápido
- [ ] Mostra apenas 1 estágio de loading
- [ ] Gera código diretamente

#### 5.3 Modo Council
- [ ] Processa em 3 estágios
- [ ] Estágio 1: Geração paralela (4 IAs)
- [ ] Estágio 2: Avaliação cruzada
- [ ] Estágio 3: Síntese final

---

### 6. Resultados do Council

#### 6.1 Exibição de Resultados
- [ ] Após processamento, mostra `CouncilResults`
- [ ] Mostra intenção original
- [ ] Mostra VibeCode gerado
- [ ] Mostra resultados dos 3 estágios

#### 6.2 Estágio 1 - Gerações
- [ ] Lista de 4 propostas (personas)
- [ ] Cada proposta mostra código gerado
- [ ] Validação de cada proposta visível

#### 6.3 Estágio 2 - Avaliação
- [ ] Mostra avaliações cruzadas
- [ ] Ranking de propostas
- [ ] Recomendações visíveis

#### 6.4 Estágio 3 - Síntese
- [ ] Código final sintetizado
- [ ] Validação do código final
- [ ] Reasoning do Chairman visível

---

### 7. Preview do App Gerado

#### 7.1 Componente DynamicAppPreview
- [ ] Aparece após geração bem-sucedida
- [ ] Tem 3 abas: Preview, Código, Intenção

#### 7.2 Aba Preview
- [ ] Mostra preview do app gerado
- [ ] Toggle Mobile/Desktop funciona
- [ ] Controles de zoom (50-200%) funcionam
- [ ] Botão fullscreen funciona
- [ ] Preview renderiza código React gerado

#### 7.3 Aba Código
- [ ] Mostra código TSX gerado
- [ ] Botão de copiar funciona
- [ ] Syntax highlighting visível
- [ ] Código é legível

#### 7.4 Aba Intenção
- [ ] Mostra intenção original
- [ ] Mostra VibeCode completo
- [ ] Formatação correta

---

### 8. Chat de Modificações

#### 8.1 Botão Flutuante
- [ ] Botão de chat aparece no canto inferior direito
- [ ] Ícone de MessageCircle visível
- [ ] Clicar abre modal de chat

#### 8.2 Interface do Chat
- [ ] Modal abre corretamente
- [ ] Histórico de mensagens visível
- [ ] Campo de input funcional
- [ ] Botão de enviar funciona

#### 8.3 Sugestões
- [ ] Sugestões aparecem quando chat está vazio
- [ ] Clicar em sugestão preenche input
- [ ] Sugestões são relevantes

---

### 9. Error Handling

#### 9.1 Erros de Rede
- [ ] Erro 429 (rate limit) mostra mensagem apropriada
- [ ] Erro 402 (payment) mostra mensagem apropriada
- [ ] Erros genéricos mostram mensagem clara

#### 9.2 Error Boundary
- [ ] Erros de runtime são capturados
- [ ] Tela de erro amigável aparece
- [ ] Opções de recuperação disponíveis

---

### 10. Performance

#### 10.1 Carregamento Inicial
- [ ] Página carrega em < 3 segundos
- [ ] Loading spinner aparece durante carregamento
- [ ] Sem erros no console

#### 10.2 Lazy Loading
- [ ] Componentes pesados carregam sob demanda
- [ ] Transições suaves
- [ ] Sem travamentos

---

## 🐛 Problemas Conhecidos a Verificar

1. **Variáveis de Ambiente**
   - Se faltar `.env.local`, aplicação mostra erro (comportamento esperado)
   - Verificar se mensagem é clara

2. **Supabase**
   - Se Supabase não estiver configurado, algumas funcionalidades podem falhar
   - Modo mock deve funcionar mesmo sem Supabase

3. **Edge Functions**
   - Se `process-intent` não estiver deployado, geração falhará
   - Verificar mensagens de erro

---

## 📝 Notas de Teste

### Ambiente de Teste
- **URL**: http://localhost:8080
- **Porta**: 8080
- **Modo**: Desenvolvimento

### Pré-requisitos
- [ ] `.env.local` configurado (ou modo mock ativado)
- [ ] Supabase configurado (opcional para modo mock)
- [ ] Edge Functions deployadas (para geração real)

### Dados de Teste
- **Email de teste**: (criar conta de teste)
- **Senha de teste**: (usar senha válida)
- **Intenção de teste**: "Sistema de gestão de vendas com controle de estoque"

---

## ✅ Resultado Esperado

Após todos os testes, a aplicação deve:
- ✅ Carregar sem erros
- ✅ Permitir autenticação
- ✅ Processar intenções
- ✅ Gerar código
- ✅ Mostrar preview
- ✅ Permitir modificações via chat

---

**Data do Teste**: _______________  
**Testado por**: _______________  
**Resultado**: [ ] Passou [ ] Falhou  
**Observações**: _______________
