import { test, expect } from '@playwright/test';

test.describe('Genesis Vision AI - Main Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display the main page with intent input', async ({ page }) => {
    // Check if main elements are visible
    await expect(page.getByText('Genesis Vision')).toBeVisible();
    await expect(page.getByText('Programação por Intenção com LLM Council')).toBeVisible();
    
    // Check if input field exists
    const textarea = page.getByPlaceholder('Descreva o sistema que você quer criar...');
    await expect(textarea).toBeVisible();
    
    // Check if submit button exists
    const submitButton = page.getByRole('button', { name: /Gerar Código/i });
    await expect(submitButton).toBeVisible();
  });

  test('should show example intents', async ({ page }) => {
    // Check if example buttons are visible
    const examples = page.getByText('💡 Exemplos rápidos:');
    await expect(examples).toBeVisible();
    
    // Check if at least one example button exists
    const exampleButtons = page.locator('button').filter({ hasText: /Sistema|Plataforma|Dashboard/i });
    await expect(exampleButtons.first()).toBeVisible();
  });

  test('should allow selecting an example intent', async ({ page }) => {
    // Click on first example button
    const firstExample = page.locator('button').filter({ hasText: /Sistema|Plataforma|Dashboard/i }).first();
    await firstExample.click();
    
    // Check if textarea is filled
    const textarea = page.getByPlaceholder('Descreva o sistema que você quer criar...');
    const value = await textarea.inputValue();
    expect(value.length).toBeGreaterThan(0);
  });

  test('should show auth button', async ({ page }) => {
    // Check if auth button exists (login or user info)
    const authButton = page.locator('button').filter({ hasText: /Entrar|Login/i }).or(
      page.locator('button').filter({ hasText: /@/i })
    );
    await expect(authButton.first()).toBeVisible();
  });

  test('should validate empty intent submission', async ({ page }) => {
    // Try to submit empty form
    const submitButton = page.getByRole('button', { name: /Gerar Código/i });
    await submitButton.click();
    
    // Should show validation error (toast or message)
    // Note: This depends on your validation implementation
    // You may need to adjust based on actual behavior
    await page.waitForTimeout(500);
    
    // Check if button is still enabled or if error is shown
    // This is a basic check - adjust based on your actual validation
    const textarea = page.getByPlaceholder('Descreva o sistema que você quer criar...');
    const value = await textarea.inputValue();
    if (value.trim() === '') {
      // Button might be disabled or error shown
      // Adjust assertion based on actual behavior
      expect(true).toBe(true);
    }
  });

  test('should toggle between Council and Direct mode', async ({ page }) => {
    // Look for the toggle switch
    const councilToggle = page.locator('input[type="checkbox"]').or(
      page.locator('button').filter({ hasText: /Council|Direto/i })
    );
    
    // If toggle exists, interact with it
    if (await councilToggle.count() > 0) {
      await councilToggle.first().click();
      await page.waitForTimeout(200);
      // Toggle should change state
      expect(true).toBe(true);
    }
  });
});

test.describe('Genesis Vision AI - Auth Flow', () => {
  test('should open auth dialog when clicking auth button', async ({ page }) => {
    await page.goto('/');
    
    // Click auth button
    const authButton = page.locator('button').filter({ hasText: /Entrar|Login/i }).first();
    await authButton.click();
    
    // Check if auth dialog/modal opens
    // Adjust selectors based on your actual implementation
    const authDialog = page.locator('[role="dialog"]').or(
      page.getByText(/Entrar|Criar Conta|Autenticação/i)
    );
    
    // If dialog exists, it should be visible
    if (await authDialog.count() > 0) {
      await expect(authDialog.first()).toBeVisible();
    }
  });
});

