import "@/lib/sentry"; // Inicializar Sentry antes de tudo
import { createRoot } from "react-dom/client";
import * as Sentry from "@sentry/react";
import App from "./App.tsx";
import "./index.css";

const SentryApp = Sentry.withProfiler(App);

createRoot(document.getElementById("root")!).render(
  <Sentry.ErrorBoundary
    fallback={
      <div style={{ padding: 40, textAlign: 'center', fontFamily: 'sans-serif' }}>
        <h2>Ocorreu um erro</h2>
        <p>O erro foi reportado ao Sentry. Tente recarregar a página.</p>
        <button onClick={() => window.location.reload()} style={{ padding: '8px 16px', marginTop: 16 }}>
          Recarregar
        </button>
      </div>
    }
  >
    <SentryApp />
  </Sentry.ErrorBoundary>
);
