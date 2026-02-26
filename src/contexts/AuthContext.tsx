import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signUp: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    logger.info('AuthContext', 'Sign in attempt', { email: email.substring(0, 3) + '***' });
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      logger.error('AuthContext', 'Sign in failed', { error: error.message });
      toast.error(error.message);
    } else {
      logger.info('AuthContext', 'Sign in successful', { email: email.substring(0, 3) + '***' });
      toast.success('Login realizado com sucesso!');
    }

    return { error };
  };

  const signUp = async (email: string, password: string) => {
    logger.info('AuthContext', 'Sign up attempt', { email: email.substring(0, 3) + '***' });
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      logger.error('AuthContext', 'Sign up failed', { error: error.message });
      toast.error(error.message);
    } else {
      logger.info('AuthContext', 'Sign up successful', { email: email.substring(0, 3) + '***' });
      toast.success('Conta criada! Verifique seu email para confirmar.');
    }

    return { error };
  };

  const signOut = async () => {
    logger.info('AuthContext', 'Sign out attempt');
    const { error } = await supabase.auth.signOut();
    if (error) {
      logger.error('AuthContext', 'Sign out failed', { error: error.message });
      toast.error(error.message);
    } else {
      logger.info('AuthContext', 'Sign out successful');
      toast.success('Logout realizado com sucesso!');
    }
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Email de recuperação enviado!');
    }

    return { error };
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        signIn,
        signUp,
        signOut,
        resetPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

