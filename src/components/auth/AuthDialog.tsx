import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LoginForm } from './LoginForm';
import { RegisterForm } from './RegisterForm';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { User, LogOut, Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface AuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AuthDialog({ open, onOpenChange }: AuthDialogProps) {
  const { user, signOut, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');

  const handleSignOut = async () => {
    await signOut();
    onOpenChange(false);
  };

  if (user) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Conta</DialogTitle>
            <DialogDescription>
              Gerenciar sua conta e sessão
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
              <Avatar>
                <AvatarFallback>
                  {user.email?.charAt(0).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="font-medium">{user.email}</p>
                <p className="text-sm text-muted-foreground">
                  ID: {user.id.slice(0, 8)}...
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              className="w-full"
              onClick={handleSignOut}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saindo...
                </>
              ) : (
                <>
                  <LogOut className="mr-2 h-4 w-4" />
                  Sair
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Autenticação</DialogTitle>
          <DialogDescription>
            Faça login ou crie uma conta para continuar
          </DialogDescription>
        </DialogHeader>
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'login' | 'register')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Entrar</TabsTrigger>
            <TabsTrigger value="register">Criar Conta</TabsTrigger>
          </TabsList>
          <TabsContent value="login" className="mt-4">
            <LoginForm
              onSuccess={() => onOpenChange(false)}
              onSwitchToRegister={() => setActiveTab('register')}
            />
          </TabsContent>
          <TabsContent value="register" className="mt-4">
            <RegisterForm
              onSuccess={() => {
                setActiveTab('login');
                // Don't close immediately - user needs to verify email
              }}
              onSwitchToLogin={() => setActiveTab('login')}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

