import { parseVibeCode, ParsedVibeCode, VibeState } from './index';

export interface GeneratedApp {
  componentCode: string;
  hookCode: string;
  cssCode: string;
  appName: string;
  description: string;
}

/**
 * Extracts app context from the user's intent
 */
function extractAppContext(intent: string): { appName: string; description: string; uiElements: string[] } {
  // Simple extraction logic - could be enhanced with AI
  const words = intent.toLowerCase().split(/\s+/);
  
  // Try to find app name from intent
  let appName = 'GeneratedApp';
  const namePatterns = [
    /(?:criar|create|fazer|make|build)\s+(?:um|uma|a|an)?\s*(?:app|aplicativo|sistema|tela|página)?\s*(?:de|for|para)?\s*(\w+)/i,
    /(\w+)\s+(?:app|aplicativo|sistema)/i,
  ];
  
  for (const pattern of namePatterns) {
    const match = intent.match(pattern);
    if (match) {
      appName = match[1].charAt(0).toUpperCase() + match[1].slice(1) + 'App';
      break;
    }
  }

  // Extract potential UI elements
  const uiKeywords = ['botão', 'button', 'formulário', 'form', 'lista', 'list', 'card', 'input', 'campo', 'tabela', 'table'];
  const uiElements = uiKeywords.filter(kw => intent.toLowerCase().includes(kw));

  return { appName, description: intent, uiElements };
}

/**
 * Generates state-specific UI based on VibeCode states
 */
function generateStateUI(state: VibeState, appContext: { uiElements: string[] }): string {
  const hasForm = appContext.uiElements.some(e => ['formulário', 'form', 'input', 'campo'].includes(e));
  const hasList = appContext.uiElements.some(e => ['lista', 'list', 'tabela', 'table'].includes(e));
  const hasButton = appContext.uiElements.some(e => ['botão', 'button'].includes(e));

  switch (state) {
    case 'CANDIDATE':
      return `
        <div className="text-center space-y-4">
          <h2 className="text-xl font-semibold">Pronto para começar</h2>
          <p className="text-muted-foreground">Clique no botão para iniciar o processo</p>
          ${hasButton ? '<Button onClick={() => transitionTo("RUNNING")}>Iniciar</Button>' : '<Button onClick={() => transitionTo("RUNNING")}>Começar</Button>'}
        </div>`;
    
    case 'RUNNING':
      return `
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Processando...</span>
          </div>
          ${hasForm ? `
          <div className="space-y-3">
            <Input placeholder="Digite aqui..." value={inputValue} onChange={(e) => setInputValue(e.target.value)} />
            <Button onClick={handleSubmit}>Enviar</Button>
          </div>` : `
          <Progress value={progress} className="w-full" />
          <Button variant="outline" onClick={() => transitionTo("COOLING")}>Pausar</Button>`}
        </div>`;
    
    case 'COOLING':
      return `
        <div className="text-center space-y-4">
          <Pause className="h-12 w-12 mx-auto text-muted-foreground" />
          <p>Processo pausado</p>
          <div className="flex gap-2 justify-center">
            <Button onClick={() => transitionTo("RUNNING")}>Retomar</Button>
            <Button variant="outline" onClick={() => transitionTo("DONE")}>Finalizar</Button>
          </div>
        </div>`;
    
    case 'DONE':
      return `
        <div className="text-center space-y-4">
          <CheckCircle className="h-12 w-12 mx-auto text-green-500" />
          <h2 className="text-xl font-semibold">Concluído!</h2>
          ${hasList ? `
          <div className="text-left">
            <ul className="space-y-2">
              {items.map((item, i) => (
                <li key={i} className="p-2 bg-muted rounded">{item}</li>
              ))}
            </ul>
          </div>` : '<p className="text-muted-foreground">Processo finalizado com sucesso</p>'}
          <Button variant="ghost" onClick={reset}>Recomeçar</Button>
        </div>`;
    
    case 'ERROR':
      return `
        <div className="text-center space-y-4">
          <AlertCircle className="h-12 w-12 mx-auto text-destructive" />
          <h2 className="text-xl font-semibold text-destructive">Erro</h2>
          <p className="text-muted-foreground">{errorMessage || "Algo deu errado"}</p>
          <Button onClick={reset}>Tentar novamente</Button>
        </div>`;
    
    default:
      return '<div>Estado desconhecido</div>';
  }
}

/**
 * Main generator function - transforms VibeCode + intent into React app
 */
export function generateReactApp(vibeCode: string, intent: string): GeneratedApp {
  const parsed = parseVibeCode(vibeCode);
  const appContext = extractAppContext(intent);
  
  // Collect unique states from tokens
  const states = new Set<VibeState>(['CANDIDATE', 'RUNNING', 'COOLING', 'DONE', 'ERROR']);
  
  // Generate the main component code
  const componentCode = `import { useState } from 'react';
import { useVibeCode } from '@/hooks/useVibeCode';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StateIndicator, FrictionMeter } from '@/components/vibecode';
import { Loader2, Pause, CheckCircle, AlertCircle } from 'lucide-react';

// VibeCode Specification
const VIBE_CODE = \`${vibeCode}\`;

export function ${appContext.appName}() {
  const {
    state,
    friction,
    transitionTo,
    reset,
    stateColor,
    frictionOpacity,
  } = useVibeCode(VIBE_CODE);

  // Local state for UI
  const [inputValue, setInputValue] = useState('');
  const [progress, setProgress] = useState(0);
  const [items, setItems] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = () => {
    if (inputValue.trim()) {
      setItems(prev => [...prev, inputValue]);
      setInputValue('');
      setProgress(prev => Math.min(100, prev + 20));
      
      if (progress >= 80) {
        transitionTo('DONE');
      }
    }
  };

  // Friction affects UI interactivity
  const isHighFriction = friction > 0.7;

  return (
    <Card className="w-full max-w-md mx-auto" style={{ opacity: frictionOpacity }}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>${appContext.appName.replace('App', '')}</CardTitle>
          <StateIndicator state={state} size="sm" />
        </div>
        {friction > 0 && (
          <FrictionMeter friction={friction} size="sm" />
        )}
      </CardHeader>
      <CardContent>
        {renderStateUI()}
      </CardContent>
    </Card>
  );

  function renderStateUI() {
    switch (state) {
      case 'CANDIDATE':
        return (${generateStateUI('CANDIDATE', appContext).trim()});
      
      case 'RUNNING':
        return (${generateStateUI('RUNNING', appContext).trim()});
      
      case 'COOLING':
        return (${generateStateUI('COOLING', appContext).trim()});
      
      case 'DONE':
        return (${generateStateUI('DONE', appContext).trim()});
      
      case 'ERROR':
        return (${generateStateUI('ERROR', appContext).trim()});
      
      default:
        return <div>Estado desconhecido</div>;
    }
  }
}

export default ${appContext.appName};
`;

  // Generate a simplified hook usage example
  const hookCode = `// Como usar o hook useVibeCode
import { useVibeCode } from '@/hooks/useVibeCode';

const vibeCode = \`${vibeCode}\`;

function MeuComponente() {
  const {
    state,           // Estado atual: CANDIDATE | RUNNING | COOLING | DONE | ERROR
    friction,        // Nível de fricção: 0-1
    transitionTo,    // Função para mudar estado
    reset,           // Resetar para estado inicial
    canTransitionTo, // Verificar se transição é válida
    stateColor,      // Cor CSS do estado
    frictionOpacity, // Opacidade baseada em fricção
  } = useVibeCode(vibeCode);

  return (
    <div style={{ opacity: frictionOpacity }}>
      <p>Estado: {state}</p>
      <p>Fricção: {friction * 100}%</p>
      <button onClick={() => transitionTo('RUNNING')}>
        Iniciar
      </button>
    </div>
  );
}
`;

  // CSS styles
  const cssCode = `/* Estilos customizados para ${appContext.appName} */
.${appContext.appName.toLowerCase()}-container {
  --state-candidate: hsl(var(--muted));
  --state-running: hsl(var(--primary));
  --state-cooling: hsl(var(--accent));
  --state-done: hsl(142 76% 36%);
  --state-error: hsl(var(--destructive));
}

.high-friction {
  pointer-events: none;
  filter: grayscale(50%);
}

.state-transition {
  transition: all 0.3s ease-in-out;
}
`;

  return {
    componentCode,
    hookCode,
    cssCode,
    appName: appContext.appName,
    description: appContext.description,
  };
}
