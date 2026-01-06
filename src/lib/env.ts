/**
 * Environment Variables Validation
 * 
 * Valida e fornece acesso seguro às variáveis de ambiente
 */

interface EnvConfig {
  supabaseUrl: string;
  supabasePublishableKey: string;
  useMockData: boolean;
}

class EnvValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EnvValidationError';
  }
}

/**
 * Valida se todas as variáveis de ambiente necessárias estão presentes
 */
function validateEnv(): EnvConfig {
  const errors: string[] = [];

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const useMockData = import.meta.env.VITE_USE_MOCK_DATA === 'true';

  if (!supabaseUrl) {
    errors.push('VITE_SUPABASE_URL está faltando');
  } else if (!supabaseUrl.startsWith('http')) {
    errors.push('VITE_SUPABASE_URL deve ser uma URL válida (começar com http:// ou https://)');
  }

  if (!supabasePublishableKey) {
    errors.push('VITE_SUPABASE_PUBLISHABLE_KEY está faltando');
  } else if (supabasePublishableKey.length < 20) {
    errors.push('VITE_SUPABASE_PUBLISHABLE_KEY parece inválida (muito curta)');
  }

  if (errors.length > 0) {
    const errorMessage = `
❌ Erro de Configuração de Ambiente

As seguintes variáveis de ambiente estão faltando ou inválidas:
${errors.map(e => `  - ${e}`).join('\n')}

Por favor:
1. Copie o arquivo .env.example para .env.local
2. Preencha com seus valores reais do Supabase
3. Reinicie o servidor de desenvolvimento

Para obter as chaves:
- Acesse: https://app.supabase.com
- Vá em Settings > API
- Copie "Project URL" e "anon public" key
    `.trim();

    throw new EnvValidationError(errorMessage);
  }

  return {
    supabaseUrl,
    supabasePublishableKey,
    useMockData,
  };
}

/**
 * Configuração validada do ambiente
 * Lança erro se variáveis estiverem faltando
 */
export const env = (() => {
  try {
    return validateEnv();
  } catch (error) {
    if (error instanceof EnvValidationError) {
      // Em desenvolvimento, mostrar erro no console
      if (import.meta.env.DEV) {
        console.error(error.message);
      }
      throw error;
    }
    throw error;
  }
})();

/**
 * Verifica se estamos em modo de desenvolvimento
 */
export const isDev = import.meta.env.DEV;

/**
 * Verifica se estamos em modo de produção
 */
export const isProd = import.meta.env.PROD;

/**
 * Verifica se devemos usar dados mockados
 */
export const shouldUseMockData = env.useMockData && isDev;

