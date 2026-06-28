import { test, expect } from '@playwright/test';

test.describe('Signal Clone E2E Tests', () => {
  test('unauthenticated users should be redirected to login', async ({ page }) => {
    // Navigate to root route
    await page.goto('/');
    
    // Expect redirection to /login
    await expect(page).toHaveURL(/\/login/);
    
    // Verify login card exists and welcomes the user
    await expect(page.locator('h2')).toContainText('Welcome to Signal');
  });

  test('login page has input fields and continue button', async ({ page }) => {
    await page.goto('/login');
    
    // Check credentials fields
    const identifierInput = page.locator('input#identifier');
    const passwordInput = page.locator('input#password');
    const submitBtn = page.locator('button[type="submit"]');
    
    await expect(identifierInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(submitBtn).toBeVisible();
    
    // Verify placeholder text
    await expect(identifierInput).toHaveAttribute('placeholder', 'e.g. +1234567890 or username');
  });
});
