import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ExternalLink, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';

interface EnvValidatorProps {
  children: React.ReactNode;
}

/**
 * Valida variáveis de ambiente diretamente via import.meta.env
 * (sem importar @/lib/env, que lançaria e poderia causar tela branca).
 */
function validateEnvVars(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl) {
    errors.push('VITE_SUPABASE_URL está faltando');
  } else if (typeof supabaseUrl === 'string' && !supabaseUrl.startsWith('http')) {
    errors.push('VITE_SUPABASE_URL deve ser uma URL válida (começar com http:// ou https://)');
  }

  if (!supabasePublishableKey) {
    errors.push('VITE_SUPABASE_PUBLISHABLE_KEY está faltando');
  } else if (typeof supabasePublishableKey === 'string' && supabasePublishableKey.length < 20) {
    errors.push('VITE_SUPABASE_PUBLISHABLE_KEY parece inválida (muito curta)');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Componente que valida variáveis de ambiente e mostra erro se faltarem.
 * Usa import.meta.env diretamente para evitar carregar @/lib/env antes da validação.
 */
export function EnvValidator({ children }: EnvValidatorProps) {
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const { valid, errors: errList } = validateEnvVars();
    setIsValid(valid);
    setErrors(errList);

    if (!valid) {
      console.error(
        `❌ EnvValidator Error [${new Date().toISOString()}]:`,
        errList
      );
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
      <div className="fixed inset-0 bg-red-50 flex items-center justify-center p-4">
        <div className="max-w-md bg-white rounded-lg shadow-xl p-8">
          <h1 className="text-2xl font-bold text-red-600 mb-4">
            ⚠️ Erro de Configuração
          </h1>

          <p className="text-gray-700 mb-4">
            Variáveis de ambiente não configuradas ou inválidas. Por favor,
            configure o arquivo <code className="bg-gray-100 px-1 rounded">.env.local</code>:
          </p>

          <ul className="bg-gray-100 rounded p-4 mb-4 text-sm">
            {errors.map((error, idx) => (
              <li key={idx} className="text-red-600 font-mono mb-2">
                • {error}
              </li>
            ))}
          </ul>

          <div className="space-y-2 mb-4">
            <p className="font-medium text-sm">Como resolver:</p>
            <ol className="list-decimal list-inside space-y-1 text-sm text-gray-700">
              <li>Copie o arquivo <code className="bg-gray-100 px-1 rounded">.env.example</code> para <code className="bg-gray-100 px-1 rounded">.env.local</code></li>
              <li>Preencha com seus valores reais do Supabase</li>
              <li>Reinicie o servidor de desenvolvimento</li>
            </ol>
          </div>

          <div className="flex flex-wrap gap-2">
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
              Abrir Supabase
            </Button>
          </div>

          <a
            href="https://github.com/GenesisVision/genesis-vision-ai/blob/main/README.md"
            target="_blank"
            rel="noopener noreferrer"
            className="block mt-4 text-blue-600 hover:underline text-sm"
          >
            📖 Ver documentação de setup
          </a>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

