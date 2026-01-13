import React, { useEffect, useState, useMemo, useRef } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Loader2 } from "lucide-react";
import { createLiveCodeScope } from "@/components/preview/live-code/createScope";
import { compileLiveComponent } from "@/components/preview/live-code/transform";

interface LiveCodeRendererProps {
  code: string;
  className?: string;
}

// Cache global para componentes renderizados (evita re-execução quando código não muda)
const componentCache = new Map<string, React.ComponentType>();

export function LiveCodeRenderer({ code, className }: LiveCodeRendererProps) {
  const [error, setError] = useState<string | null>(null);
  const [RenderedComponent, setRenderedComponent] = useState<
    React.ComponentType | null
  >(null);
  const [isLoading, setIsLoading] = useState(true);
  const isInitialMount = useRef(true);
  const lastErrorRef = useRef<string | null>(null);

  // Memoizar o componente compilado - só re-executa se o código mudar
  const memoizedComponent = useMemo(() => {
    if (!code) {
      lastErrorRef.current = null;
      return null;
    }

    // Verificar cache primeiro (evita re-compilação)
    if (componentCache.has(code)) {
      lastErrorRef.current = null;
      return componentCache.get(code)!;
    }

    try {
      const scope = createLiveCodeScope();
      const scopeKeys = Object.keys(scope);
      const scopeValues = Object.values(scope);

      const compiledCode = compileLiveComponent(code);

      // Create function with scope variables as parameters
      const createComponent = new Function(
        ...scopeKeys,
        `
"use strict";
try {
  ${compiledCode}
  return __LIVE_COMPONENT__;
} catch (e) {
  throw new Error('Runtime error: ' + (e?.message ?? String(e)));
}
`
      );

      // Execute with scope values
      const Component = createComponent(...scopeValues);

      if (typeof Component === "function") {
        // Armazenar no cache para reutilização
        componentCache.set(code, Component);
        lastErrorRef.current = null;
        return Component;
      } else {
        throw new Error("O código não retornou um componente React válido");
      }
    } catch (err) {
      console.error("Code execution error:", err);
      // Log mais detalhes do erro para debug
      let errorMessage = "Erro ao compilar código";
      if (err instanceof Error) {
        errorMessage = err.message;
        console.error("Error message:", err.message);
        console.error("Error stack:", err.stack);
        // Tentar extrair linha do erro se disponível
        const lineMatch = err.message.match(/\((\d+):(\d+)\)/);
        if (lineMatch) {
          const lineNum = parseInt(lineMatch[1]);
          const colNum = parseInt(lineMatch[2]);
          const codeLines = code.split('\n');
          if (lineNum <= codeLines.length) {
            console.error("Erro na linha:", lineNum, "coluna:", colNum);
            console.error("Código da linha:", codeLines[lineNum - 1]);
            console.error("Contexto (3 linhas antes e depois):");
            const start = Math.max(0, lineNum - 4);
            const end = Math.min(codeLines.length, lineNum + 3);
            codeLines.slice(start, end).forEach((line, idx) => {
              const actualLine = start + idx + 1;
              const marker = actualLine === lineNum ? '>>> ' : '    ';
              console.error(`${marker}${actualLine}: ${line}`);
            });
          }
        }
      }
      // Armazenar mensagem de erro para exibir
      lastErrorRef.current = errorMessage;
      // Não armazenar erros no cache
      return null;
    }
  }, [code]);

  useEffect(() => {
    if (!code) {
      setIsLoading(false);
      setRenderedComponent(null);
      return;
    }

    // Se o código está no cache, usar o componente do cache diretamente
    // Isso evita re-execução quando o componente é remontado (ex: mudança de aba)
    if (componentCache.has(code)) {
      const cachedComponent = componentCache.get(code)!;
      // Só atualizar se o componente renderizado for diferente
      if (RenderedComponent !== cachedComponent) {
        setRenderedComponent(() => cachedComponent);
        setError(null);
        setIsLoading(false);
      }
      return;
    }

    // Se é o primeiro mount e já temos o componente memoizado, usar direto
    if (isInitialMount.current && memoizedComponent) {
      setRenderedComponent(() => memoizedComponent);
      setError(null);
      setIsLoading(false);
      isInitialMount.current = false;
      return;
    }

    // Se o código mudou, atualizar componente
    if (memoizedComponent) {
      // Se já temos o componente renderizado e é o mesmo, não fazer nada
      if (RenderedComponent === memoizedComponent) {
        setIsLoading(false);
        return;
      }

      // Só mostrar loading se realmente não temos componente ainda
      if (!RenderedComponent) {
        setIsLoading(true);
      }
      setError(null);
      
      // Atualizar componente imediatamente (sem delay desnecessário)
      setRenderedComponent(() => memoizedComponent);
      setIsLoading(false);
    } else if (memoizedComponent === null && code) {
      // Se houve erro na compilação, usar mensagem detalhada do erro
      const errorMsg = lastErrorRef.current || "Erro ao compilar código gerado. Verifique o console do navegador (F12) para detalhes.";
      setError(errorMsg);
      setRenderedComponent(null);
      setIsLoading(false);
    }
  }, [code, memoizedComponent, RenderedComponent]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    // Extrair informações úteis do erro
    const errorLines = error.split('\n');
    const mainError = errorLines[0] || error;
    const hasLineInfo = error.includes('(') && error.includes(')');
    
    return (
      <Alert variant="destructive" className="m-4">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="text-xs">
          <strong>Erro na renderização do código gerado:</strong>
          <p className="mt-2 font-medium">{mainError}</p>
          {hasLineInfo && (
            <p className="mt-1 text-muted-foreground">
              Verifique o console do navegador (F12) para ver a linha exata do erro.
            </p>
          )}
          <details className="mt-2">
            <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
              Ver detalhes completos
            </summary>
            <pre className="mt-2 whitespace-pre-wrap font-mono text-xs bg-destructive/10 p-2 rounded overflow-auto max-h-40">
              {error}
            </pre>
          </details>
          <p className="mt-2 text-xs text-muted-foreground">
            💡 Dica: O código gerado pela IA pode ter erros de sintaxe. Tente regenerar o app.
          </p>
        </AlertDescription>
      </Alert>
    );
  }

  if (!RenderedComponent) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        Nenhum componente para renderizar
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className={className}>
        <RenderedComponent />
      </div>
    </ErrorBoundary>
  );
}

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <Alert variant="destructive" className="m-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            <strong>Erro no componente:</strong>
            <pre className="mt-2 whitespace-pre-wrap font-mono text-xs">
              {this.state.error?.message}
            </pre>
          </AlertDescription>
        </Alert>
      );
    }

    return this.props.children;
  }
}
