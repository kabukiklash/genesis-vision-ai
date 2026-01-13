import { describe, it, expect, beforeEach } from 'vitest';
import { VibeCodeInterpreter, createInterpreter } from '../interpreter';
import type { VibeState } from '../types';

describe('VibeCodeInterpreter', () => {
  let interpreter: VibeCodeInterpreter;

  beforeEach(() => {
    const vibeCode = `
      set state = CANDIDATE
      set friction = 0.2
    `;
    interpreter = new VibeCodeInterpreter(vibeCode);
  });

  describe('Initialization', () => {
    it('should initialize with parsed state and friction', () => {
      const context = interpreter.getContext();
      expect(context.state).toBe('CANDIDATE');
      expect(context.friction).toBe(0.2);
      expect(context.history).toHaveLength(1);
    });

    it('should default to CANDIDATE and 0 friction if not specified', () => {
      const emptyInterpreter = new VibeCodeInterpreter('');
      const context = emptyInterpreter.getContext();
      expect(context.state).toBe('CANDIDATE');
      expect(context.friction).toBe(0);
    });
  });

  describe('State Transitions', () => {
    it('should allow valid transition from CANDIDATE to RUNNING', () => {
      const result = interpreter.transitionTo('RUNNING');
      expect(result).toBe(true);
      expect(interpreter.getContext().state).toBe('RUNNING');
    });

    it('should reject invalid transition from CANDIDATE to COOLING', () => {
      const result = interpreter.transitionTo('COOLING');
      expect(result).toBe(false);
      expect(interpreter.getContext().state).toBe('CANDIDATE');
    });

    it('should record history on valid transition', () => {
      interpreter.transitionTo('RUNNING');
      const context = interpreter.getContext();
      expect(context.history.length).toBe(2);
      expect(context.history[1].state).toBe('RUNNING');
    });

    it('should check if transition is valid', () => {
      expect(interpreter.canTransitionTo('RUNNING')).toBe(true);
      expect(interpreter.canTransitionTo('COOLING')).toBe(false);
    });

    it('should get available transitions', () => {
      const transitions = interpreter.getAvailableTransitions();
      expect(transitions).toContain('RUNNING');
      expect(transitions).not.toContain('COOLING');
    });
  });

  describe('Friction Management', () => {
    it('should set friction to valid value', () => {
      const result = interpreter.setFriction(0.7);
      expect(result).toBe(true);
      expect(interpreter.getContext().friction).toBe(0.7);
    });

    it('should reject friction out of range', () => {
      const result = interpreter.setFriction(1.5);
      expect(result).toBe(false);
      expect(interpreter.getContext().friction).toBe(0.2);
    });

    it('should increase friction by delta', () => {
      interpreter.increaseFriction(0.3);
      expect(interpreter.getContext().friction).toBe(0.5);
    });

    it('should cap friction at 1.0 when increasing', () => {
      interpreter.setFriction(0.9);
      interpreter.increaseFriction(0.5);
      expect(interpreter.getContext().friction).toBe(1.0);
    });

    it('should record friction changes in history', () => {
      interpreter.setFriction(0.5);
      const context = interpreter.getContext();
      expect(context.history.length).toBe(2);
      expect(context.history[1].friction).toBe(0.5);
    });
  });

  describe('Reset', () => {
    it('should reset to initial state and friction', () => {
      interpreter.transitionTo('RUNNING');
      interpreter.setFriction(0.8);
      interpreter.reset();

      const context = interpreter.getContext();
      expect(context.state).toBe('CANDIDATE');
      expect(context.friction).toBe(0.2);
      expect(context.history.length).toBe(1);
    });
  });

  describe('UI Helpers', () => {
    it('should show friction when friction > 0', () => {
      interpreter.setFriction(0.1);
      expect(interpreter.shouldShowFriction()).toBe(true);
    });

    it('should not show friction when friction is 0', () => {
      interpreter.setFriction(0);
      expect(interpreter.shouldShowFriction()).toBe(false);
    });

    it('should calculate friction opacity correctly', () => {
      interpreter.setFriction(0.3);
      expect(interpreter.getFrictionOpacity()).toBe(0.7);
    });

    it('should return correct state color', () => {
      expect(interpreter.getStateColor()).toBeTruthy();
      
      interpreter.transitionTo('RUNNING');
      const runningColor = interpreter.getStateColor();
      expect(runningColor).toBeTruthy();
      expect(runningColor).not.toBe(interpreter.getStateColor());
    });
  });

  describe('Complex State Machine Flow', () => {
    it('should handle full workflow: CANDIDATE -> RUNNING -> COOLING -> DONE', () => {
      interpreter.transitionTo('RUNNING');
      expect(interpreter.getContext().state).toBe('RUNNING');

      interpreter.transitionTo('COOLING');
      expect(interpreter.getContext().state).toBe('COOLING');

      interpreter.transitionTo('DONE');
      expect(interpreter.getContext().state).toBe('DONE');
    });

    it('should handle error recovery: RUNNING -> ERROR -> CANDIDATE', () => {
      interpreter.transitionTo('RUNNING');
      interpreter.transitionTo('ERROR');
      expect(interpreter.getContext().state).toBe('ERROR');

      interpreter.transitionTo('CANDIDATE');
      expect(interpreter.getContext().state).toBe('CANDIDATE');
    });

    it('should handle COOLING -> RUNNING transition', () => {
      interpreter.transitionTo('RUNNING');
      interpreter.transitionTo('COOLING');
      interpreter.transitionTo('RUNNING');
      expect(interpreter.getContext().state).toBe('RUNNING');
    });
  });
});

describe('createInterpreter', () => {
  it('should create interpreter from VibeCode string', () => {
    const vibeCode = 'set state = RUNNING\nset friction = 0.5';
    const interpreter = createInterpreter(vibeCode);
    
    expect(interpreter).toBeInstanceOf(VibeCodeInterpreter);
    expect(interpreter.getContext().state).toBe('RUNNING');
    expect(interpreter.getContext().friction).toBe(0.5);
  });
});

