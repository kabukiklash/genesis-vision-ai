import * as Sentry from '@sentry/react';

/**
 * Botão para testar Sentry - lança erro ao clicar
 * Use para validar que o error tracking está funcionando
 */
export function ErrorButton() {
  return (
    <button
      onClick={() => {
        throw new Error('This is your first error!');
      }}
      className="rounded border border-red-500 bg-red-50 px-3 py-1 text-sm text-red-700 hover:bg-red-100"
    >
      Break the world
    </button>
  );
}
