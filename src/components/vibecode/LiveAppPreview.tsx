import { useState, useCallback, useEffect } from 'react';
import { useVibeCode } from '@/hooks/useVibeCode';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { StateIndicator, FrictionMeter } from '@/components/vibecode';
import { Loader2, Pause, CheckCircle, AlertCircle, Play, RotateCcw, Smartphone, Monitor } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { saveAppStateSnapshot } from '@/lib/api';

interface LiveAppPreviewProps {
  vibeCode: string;
  intent: string;
  conversationId?: string;
}

/**
 * Extracts app context from user intent for dynamic UI generation
 */
function extractUIContext(intent: string) {
  const lower = intent.toLowerCase();
  
  return {
    hasForm: /formulário|form|input|campo|cadastro|registro/.test(lower),
    hasList: /lista|list|tabela|table|itens|items/.test(lower),
    hasButton: /botão|button|ação|action/.test(lower),
    hasProgress: /progresso|progress|loading|carregando/.test(lower),
    appType: getAppType(lower),
    title: extractTitle(intent),
  };
}

function getAppType(intent: string): 'onboarding' | 'checkout' | 'wizard' | 'task' | 'generic' {
  if (/onboarding|cadastro|registro|signup/.test(intent)) return 'onboarding';
  if (/checkout|pagamento|compra|carrinho/.test(intent)) return 'checkout';
  if (/wizard|passo|step|etapa/.test(intent)) return 'wizard';
  if (/tarefa|task|todo|lista/.test(intent)) return 'task';
  return 'generic';
}

function extractTitle(intent: string): string {
  const words = intent.split(/\s+/).slice(0, 5);
  return words.map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

export function LiveAppPreview({ vibeCode, intent, conversationId }: LiveAppPreviewProps) {
  const {
    state,
    friction,
    transitionTo,
    reset,
    canTransitionTo,
    stateColor,
    frictionOpacity,
  } = useVibeCode(vibeCode);

  const [viewMode, setViewMode] = useState<'mobile' | 'desktop'>('mobile');
  const [inputValue, setInputValue] = useState('');
  const [items, setItems] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');

  const uiContext = extractUIContext(intent);
  const isHighFriction = friction > 0.7;

  // Snapshot básico de estado para possíveis features futuras (replay, analytics, etc.)
  useEffect(() => {
    if (!conversationId) return;

    const snapshot = {
      conversation_id: conversationId,
      state_data: {
        state,
        friction,
        items,
        progress,
        errorMessage,
      },
    };

    void saveAppStateSnapshot(snapshot).catch((error) => {
      // Best-effort: logar mas não quebrar UI
      console.error('Error saving app state snapshot:', error);
    });
  }, [conversationId, state, friction, items, progress, errorMessage]);

  // Simulated actions
  const handleStart = useCallback(() => {
    if (canTransitionTo('RUNNING')) {
      transitionTo('RUNNING');
      setProgress(0);
      toast.info('Processo iniciado!');
    }
  }, [canTransitionTo, transitionTo]);

  const handleSubmit = useCallback(() => {
    if (!inputValue.trim()) {
      toast.error('Por favor, preencha o campo');
      return;
    }
    
    setItems(prev => [...prev, inputValue]);
    setInputValue('');
    setProgress(prev => {
      const newProgress = Math.min(100, prev + 25);
      if (newProgress >= 100 && canTransitionTo('DONE')) {
        setTimeout(() => transitionTo('DONE'), 500);
        toast.success('Processo concluído!');
      }
      return newProgress;
    });
    toast.success('Item adicionado!');
  }, [inputValue, canTransitionTo, transitionTo]);

  const handlePause = useCallback(() => {
    if (canTransitionTo('COOLING')) {
      transitionTo('COOLING');
      toast.info('Processo pausado');
    }
  }, [canTransitionTo, transitionTo]);

  const handleResume = useCallback(() => {
    if (canTransitionTo('RUNNING')) {
      transitionTo('RUNNING');
      toast.info('Processo retomado');
    }
  }, [canTransitionTo, transitionTo]);

  const handleComplete = useCallback(() => {
    if (canTransitionTo('DONE')) {
      transitionTo('DONE');
      toast.success('Concluído!');
    }
  }, [canTransitionTo, transitionTo]);

  const handleError = useCallback(() => {
    if (canTransitionTo('ERROR')) {
      setErrorMessage('Simulação de erro para teste');
      transitionTo('ERROR');
      toast.error('Erro simulado!');
    }
  }, [canTransitionTo, transitionTo]);

  const handleReset = useCallback(() => {
    reset();
    setInputValue('');
    setItems([]);
    setProgress(0);
    setErrorMessage('');
    toast.info('App resetado');
  }, [reset]);

  // Render state-specific UI
  const renderStateUI = () => {
    switch (state) {
      case 'CANDIDATE':
        return (
          <div className="text-center space-y-4 py-6">
            <div className="w-16 h-16 mx-auto rounded-full bg-muted flex items-center justify-center">
              <Play className="h-8 w-8 text-muted-foreground" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Pronto para começar</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Clique no botão abaixo para iniciar
              </p>
            </div>
            <Button 
              size="lg" 
              onClick={handleStart}
              disabled={isHighFriction}
              className="w-full max-w-xs"
            >
              <Play className="h-4 w-4 mr-2" />
              Iniciar
            </Button>
          </div>
        );

      case 'RUNNING':
        return (
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-2 text-primary">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="font-medium">Em andamento...</span>
            </div>
            
            {uiContext.hasProgress && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Progresso</span>
                  <span>{progress}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            )}

            {uiContext.hasForm && (
              <div className="space-y-3 pt-2">
                <Input
                  placeholder="Digite algo..."
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                  disabled={isHighFriction}
                />
                <Button 
                  onClick={handleSubmit} 
                  className="w-full"
                  disabled={isHighFriction}
                >
                  Adicionar
                </Button>
              </div>
            )}

            {uiContext.hasList && items.length > 0 && (
              <div className="space-y-2 pt-2">
                <p className="text-sm font-medium">Itens ({items.length})</p>
                <ul className="space-y-1 max-h-32 overflow-auto">
                  {items.map((item, i) => (
                    <li key={i} className="text-sm p-2 bg-muted rounded flex items-center gap-2">
                      <CheckCircle className="h-3 w-3 text-green-500" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button 
                variant="outline" 
                onClick={handlePause}
                disabled={isHighFriction}
                className="flex-1"
              >
                <Pause className="h-4 w-4 mr-1" />
                Pausar
              </Button>
              <Button 
                variant="destructive" 
                size="icon"
                onClick={handleError}
                title="Simular erro"
              >
                <AlertCircle className="h-4 w-4" />
              </Button>
            </div>
          </div>
        );

      case 'COOLING':
        return (
          <div className="text-center space-y-4 py-6">
            <Pause className="h-12 w-12 mx-auto text-muted-foreground" />
            <div>
              <h3 className="font-semibold">Pausado</h3>
              <p className="text-sm text-muted-foreground mt-1">
                O processo foi pausado
              </p>
            </div>
            {progress > 0 && (
              <Progress value={progress} className="h-2 max-w-xs mx-auto" />
            )}
            <div className="flex gap-2 justify-center">
              <Button onClick={handleResume} disabled={isHighFriction}>
                <Play className="h-4 w-4 mr-1" />
                Retomar
              </Button>
              <Button variant="outline" onClick={handleComplete}>
                Finalizar
              </Button>
            </div>
          </div>
        );

      case 'DONE':
        return (
          <div className="text-center space-y-4 py-6">
            <div className="w-16 h-16 mx-auto rounded-full bg-green-500/10 flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
            <div>
              <h3 className="font-semibold text-lg text-green-600">Concluído!</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Processo finalizado com sucesso
              </p>
            </div>
            {items.length > 0 && (
              <div className="text-left max-w-xs mx-auto">
                <p className="text-sm font-medium mb-2">Resumo:</p>
                <ul className="text-sm space-y-1">
                  {items.map((item, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <CheckCircle className="h-3 w-3 text-green-500" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <Button variant="ghost" onClick={handleReset}>
              <RotateCcw className="h-4 w-4 mr-1" />
              Recomeçar
            </Button>
          </div>
        );

      case 'ERROR':
        return (
          <div className="text-center space-y-4 py-6">
            <div className="w-16 h-16 mx-auto rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
            <div>
              <h3 className="font-semibold text-lg text-destructive">Erro</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {errorMessage || 'Algo deu errado'}
              </p>
            </div>
            <Button onClick={handleReset}>
              <RotateCcw className="h-4 w-4 mr-1" />
              Tentar novamente
            </Button>
          </div>
        );

      default:
        return <div>Estado desconhecido</div>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Preview Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === 'mobile' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('mobile')}
          >
            <Smartphone className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'desktop' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('desktop')}
          >
            <Monitor className="h-4 w-4" />
          </Button>
        </div>
        <Button variant="ghost" size="sm" onClick={handleReset}>
          <RotateCcw className="h-4 w-4 mr-1" />
          Reset
        </Button>
      </div>

      {/* Device Frame */}
      <div className={cn(
        "mx-auto bg-background border-4 border-foreground/20 rounded-3xl overflow-hidden shadow-2xl transition-all duration-300",
        viewMode === 'mobile' ? 'w-[320px]' : 'w-full max-w-lg'
      )}>
        {/* Status Bar (mobile) */}
        {viewMode === 'mobile' && (
          <div className="h-6 bg-foreground/5 flex items-center justify-center">
            <div className="w-16 h-1 bg-foreground/20 rounded-full" />
          </div>
        )}

        {/* App Content */}
        <div 
          className="bg-background min-h-[400px]"
          style={{ opacity: frictionOpacity }}
        >
          <Card className="border-0 shadow-none rounded-none">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{uiContext.title}</CardTitle>
                <StateIndicator state={state} size="sm" />
              </div>
              {friction > 0 && (
                <div className="pt-2">
                  <FrictionMeter friction={friction} size="sm" />
                </div>
              )}
            </CardHeader>
            <CardContent className="pb-4">
              {renderStateUI()}
            </CardContent>
            {isHighFriction && (
              <CardFooter className="pt-0">
                <p className="text-xs text-muted-foreground text-center w-full">
                  ⚠️ Alta fricção - interações limitadas
                </p>
              </CardFooter>
            )}
          </Card>
        </div>

        {/* Home Indicator (mobile) */}
        {viewMode === 'mobile' && (
          <div className="h-5 bg-foreground/5 flex items-center justify-center">
            <div className="w-24 h-1 bg-foreground/20 rounded-full" />
          </div>
        )}
      </div>

      {/* Debug Info */}
      <div className="text-xs text-muted-foreground text-center space-x-4">
        <span>Estado: <code className="bg-muted px-1 rounded">{state}</code></span>
        <span>Fricção: <code className="bg-muted px-1 rounded">{(friction * 100).toFixed(0)}%</code></span>
        <span>Itens: <code className="bg-muted px-1 rounded">{items.length}</code></span>
      </div>
    </div>
  );
}
