import { test, expect } from '@playwright/test';

/**
 * Testes E2E do EnvValidator - Etapa 1
 * Estes testes precisam ser executados com o env correto para cada cenário.
 * Use o script run-env-validator-tests.ps1
 */

test.describe('EnvValidator - Teste 1: Sem .env', () => {
  test('deve exibir tela de erro quando variáveis de ambiente estão faltando', async ({
    page,
  }) => {
    await page.goto('/');

    // Deve mostrar título de erro
    await expect(
      page.getByRole('heading', { name: /Erro de Configuração/i })
    ).toBeVisible({ timeout: 10000 });

    // Deve mostrar mensagem sobre variáveis
    await expect(
      page.getByText(/Variáveis de ambiente não configuradas/i)
    ).toBeVisible();

    // Deve listar pelo menos um erro (VITE_SUPABASE_URL ou VITE_SUPABASE_PUBLISHABLE_KEY)
    const hasUrlError = await page
      .getByText(/VITE_SUPABASE_URL.*faltando/i)
      .isVisible();
    const hasKeyError = await page
      .getByText(/VITE_SUPABASE_PUBLISHABLE_KEY.*faltando/i)
      .isVisible();
    expect(hasUrlError || hasKeyError).toBeTruthy();

    // NÃO deve carregar a aplicação (Genesis Vision principal)
    await expect(page.getByText('Programação por Intenção com LLM Council')).not.toBeVisible();
  });
});

test.describe('EnvValidator - Teste 2: .env incompleto', () => {
  test('deve exibir erro específico quando VITE_SUPABASE_URL está faltando', async ({
    page,
  }) => {
    await page.goto('/');

    // Deve mostrar tela de erro
    await expect(
      page.getByRole('heading', { name: /Erro de Configuração/i })
    ).toBeVisible({ timeout: 10000 });

    // Deve mencionar especificamente VITE_SUPABASE_URL
    await expect(
      page.getByText(/VITE_SUPABASE_URL.*faltando/i)
    ).toBeVisible();

    // App não deve carregar
    await expect(page.getByText('Programação por Intenção com LLM Council')).not.toBeVisible();
  });
});

test.describe('EnvValidator - Teste 3: .env válido', () => {
  test('deve carregar aplicação normalmente com variáveis válidas', async ({
    page,
  }) => {
    await page.goto('/');

    // NÃO deve mostrar tela de erro
    await expect(
      page.getByRole('heading', { name: /Erro de Configuração/i })
    ).not.toBeVisible({ timeout: 5000 });

    // Deve carregar a aplicação principal
    await expect(page.getByText('Genesis Vision')).toBeVisible({
      timeout: 15000,
    });
    await expect(
      page.getByText('Programação por Intenção com LLM Council')
    ).toBeVisible();
  });
});
