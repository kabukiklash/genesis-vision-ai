import { ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { LoginForm } from './LoginForm';
import { Loader2 } from 'lucide-react';

interface AuthGuardProps {
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Componente que protege rotas/conteúdo, exigindo autenticação
 */
export function AuthGuard({ children, fallback }: AuthGuardProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-sm text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return fallback || (
      <div className="flex items-center justify-center min-h-screen p-4">
        <LoginForm />
      </div>
    );
  }

  return <>{children}</>;
}

