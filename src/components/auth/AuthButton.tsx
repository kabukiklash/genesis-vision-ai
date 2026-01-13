import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { AuthDialog } from './AuthDialog';
import { User, Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

export function AuthButton() {
  const { user, loading } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);

  if (loading) {
    return (
      <Button variant="ghost" size="icon" disabled>
        <Loader2 className="h-4 w-4 animate-spin" />
      </Button>
    );
  }

  if (user) {
    return (
      <>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setDialogOpen(true)}
          className="gap-2"
        >
          <Avatar className="h-6 w-6">
            <AvatarFallback className="text-xs">
              {user.email?.charAt(0).toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          <span className="hidden sm:inline">{user.email}</span>
        </Button>
        <AuthDialog open={dialogOpen} onOpenChange={setDialogOpen} />
      </>
    );
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setDialogOpen(true)} className="gap-2">
        <User className="h-4 w-4" />
        <span className="hidden sm:inline">Entrar</span>
      </Button>
      <AuthDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </>
  );
}

