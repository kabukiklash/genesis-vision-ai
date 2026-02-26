import { lazy, Suspense } from "react";
import { EnvValidator } from "@/components/EnvValidator";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { LoadingSpinner } from "@/components/LoadingSpinner";

// Carregado SOMENTE quando EnvValidator validar - evita que supabase/env
// sejam importados antes da validação (causaria tela branca sem .env)
const AppContent = lazy(() => import("./AppContent").then((m) => ({ default: m.AppContent })));

const App = () => (
  <ErrorBoundary>
    <EnvValidator>
      <Suspense fallback={<LoadingSpinner />}>
        <AppContent />
      </Suspense>
    </EnvValidator>
  </ErrorBoundary>
);

export default App;
