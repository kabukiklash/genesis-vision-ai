import React, { useMemo, useState, useEffect } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Loader2 } from 'lucide-react';

// Pre-imported components that generated code can use
import * as UICard from '@/components/ui/card';
import * as UIButton from '@/components/ui/button';
import * as UIInput from '@/components/ui/input';
import * as UITabs from '@/components/ui/tabs';
import * as UIProgress from '@/components/ui/progress';
import * as UIBadge from '@/components/ui/badge';
import * as UIAlert from '@/components/ui/alert';
import * as UISelect from '@/components/ui/select';
import * as UICheckbox from '@/components/ui/checkbox';
import * as UISwitch from '@/components/ui/switch';
import * as UILabel from '@/components/ui/label';
import * as UITextarea from '@/components/ui/textarea';
import * as UIDialog from '@/components/ui/dialog';
import * as UITable from '@/components/ui/table';
import * as UIScrollArea from '@/components/ui/scroll-area';
import * as UIAvatar from '@/components/ui/avatar';
import * as UIAccordion from '@/components/ui/accordion';
import * as LucideIcons from 'lucide-react';

interface LiveCodeRendererProps {
  code: string;
  className?: string;
}

// Create a scope with all available components
const createScope = () => ({
  React,
  useState: React.useState,
  useEffect: React.useEffect,
  useCallback: React.useCallback,
  useMemo: React.useMemo,
  useRef: React.useRef,
  // UI Components
  ...UICard,
  ...UIButton,
  ...UIInput,
  ...UITabs,
  ...UIProgress,
  ...UIBadge,
  ...UIAlert,
  ...UISelect,
  ...UICheckbox,
  ...UISwitch,
  ...UILabel,
  ...UITextarea,
  ...UIDialog,
  ...UITable,
  ...UIScrollArea,
  ...UIAvatar,
  ...UIAccordion,
  // All Lucide Icons
  ...LucideIcons,
});

// Transform component code to be executable
function transformCode(code: string): string {
  // Strip Markdown fences (```tsx ... ```)
  let transformed = code
    .replace(/^```[a-zA-Z]*\n?/gm, '')
    .replace(/```$/gm, '');

  // Remove ALL import statements (handles multi-line imports)
  // Pattern 1: import ... from "...";
  transformed = transformed.replace(/import\s+[\s\S]*?from\s*['"][^'"]+['"];?/g, '');
  // Pattern 2: import "..."; (side-effect imports)
  transformed = transformed.replace(/import\s+['"][^'"]+['"];?/g, '');

  // Remove export keywords
  transformed = transformed.replace(/export\s+default\s+/g, '');
  transformed = transformed.replace(/export\s+(const|function|class|type|interface)\s+/g, '$1 ');

  // --- Naive TypeScript stripping (good enough for generated TSX) ---
  // Remove type aliases: type X = ...;
  transformed = transformed.replace(/^\s*type\s+\w+[^=]*=\s*[^;]+;/gm, '');
  // Remove interfaces: interface X { ... } (handles multi-line)
  transformed = transformed.replace(/interface\s+\w+\s*\{[^}]*\}/g, '');
  // Remove `as SomeType`
  transformed = transformed.replace(/\s+as\s+[A-Za-z0-9_\[\]<>.,\s|&]+(?=[,;)\]}])/g, '');
  // Remove generic annotations in useState/useRef/etc: useState<Type>(
  transformed = transformed.replace(/(useState|useRef|useMemo|useCallback)\s*<[^>]+>\s*\(/g, '$1(');
  // Remove variable/const annotations: const x: X =
  transformed = transformed.replace(/(const|let|var)\s+(\w+)\s*:\s*[^=]+(?=\s*=)/g, '$1 $2');
  // Remove function return types: ): X => or ): X {
  transformed = transformed.replace(/\)\s*:\s*[^{=>]+(?=\s*[{=])/g, ')');
  // Remove parameter type annotations within parentheses
  transformed = transformed.replace(/(\w+)\s*:\s*[A-Za-z0-9_\[\]<>|&\s]+(?=[,)])/g, '$1');

  // Find the component name (function ComponentName or const ComponentName)
  const functionMatch = transformed.match(/function\s+(\w+)/);
  const constMatch = transformed.match(/(?:const|let|var)\s+(\w+)\s*=\s*(?:\([^)]*\)\s*=>|\(\s*\)\s*=>|function)/);

  const componentName = functionMatch?.[1] || constMatch?.[1] || 'App';

  // Wrap in an IIFE that returns the component
  transformed = `
    (function() {
      ${transformed}
      return ${componentName};
    })()
  `;

  return transformed;
}

export function LiveCodeRenderer({ code, className }: LiveCodeRendererProps) {
  const [error, setError] = useState<string | null>(null);
  const [RenderedComponent, setRenderedComponent] = useState<React.ComponentType | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!code) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const scope = createScope();
      const scopeKeys = Object.keys(scope);
      const scopeValues = Object.values(scope);
      
      const transformedCode = transformCode(code);
      
      // Create function with scope variables as parameters
      const createComponent = new Function(...scopeKeys, `
        "use strict";
        try {
          return ${transformedCode};
        } catch (e) {
          throw new Error('Runtime error: ' + e.message);
        }
      `);
      
      // Execute with scope values
      const Component = createComponent(...scopeValues);
      
      if (typeof Component === 'function') {
        setRenderedComponent(() => Component);
        setError(null);
      } else {
        throw new Error('O código não retornou um componente React válido');
      }
    } catch (err) {
      console.error('Code execution error:', err);
      setError(err instanceof Error ? err.message : 'Erro ao executar código');
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
          <pre className="mt-2 whitespace-pre-wrap font-mono text-xs">{error}</pre>
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

  // Render with error boundary
  return (
    <ErrorBoundary>
      <div className={className}>
        <RenderedComponent />
      </div>
    </ErrorBoundary>
  );
}

// Simple error boundary
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
