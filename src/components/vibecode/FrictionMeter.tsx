import { cn } from '@/lib/utils';

interface FrictionMeterProps {
  friction: number;
  showValue?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: 'h-2',
  md: 'h-3',
  lg: 'h-4',
};

export function FrictionMeter({ 
  friction, 
  showValue = true,
  size = 'md' 
}: FrictionMeterProps) {
  const percentage = Math.round(friction * 100);
  
  // Color gradient based on friction level
  const getBarColor = () => {
    if (friction <= 0.3) return 'bg-green-500';
    if (friction <= 0.6) return 'bg-yellow-500';
    if (friction <= 0.8) return 'bg-orange-500';
    return 'bg-red-500';
  };

  return (
    <div className="flex items-center gap-3 w-full">
      <div className={cn(
        'flex-1 bg-muted rounded-full overflow-hidden',
        sizeClasses[size]
      )}>
        <div
          className={cn(
            'h-full transition-all duration-300 ease-out rounded-full',
            getBarColor()
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showValue && (
        <span className="text-sm font-mono text-muted-foreground min-w-[3ch]">
          {percentage}%
        </span>
      )}
    </div>
  );
}
