import { useVibeCode } from '@/hooks/useVibeCode';
import { StateIndicator } from './StateIndicator';
import { FrictionMeter } from './FrictionMeter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { VibeState } from '@/lib/vibecode';
import { RotateCcw, ChevronRight } from 'lucide-react';

interface VibeCodePreviewProps {
  vibeCode: string;
  title?: string;
}

export function VibeCodePreview({ vibeCode, title = 'VibeCode Preview' }: VibeCodePreviewProps) {
  const {
    state,
    friction,
    transitionTo,
    reset,
    availableTransitions,
    isValid,
    errors,
    warnings,
  } = useVibeCode(vibeCode);

  return (
    <Card className="w-full">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{title}</CardTitle>
          <Button variant="ghost" size="sm" onClick={reset}>
            <RotateCcw className="h-4 w-4 mr-1" />
            Reset
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Validation Status */}
        {!isValid && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
            <p className="text-sm font-medium text-destructive mb-2">Erros de Validação:</p>
            <ul className="text-xs text-destructive/80 space-y-1">
              {errors.map((error, i) => (
                <li key={i}>• {error}</li>
              ))}
            </ul>
          </div>
        )}

        {warnings.length > 0 && (
          <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
            <p className="text-sm font-medium text-yellow-600 mb-2">Avisos:</p>
            <ul className="text-xs text-yellow-600/80 space-y-1">
              {warnings.map((warning, i) => (
                <li key={i}>• {warning}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Current State */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">Estado Atual</label>
          <StateIndicator state={state} size="lg" />
        </div>

        {/* Friction Level */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">Nível de Fricção</label>
          <FrictionMeter friction={friction} size="lg" />
        </div>

        {/* Available Transitions */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">Transições Disponíveis</label>
          <div className="flex flex-wrap gap-2">
            {availableTransitions.length > 0 ? (
              availableTransitions.map((targetState) => (
                <Button
                  key={targetState}
                  variant="outline"
                  size="sm"
                  onClick={() => transitionTo(targetState)}
                  className="gap-1"
                >
                  <ChevronRight className="h-3 w-3" />
                  {targetState}
                </Button>
              ))
            ) : (
              <Badge variant="secondary">Nenhuma transição disponível</Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
