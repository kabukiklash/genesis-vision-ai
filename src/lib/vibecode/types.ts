// VibeCode Domain Types

export type VibeState = 'CANDIDATE' | 'RUNNING' | 'COOLING' | 'DONE' | 'ERROR';

export interface VibeCodeToken {
  type: 'SET_STATE' | 'SET_FRICTION' | 'INCREASE_FRICTION';
  value: VibeState | number;
  line: number;
}

export interface ParsedVibeCode {
  tokens: VibeCodeToken[];
  initialState: VibeState;
  initialFriction: number;
  frictionIncrements: number[];
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface VibeCodeContext {
  state: VibeState;
  friction: number;
  history: { state: VibeState; friction: number; timestamp: number }[];
}

export interface StateTransition {
  from: VibeState;
  to: VibeState;
  condition?: string;
}

// Valid state transitions based on VibeCode spec
export const VALID_TRANSITIONS: StateTransition[] = [
  { from: 'CANDIDATE', to: 'RUNNING' },
  { from: 'RUNNING', to: 'COOLING' },
  { from: 'RUNNING', to: 'ERROR' },
  { from: 'COOLING', to: 'RUNNING' },
  { from: 'COOLING', to: 'DONE' },
  { from: 'COOLING', to: 'ERROR' },
  { from: 'ERROR', to: 'CANDIDATE' },
  { from: 'DONE', to: 'CANDIDATE' },
];

export const VALID_STATES: VibeState[] = ['CANDIDATE', 'RUNNING', 'COOLING', 'DONE', 'ERROR'];
