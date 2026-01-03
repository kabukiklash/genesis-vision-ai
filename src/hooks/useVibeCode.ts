import { useState, useCallback, useMemo } from 'react';
import { 
  VibeCodeInterpreter, 
  createInterpreter, 
  VibeState, 
  VibeCodeContext,
  ParsedVibeCode 
} from '@/lib/vibecode';

export interface UseVibeCodeReturn {
  // Current state
  context: VibeCodeContext;
  parsed: ParsedVibeCode;
  
  // State machine controls
  state: VibeState;
  friction: number;
  
  // Actions
  transitionTo: (state: VibeState) => boolean;
  setFriction: (value: number) => boolean;
  increaseFriction: (delta: number) => boolean;
  reset: () => void;
  
  // Queries
  canTransitionTo: (state: VibeState) => boolean;
  availableTransitions: VibeState[];
  
  // UI helpers
  stateColor: string;
  frictionOpacity: number;
  shouldShowFriction: boolean;
  
  // Validation
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * React hook for managing VibeCode state machine
 */
export function useVibeCode(vibeCode: string): UseVibeCodeReturn {
  const interpreter = useMemo(() => createInterpreter(vibeCode), [vibeCode]);
  
  const [context, setContext] = useState<VibeCodeContext>(interpreter.getContext());
  
  const updateContext = useCallback(() => {
    setContext(interpreter.getContext());
  }, [interpreter]);

  const transitionTo = useCallback((targetState: VibeState): boolean => {
    const success = interpreter.transitionTo(targetState);
    if (success) updateContext();
    return success;
  }, [interpreter, updateContext]);

  const setFriction = useCallback((value: number): boolean => {
    const success = interpreter.setFriction(value);
    if (success) updateContext();
    return success;
  }, [interpreter, updateContext]);

  const increaseFriction = useCallback((delta: number): boolean => {
    const success = interpreter.increaseFriction(delta);
    if (success) updateContext();
    return success;
  }, [interpreter, updateContext]);

  const reset = useCallback(() => {
    interpreter.reset();
    updateContext();
  }, [interpreter, updateContext]);

  const canTransitionTo = useCallback((state: VibeState): boolean => {
    return interpreter.canTransitionTo(state);
  }, [interpreter]);

  const parsed = interpreter.getParsed();

  return {
    // Current state
    context,
    parsed,
    
    // Convenience accessors
    state: context.state,
    friction: context.friction,
    
    // Actions
    transitionTo,
    setFriction,
    increaseFriction,
    reset,
    
    // Queries
    canTransitionTo,
    availableTransitions: interpreter.getAvailableTransitions(),
    
    // UI helpers
    stateColor: interpreter.getStateColor(),
    frictionOpacity: interpreter.getFrictionOpacity(),
    shouldShowFriction: interpreter.shouldShowFriction(),
    
    // Validation
    isValid: parsed.isValid,
    errors: parsed.errors,
    warnings: parsed.warnings,
  };
}
