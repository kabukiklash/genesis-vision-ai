import { describe, it, expect } from 'vitest';
import { parseVibeCode, validateVibeCode } from '../parser';
import type { ParsedVibeCode } from '../types';

describe('parseVibeCode', () => {
  it('should parse valid state declaration', () => {
    const code = 'set state = RUNNING';
    const result = parseVibeCode(code);

    expect(result.isValid).toBe(true);
    expect(result.initialState).toBe('RUNNING');
    expect(result.tokens).toHaveLength(1);
    expect(result.tokens[0]).toMatchObject({
      type: 'SET_STATE',
      value: 'RUNNING',
      line: 1,
    });
  });

  it('should parse valid friction declaration', () => {
    const code = 'set friction = 0.5';
    const result = parseVibeCode(code);

    expect(result.isValid).toBe(true);
    expect(result.initialFriction).toBe(0.5);
    expect(result.tokens[0]).toMatchObject({
      type: 'SET_FRICTION',
      value: 0.5,
      line: 1,
    });
  });

  it('should parse increase friction command', () => {
    const code = 'increase friction by 0.2';
    const result = parseVibeCode(code);

    expect(result.isValid).toBe(true);
    expect(result.frictionIncrements).toContain(0.2);
    expect(result.tokens[0]).toMatchObject({
      type: 'INCREASE_FRICTION',
      value: 0.2,
      line: 1,
    });
  });

  it('should parse multiple commands', () => {
    const code = `
      set state = CANDIDATE
      set friction = 0.3
      increase friction by 0.1
    `;
    const result = parseVibeCode(code);

    expect(result.isValid).toBe(true);
    expect(result.initialState).toBe('CANDIDATE');
    expect(result.initialFriction).toBe(0.3);
    expect(result.tokens).toHaveLength(3);
  });

  it('should ignore comments and empty lines', () => {
    const code = `
      // This is a comment
      set state = RUNNING
      # Another comment
      set friction = 0.5
    `;
    const result = parseVibeCode(code);

    expect(result.isValid).toBe(true);
    expect(result.tokens).toHaveLength(2);
  });

  it('should reject invalid state', () => {
    const code = 'set state = INVALID';
    const result = parseVibeCode(code);

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain('Invalid state');
  });

  it('should reject friction out of range', () => {
    const code = 'set friction = 1.5';
    const result = parseVibeCode(code);

    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.includes('between 0 and 1'))).toBe(true);
  });

  it('should reject forbidden patterns - if statement', () => {
    const code = 'if something then do';
    const result = parseVibeCode(code);

    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.includes('if statement'))).toBe(true);
  });

  it('should reject forbidden patterns - mathematical operations', () => {
    const code = 'set value = 1 + 2';
    const result = parseVibeCode(code);

    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.includes('mathematical operation'))).toBe(true);
  });

  it('should reject unrecognized commands', () => {
    const code = 'do something weird';
    const result = parseVibeCode(code);

    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.includes('Unrecognized command'))).toBe(true);
  });

  it('should warn when no state declaration found', () => {
    const code = 'set friction = 0.5';
    const result = parseVibeCode(code);

    expect(result.warnings.some(w => w.includes('No state declaration'))).toBe(true);
  });

  it('should warn when no friction declaration found', () => {
    const code = 'set state = RUNNING';
    const result = parseVibeCode(code);

    expect(result.warnings.some(w => w.includes('No friction declaration'))).toBe(true);
  });

  it('should handle case-insensitive state names', () => {
    const code = 'set state = running';
    const result = parseVibeCode(code);

    expect(result.isValid).toBe(true);
    expect(result.initialState).toBe('RUNNING');
  });

  it('should handle decimal friction values', () => {
    const code = 'set friction = 0.123';
    const result = parseVibeCode(code);

    expect(result.isValid).toBe(true);
    expect(result.initialFriction).toBe(0.123);
  });
});

describe('validateVibeCode', () => {
  it('should return valid for correct code', () => {
    const code = 'set state = RUNNING\nset friction = 0.5';
    const result = validateVibeCode(code);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should return invalid for incorrect code', () => {
    const code = 'set state = INVALID';
    const result = validateVibeCode(code);

    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});

