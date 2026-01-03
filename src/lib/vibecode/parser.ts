import { 
  VibeCodeToken, 
  ParsedVibeCode, 
  VibeState, 
  VALID_STATES 
} from './types';

/**
 * Tokenizes and parses VibeCode into structured format
 */
export function parseVibeCode(code: string): ParsedVibeCode {
  const tokens: VibeCodeToken[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];
  
  let initialState: VibeState = 'CANDIDATE';
  let initialFriction = 0;
  const frictionIncrements: number[] = [];

  const lines = code.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const lineNum = i + 1;
    
    // Skip empty lines and comments
    if (!line || line.startsWith('//') || line.startsWith('#')) {
      continue;
    }

    // Parse: set state = STATE
    const stateMatch = line.match(/^set\s+state\s*=\s*(\w+)$/i);
    if (stateMatch) {
      const stateValue = stateMatch[1].toUpperCase() as VibeState;
      
      if (!VALID_STATES.includes(stateValue)) {
        errors.push(`Line ${lineNum}: Invalid state "${stateMatch[1]}". Valid states: ${VALID_STATES.join(', ')}`);
        continue;
      }
      
      tokens.push({
        type: 'SET_STATE',
        value: stateValue,
        line: lineNum,
      });
      
      // First state declaration sets initial state
      if (tokens.filter(t => t.type === 'SET_STATE').length === 1) {
        initialState = stateValue;
      }
      continue;
    }

    // Parse: set friction = NUMBER
    const frictionMatch = line.match(/^set\s+friction\s*=\s*([\d.]+)$/i);
    if (frictionMatch) {
      const frictionValue = parseFloat(frictionMatch[1]);
      
      if (isNaN(frictionValue) || frictionValue < 0 || frictionValue > 1) {
        errors.push(`Line ${lineNum}: Friction must be a number between 0 and 1`);
        continue;
      }
      
      tokens.push({
        type: 'SET_FRICTION',
        value: frictionValue,
        line: lineNum,
      });
      
      // First friction declaration sets initial friction
      if (tokens.filter(t => t.type === 'SET_FRICTION').length === 1) {
        initialFriction = frictionValue;
      }
      continue;
    }

    // Parse: increase friction by NUMBER
    const increaseMatch = line.match(/^increase\s+friction\s+by\s+([\d.]+)$/i);
    if (increaseMatch) {
      const incrementValue = parseFloat(increaseMatch[1]);
      
      if (isNaN(incrementValue) || incrementValue < 0 || incrementValue > 1) {
        errors.push(`Line ${lineNum}: Friction increment must be a number between 0 and 1`);
        continue;
      }
      
      tokens.push({
        type: 'INCREASE_FRICTION',
        value: incrementValue,
        line: lineNum,
      });
      
      frictionIncrements.push(incrementValue);
      continue;
    }

    // Detect forbidden patterns (active logic)
    const forbiddenPatterns = [
      { pattern: /\bif\b/, name: 'if statement' },
      { pattern: /\belse\b/, name: 'else statement' },
      { pattern: /\bfor\b/, name: 'for loop' },
      { pattern: /\bwhile\b/, name: 'while loop' },
      { pattern: /\bfunction\b/, name: 'function declaration' },
      { pattern: /\breturn\b/, name: 'return statement' },
      { pattern: /\bcell\b/, name: 'cell keyword' },
      { pattern: /\btrigger\b/, name: 'trigger keyword' },
      { pattern: /\bwhen\b/, name: 'when keyword' },
      { pattern: /[+\-*/]/, name: 'mathematical operation' },
    ];

    for (const { pattern, name } of forbiddenPatterns) {
      if (pattern.test(line)) {
        errors.push(`Line ${lineNum}: Forbidden pattern detected - ${name}. VibeCode is purely declarative.`);
      }
    }

    // If no pattern matched, it's an unrecognized command
    if (!errors.some(e => e.includes(`Line ${lineNum}`))) {
      errors.push(`Line ${lineNum}: Unrecognized command "${line}"`);
    }
  }

  // Validation warnings
  if (tokens.filter(t => t.type === 'SET_STATE').length === 0) {
    warnings.push('No state declaration found. Defaulting to CANDIDATE.');
  }
  
  if (tokens.filter(t => t.type === 'SET_FRICTION').length === 0) {
    warnings.push('No friction declaration found. Defaulting to 0.');
  }

  return {
    tokens,
    initialState,
    initialFriction,
    frictionIncrements,
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validates VibeCode string and returns detailed feedback
 */
export function validateVibeCode(code: string): { valid: boolean; errors: string[]; warnings: string[] } {
  const parsed = parseVibeCode(code);
  return {
    valid: parsed.isValid,
    errors: parsed.errors,
    warnings: parsed.warnings,
  };
}
