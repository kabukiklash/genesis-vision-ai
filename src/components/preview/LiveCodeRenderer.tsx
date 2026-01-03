import React, { useEffect, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Loader2 } from "lucide-react";
import { createLiveCodeScope } from "@/components/preview/live-code/createScope";
import { compileLiveComponent } from "@/components/preview/live-code/transform";

interface LiveCodeRendererProps {
  code: string;
  className?: string;
}

export function LiveCodeRenderer({ code, className }: LiveCodeRendererProps) {
  const [error, setError] = useState<string | null>(null);
  const [RenderedComponent, setRenderedComponent] = useState<
    React.ComponentType | null
  >(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!code) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

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
  return ${compiledCode};
} catch (e) {
  throw new Error('Runtime error: ' + (e?.message ?? String(e)));
}
`
      );

      // Execute with scope values
      const Component = createComponent(...scopeValues);

      if (typeof Component === "function") {
        setRenderedComponent(() => Component);
        setError(null);
      } else {
        throw new Error("O código não retornou um componente React válido");
      }
    } catch (err) {
      console.error("Code execution error:", err);
      setError(err instanceof Error ? err.message : "Erro ao executar código");
      setRenderedComponent(null);
    } finally {
      setIsLoading(false);
    }
  }, [code]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="m-4">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="text-xs">
          <strong>Erro na renderização:</strong>
          <pre className="mt-2 whitespace-pre-wrap font-mono text-xs">
            {error}
          </pre>
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
