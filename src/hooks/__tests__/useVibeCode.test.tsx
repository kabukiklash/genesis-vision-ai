import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useVibeCode } from '../useVibeCode';
import type { VibeState } from '@/lib/vibecode/types';

describe('useVibeCode', () => {
  const validVibeCode = `
    set state = CANDIDATE
    set friction = 0.3
  `;

  it('should initialize with correct state and friction', () => {
    const { result } = renderHook(() => useVibeCode(validVibeCode));

    expect(result.current.state).toBe('CANDIDATE');
    expect(result.current.friction).toBe(0.3);
    expect(result.current.isValid).toBe(true);
  });

  it('should provide parsed VibeCode structure', () => {
    const { result } = renderHook(() => useVibeCode(validVibeCode));

    expect(result.current.parsed).toBeDefined();
    expect(result.current.parsed.initialState).toBe('CANDIDATE');
    expect(result.current.parsed.initialFriction).toBe(0.3);
  });

  it('should transition to valid state', () => {
    const { result } = renderHook(() => useVibeCode(validVibeCode));

    act(() => {
      const success = result.current.transitionTo('RUNNING');
      expect(success).toBe(true);
    });

    expect(result.current.state).toBe('RUNNING');
  });

  it('should reject invalid transition', () => {
    const { result } = renderHook(() => useVibeCode(validVibeCode));

    act(() => {
      const success = result.current.transitionTo('COOLING');
      expect(success).toBe(false);
    });

    expect(result.current.state).toBe('CANDIDATE');
  });

  it('should set friction', () => {
    const { result } = renderHook(() => useVibeCode(validVibeCode));

    act(() => {
      const success = result.current.setFriction(0.7);
      expect(success).toBe(true);
    });

    expect(result.current.friction).toBe(0.7);
  });

  it('should increase friction', () => {
    const { result } = renderHook(() => useVibeCode(validVibeCode));

    act(() => {
      result.current.increaseFriction(0.2);
    });

    expect(result.current.friction).toBe(0.5);
  });

  it('should reset to initial state', () => {
    const { result } = renderHook(() => useVibeCode(validVibeCode));

    act(() => {
      result.current.transitionTo('RUNNING');
      result.current.setFriction(0.8);
    });

    act(() => {
      result.current.reset();
    });

    expect(result.current.state).toBe('CANDIDATE');
    expect(result.current.friction).toBe(0.3);
  });

  it('should check if transition is available', () => {
    const { result } = renderHook(() => useVibeCode(validVibeCode));

    expect(result.current.canTransitionTo('RUNNING')).toBe(true);
    expect(result.current.canTransitionTo('COOLING')).toBe(false);
  });

  it('should provide available transitions', () => {
    const { result } = renderHook(() => useVibeCode(validVibeCode));

    expect(result.current.availableTransitions).toContain('RUNNING');
    expect(result.current.availableTransitions).not.toContain('COOLING');
  });

  it('should provide UI helpers', () => {
    const { result } = renderHook(() => useVibeCode(validVibeCode));

    expect(result.current.stateColor).toBeTruthy();
    expect(result.current.frictionOpacity).toBeGreaterThanOrEqual(0);
    expect(result.current.frictionOpacity).toBeLessThanOrEqual(1);
    expect(typeof result.current.shouldShowFriction).toBe('boolean');
  });

  it('should handle invalid VibeCode', () => {
    const invalidCode = 'set state = INVALID';
    const { result } = renderHook(() => useVibeCode(invalidCode));

    expect(result.current.isValid).toBe(false);
    expect(result.current.errors.length).toBeGreaterThan(0);
  });

  it('should update context when state changes', () => {
    const { result } = renderHook(() => useVibeCode(validVibeCode));

    const initialContext = result.current.context;

    act(() => {
      result.current.transitionTo('RUNNING');
    });

    expect(result.current.context.state).toBe('RUNNING');
    expect(result.current.context.history.length).toBeGreaterThan(initialContext.history.length);
  });

  it('should memoize interpreter on VibeCode change', () => {
    const { result, rerender } = renderHook(
      ({ code }) => useVibeCode(code),
      { initialProps: { code: validVibeCode } }
    );

    const firstInterpreter = result.current.parsed;

    rerender({ code: validVibeCode });
    // Should be same instance if code didn't change
    expect(result.current.parsed).toBe(firstInterpreter);

    rerender({ code: 'set state = RUNNING\nset friction = 0.5' });
    // Should be different instance if code changed
    expect(result.current.parsed.initialState).toBe('RUNNING');
  });
});

