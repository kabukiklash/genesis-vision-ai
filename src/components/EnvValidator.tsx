import { useEffect, useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertCircle, ExternalLink, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';

interface EnvValidatorProps {
  children: React.ReactNode;
}

/**
 * Componente que valida variáveis de ambiente e mostra erro se faltarem
 */
export function EnvValidator({ children }: EnvValidatorProps) {
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    try {
      // Tentar importar e validar env
      import('@/lib/env').then(() => {
        setIsValid(true);
        setErrors([]);
      });
    } catch (error) {
      setIsValid(false);
      if (error instanceof Error) {
        // Extrair erros da mensagem
        const errorLines = error.message.split('\n');
        const extractedErrors = errorLines
          .filter(line => line.trim().startsWith('-'))
          .map(line => line.trim().substring(2));
        setErrors(extractedErrors.length > 0 ? extractedErrors : [error.message]);
      } else {
        setErrors(['Erro desconhecido ao validar variáveis de ambiente']);
      }
    }
  }, []);

  const handleCopyInstructions = () => {
    const instructions = `
# Configuração de Variáveis de Ambiente

1. Copie o arquivo .env.example para .env.local
2. Preencha com seus valores reais do Supabase

Para obter as chaves:
- Acesse: https://app.supabase.com
- Vá em Settings > API
- Copie "Project URL" e "anon public" key
    `.trim();

    navigator.clipboard.writeText(instructions);
    setCopied(true);
    toast.success('Instruções copiadas!');
    setTimeout(() => setCopied(false), 2000);
  };

  if (isValid === null) {
    // Ainda validando
    return null;
  }

  if (!isValid) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <div className="max-w-2xl w-full space-y-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Configuração de Ambiente Necessária</AlertTitle>
            <AlertDescription className="mt-2 space-y-3">
              <p>
                As seguintes variáveis de ambiente estão faltando ou inválidas:
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                {errors.map((error, i) => (
                  <li key={i} className="text-destructive/90">{error}</li>
                ))}
              </ul>
              <div className="pt-2 space-y-2">
                <p className="font-medium">Como resolver:</p>
                <ol className="list-decimal list-inside space-y-1 text-sm">
                  <li>Copie o arquivo <code className="bg-muted px-1 rounded">.env.example</code> para <code className="bg-muted px-1 rounded">.env.local</code></li>
                  <li>Preencha com seus valores reais do Supabase</li>
                  <li>Reinicie o servidor de desenvolvimento</li>
                </ol>
              </div>
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyInstructions}
                  className="gap-2"
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4" />
                      Copiado!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      Copiar Instruções
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open('https://app.supabase.com', '_blank')}
                  className="gap-2"
                >
                  <ExternalLink className="h-4 w-4" />
                  Abrir Supabase Dashboard
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

