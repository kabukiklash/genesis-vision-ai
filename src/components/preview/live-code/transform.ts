import { transform as sucraseTransform } from "sucrase";

function stripMarkdownFences(input: string) {
  return input.replace(/^```[a-zA-Z]*\n?/gm, "").replace(/```$/gm, "");
}

function stripImportsExports(input: string) {
  let out = input;

  // Remove ALL import statements (handles multi-line imports)
  // Pattern 1: import ... from "...";
  out = out.replace(/import\s+[\s\S]*?from\s*['"][^'"]+['"];?/g, "");
  // Pattern 2: import "..."; (side-effect imports)
  out = out.replace(/import\s+['"][^'"]+['"];?/g, "");

  // Remove export keywords
  out = out.replace(/export\s+default\s+/g, "");
  out = out.replace(/export\s+(const|function|class|type|interface)\s+/g, "$1 ");

  return out;
}

function guessComponentName(transformed: string) {
  const functionMatch = transformed.match(/function\s+(\w+)/);
  const constMatch = transformed.match(
    /(?:const|let|var)\s+(\w+)\s*=\s*(?:\([^)]*\)\s*=>|\(\s*\)\s*=>|function)/
  );

  return functionMatch?.[1] || constMatch?.[1] || "App";
}

export function compileLiveComponent(code: string) {
  const stripped = stripImportsExports(stripMarkdownFences(code));
  const componentName = guessComponentName(stripped);

  // Important: sucrase may inject top-level declarations (e.g. const helpers).
  // So we compile a *program* that assigns into a known variable, instead of
  // expecting the compiled output to be a pure expression.
  const program = `
var __LIVE_COMPONENT__ = (function() {
${stripped}
return ${componentName};
})();
`;

  try {
    // Compile TSX/JSX -> JS (so we don't get: Unexpected token '<')
    const compiled = sucraseTransform(program, {
      transforms: ["typescript", "jsx"],
    }).code;

    return compiled;
  } catch (err) {
    // Melhorar mensagem de erro do sucrase
    if (err instanceof Error) {
      const originalMessage = err.message;
      // Tentar extrair linha do erro
      const lineMatch = originalMessage.match(/\((\d+):(\d+)\)/);
      if (lineMatch) {
        const lineNum = parseInt(lineMatch[1]);
        const codeLines = stripped.split('\n');
        if (lineNum <= codeLines.length) {
          const errorLine = codeLines[lineNum - 1];
          throw new Error(
            `${originalMessage}\n\nLinha ${lineNum}: ${errorLine.trim()}\n\n` +
            `Isso geralmente indica um erro de sintaxe no código gerado pela IA. ` +
            `Verifique aspas, chaves, parênteses ou template strings não fechadas.`
          );
        }
      }
      throw err;
    }
    throw err;
  }
}
