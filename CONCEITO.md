# Genesis Vision AI - Conceito da Aplicação

## **Visão Geral**
Sistema de **programação por intenção** que utiliza um **conselho de LLMs (LLM Council)** para gerar código **VibeCode** e depois transformá-lo em aplicações React funcionais.

---

## **Arquitetura Principal**

### **1. VibeCode - Linguagem Declarativa de Estados**

VibeCode é uma linguagem declarativa minimalista para definir máquinas de estado de aplicações:

- **Estados válidos**: `CANDIDATE`, `RUNNING`, `COOLING`, `DONE`, `ERROR`
- **Conceito de Friction (0-100)**: Representa a dificuldade/resistência do sistema
- **Sintaxe extremamente restrita**:
  - ✅ **Permitido**: `set state =`, `set friction =`, `increase friction by`
  - ❌ **Proibido**: Condicionais, loops, cálculos, variáveis, operações matemáticas

**Formato:**
```vibecode
workflow NomeDoWorkflow

type TIPO
retention LONG

on EVENTO_1 {
  set state = CANDIDATE
  set friction = 5
}

on EVENTO_2 {
  set state = RUNNING
  increase friction by 20
}

on EVENTO_3 {
  set state = DONE
  set friction = 10
}
```

### **2. LLM Council - Processo em 3 Estágios**

#### **Modo Council (4 IAs em paralelo):**

1. **Estágio 1 - Geração Paralela**: 4 personas diferentes geram propostas de VibeCode
   - 🎨 **Arquiteto Criativo**: Soluções elegantes e inovadoras
   - 🛡️ **Engenheiro Conservador**: Soluções seguras e testadas
   - ⚡ **Otimizador de Performance**: Soluções eficientes e mínimas
   - 🏗️ **Arquiteto de Resiliência**: Soluções robustas e completas

2. **Estágio 2 - Avaliação Cruzada**: Cada proposta é avaliada e ranqueada
   - Critérios: Validade, Simplicidade, Completude, Clareza, Elegância, Robustez

3. **Estágio 3 - Síntese**: Um "Chairman" sintetiza o melhor código combinando as melhores partes

#### **Modo Direto:**
- Geração rápida com uma única IA (para testes)

### **3. Fluxo Completo**

1. **Usuário descreve a intenção** (ex: "Sistema de gestão de vendas com controle de estoque")
2. **Processamento**:
   - Geração de VibeCode via Council ou modo direto
   - Validação estrita do VibeCode (8 regras PER)
3. **Transformação**:
   - VibeCode → Máquina de estados React
   - Geração de app React completo com UI baseada nos estados
4. **Preview e Interação**:
   - Preview ao vivo do app gerado
   - Chat para modificações iterativas
   - Download do código

---

## **Componentes Técnicos**

### **Frontend (React + TypeScript)**

- **`IntentInput`**: Componente para entrada da intenção do usuário
- **`CouncilResults`**: Visualização dos 3 estágios do Council
- **`GeneratedAppPreview`**: Preview do app gerado
- **`useVibeCode`**: Hook React para gerenciar máquina de estados
- **`LiveCodeRenderer`**: Renderização dinâmica de código React

### **Backend (Supabase Edge Functions)**

- **`process-intent`**: Orquestra o LLM Council e gera VibeCode
- **`generate-app`**: Transforma VibeCode + intenção em app React completo

### **Biblioteca VibeCode**

- **`parser.ts`**: Parsing e validação do VibeCode
- **`interpreter.ts`**: Interpretação e execução da máquina de estados
- **`generator.ts`**: Geração de código React a partir do VibeCode
- **`types.ts`**: Definições de tipos e transições válidas

---

## **Conceitos Inovadores**

1. **Programação Declarativa de Estados**: VibeCode foca em "o quê" (estados e eventos), não em "como" (lógica imperativa)

2. **Council de IAs**: Múltiplas perspectivas para melhor qualidade

3. **Friction como Métrica**: Representa a dificuldade/resistência do sistema

4. **Validação Estrita**: 8 regras PER garantem código válido

5. **Transformação Automática**: VibeCode → React funcional

---

## **Stack Tecnológico**

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui
- **Backend**: Supabase (Edge Functions em Deno)
- **IA**: Lovable AI Gateway (Google Gemini 2.5 Flash)
- **Estado**: React Query, hooks customizados
- **UI**: Radix UI, Lucide Icons

---

## **Casos de Uso**

- Sistemas de gestão (vendas, estoque, tickets)
- Dashboards IoT
- Sistemas de agendamento
- Workflows de aprovação
- Qualquer aplicação com estados bem definidos

---

## **Validação VibeCode - Regras PER**

1. **PER-001**: Declaração de workflow obrigatória
2. **PER-002**: Declaração de type obrigatória (ex: `type ORDER`)
3. **PER-003**: Retention obrigatória (`EPHEMERAL` ou `LONG`)
4. **PER-004**: Apenas estados válidos (`CANDIDATE`, `RUNNING`, `COOLING`, `DONE`, `ERROR`)
5. **PER-005**: Comandos passivos obrigatórios (`set state`, `set friction`, `increase friction`)
6. **PER-006**: Friction no range 0-100
7. **PER-007**: Handlers de evento obrigatórios (`on EVENTO { }`)
8. **PER-008**: Nenhuma lógica ativa permitida (sem `if`, `else`, `for`, `while`, `cell`, `trigger`, `when`, cálculos, etc.)

---

## **Transições de Estado Válidas**

```typescript
CANDIDATE → RUNNING
RUNNING → COOLING
RUNNING → ERROR
COOLING → RUNNING
COOLING → DONE
COOLING → ERROR
ERROR → CANDIDATE
DONE → CANDIDATE
```

---

## **Estrutura de Dados**

### **VibeCodeContext**
```typescript
{
  state: VibeState;
  friction: number;
  history: { state: VibeState; friction: number; timestamp: number }[];
}
```

### **ProcessIntentResponse**
```typescript
{
  conversationId: string;
  stage1: Generation[];      // 4 propostas paralelas
  stage2: Stage2Results;       // Avaliações e ranking
  stage3: Stage3Results;       // Código final sintetizado
}
```

---

## **Fluxo de Dados**

```
Usuário (Intenção)
    ↓
process-intent (Supabase Function)
    ↓
LLM Council (4 IAs paralelas)
    ↓
Validação VibeCode (8 regras PER)
    ↓
Avaliação e Síntese
    ↓
VibeCode Válido
    ↓
generate-app (Supabase Function)
    ↓
App React Completo
    ↓
Preview + Chat para Modificações
```

---

## **Personas do Council**

| Persona | Modelo | Foco |
|---------|--------|------|
| 🎨 Arquiteto Criativo | Gemini 2.5 Flash | Soluções elegantes e inovadoras |
| 🛡️ Engenheiro Conservador | Gemini 2.5 Flash | Soluções seguras e testadas |
| ⚡ Otimizador de Performance | Gemini 2.5 Flash | Soluções eficientes e mínimas |
| 🏗️ Arquiteto de Resiliência | Gemini 2.5 Flash | Soluções robustas e completas |

---

## **Recursos da UI**

- ✅ Preview ao vivo do app gerado
- ✅ Modo mobile/desktop
- ✅ Chat para modificações iterativas
- ✅ Download do código gerado
- ✅ Visualização dos 3 estágios do Council
- ✅ Validação em tempo real
- ✅ Histórico de estados e friction

---

**Última atualização**: Janeiro 2025

