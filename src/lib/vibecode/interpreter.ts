import { 
  ParsedVibeCode, 
  VibeState, 
  VibeCodeContext, 
  VALID_TRANSITIONS 
} from './types';
import { parseVibeCode } from './parser';

/**
 * VibeCode Interpreter - Transforms parsed VibeCode into executable context
 */
export class VibeCodeInterpreter {
  private context: VibeCodeContext;
  private parsed: ParsedVibeCode;

  constructor(vibeCode: string) {
    this.parsed = parseVibeCode(vibeCode);
    this.context = {
      state: this.parsed.initialState,
      friction: this.parsed.initialFriction,
      history: [{
        state: this.parsed.initialState,
        friction: this.parsed.initialFriction,
        timestamp: Date.now(),
      }],
    };
  }

  /**
   * Get current context
   */
  getContext(): VibeCodeContext {
    return { ...this.context };
  }

  /**
   * Get parsed VibeCode structure
   */
  getParsed(): ParsedVibeCode {
    return { ...this.parsed };
  }

  /**
   * Check if transition to target state is valid
   */
  canTransitionTo(targetState: VibeState): boolean {
    return VALID_TRANSITIONS.some(
      t => t.from === this.context.state && t.to === targetState
    );
  }

  /**
   * Get available transitions from current state
   */
  getAvailableTransitions(): VibeState[] {
    return VALID_TRANSITIONS
      .filter(t => t.from === this.context.state)
      .map(t => t.to);
  }

  /**
   * Transition to a new state
   */
  transitionTo(targetState: VibeState): boolean {
    if (!this.canTransitionTo(targetState)) {
      console.warn(`Invalid transition: ${this.context.state} -> ${targetState}`);
      return false;
    }

    this.context.state = targetState;
    this.context.history.push({
      state: targetState,
      friction: this.context.friction,
      timestamp: Date.now(),
    });

    return true;
  }

  /**
   * Set friction level (0-1)
   */
  setFriction(value: number): boolean {
    if (value < 0 || value > 1) {
      console.warn(`Invalid friction value: ${value}. Must be between 0 and 1.`);
      return false;
    }

    this.context.friction = value;
    this.context.history.push({
      state: this.context.state,
      friction: value,
      timestamp: Date.now(),
    });

    return true;
  }

  /**
   * Increase friction by a delta value
   */
  increaseFriction(delta: number): boolean {
    const newValue = Math.min(1, this.context.friction + delta);
    return this.setFriction(newValue);
  }

  /**
   * Reset to initial state
   */
  reset(): void {
    this.context = {
      state: this.parsed.initialState,
      friction: this.parsed.initialFriction,
      history: [{
        state: this.parsed.initialState,
        friction: this.parsed.initialFriction,
        timestamp: Date.now(),
      }],
    };
  }

  /**
   * Check if current state matches friction threshold for UI decisions
   */
  shouldShowFriction(): boolean {
    return this.context.friction > 0;
  }

  /**
   * Get friction level as CSS opacity or similar value
   */
  getFrictionOpacity(): number {
    return 1 - this.context.friction;
  }

  /**
   * Get state color mapping for UI
   */
  getStateColor(): string {
    const colors: Record<VibeState, string> = {
      CANDIDATE: 'hsl(var(--muted))',
      RUNNING: 'hsl(var(--primary))',
      COOLING: 'hsl(var(--accent))',
      DONE: 'hsl(142 76% 36%)', // green
      ERROR: 'hsl(var(--destructive))',
    };
    return colors[this.context.state];
  }
}

/**
 * Factory function to create interpreter from VibeCode string
 */
export function createInterpreter(vibeCode: string): VibeCodeInterpreter {
  return new VibeCodeInterpreter(vibeCode);
}
