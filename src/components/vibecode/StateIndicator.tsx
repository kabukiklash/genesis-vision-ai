import { VibeState } from '@/lib/vibecode';
import { cn } from '@/lib/utils';
import { Activity, Pause, CheckCircle, AlertCircle, Clock } from 'lucide-react';

interface StateIndicatorProps {
  state: VibeState;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

const stateConfig: Record<VibeState, { 
  icon: React.ComponentType<{ className?: string }>; 
  label: string; 
  colorClass: string;
}> = {
  CANDIDATE: { 
    icon: Clock, 
    label: 'Candidato', 
    colorClass: 'text-muted-foreground bg-muted' 
  },
  RUNNING: { 
    icon: Activity, 
    label: 'Executando', 
    colorClass: 'text-primary bg-primary/20' 
  },
  COOLING: { 
    icon: Pause, 
    label: 'Resfriando', 
    colorClass: 'text-accent-foreground bg-accent' 
  },
  DONE: { 
    icon: CheckCircle, 
    label: 'Concluído', 
    colorClass: 'text-green-600 bg-green-500/20' 
  },
  ERROR: { 
    icon: AlertCircle, 
    label: 'Erro', 
    colorClass: 'text-destructive bg-destructive/20' 
  },
};

const sizeClasses = {
  sm: 'h-6 px-2 text-xs gap-1',
  md: 'h-8 px-3 text-sm gap-2',
  lg: 'h-10 px-4 text-base gap-2',
};

const iconSizes = {
  sm: 'h-3 w-3',
  md: 'h-4 w-4',
  lg: 'h-5 w-5',
};

export function StateIndicator({ 
  state, 
  size = 'md', 
  showLabel = true 
}: StateIndicatorProps) {
  const config = stateConfig[state];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full font-medium transition-colors',
        sizeClasses[size],
        config.colorClass
      )}
    >
      <Icon className={iconSizes[size]} />
      {showLabel && <span>{config.label}</span>}
    </div>
  );
}
