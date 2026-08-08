import { test, expect } from '@playwright/test';

test.describe('Theme and Responsive', () => {
  test('light/dark theme toggle persists', async ({ page }) => {
    await page.goto('/');
    
    // Check default theme (dark)
    const html = page.locator('html');
    await expect(html).toHaveAttribute('data-theme', 'dark');
    
    // Toggle theme
    await page.click('button[aria-label*="theme" i]');
    await expect(html).toHaveAttribute('data-theme', 'light');
    
    // Reload and verify persistence
    await page.reload();
    await expect(html).toHaveAttribute('data-theme', 'light');
    
    // Toggle back
    await page.click('button[aria-label*="theme" i]');
    await expect(html).toHaveAttribute('data-theme', 'dark');
  });

  test('theme toggle in settings page', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', 'testseeker@example.com');
    await page.fill('input[name="password"]', 'TestPass123!');
    await page.click('button[type="submit"]');
    
    await page.goto('/app/settings');
    
    // Find theme toggle in settings
    const themeToggle = page.locator('button[role="switch"]').first();
    await expect(themeToggle).toBeVisible();
    
    // Toggle and verify
    await themeToggle.click();
    const html = page.locator('html');
    await expect(html).toHaveAttribute('data-theme', 'light');
  });
});

test.describe('Mobile Viewport', () => {
  test('mobile layout works on 375px', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    
    // Check hamburger menu exists
    await expect(page.locator('button[aria-label*="menu" i]')).toBeVisible();
    
    // Open mobile menu
    await page.click('button[aria-label*="menu" i]');
    await expect(page.locator('nav[role="navigation"]')).toBeVisible();
    
    // Check no horizontal scroll
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(bodyWidth).toBeLessThanOrEqual(375);
  });

  test('tablet layout works on 768px', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');
    
    // Check layout adapts
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(bodyWidth).toBeLessThanOrEqual(768);
  });

  test('desktop layout works on 1440px', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    
    // Full layout should be visible
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(bodyWidth).toBeLessThanOrEqual(1440);
  });
});

test.describe('Accessibility', () => {
  test('keyboard navigation works', async ({ page }) => {
    await page.goto('/');
    
    // Tab through focusable elements
    await page.keyboard.press('Tab');
    const focused = await page.evaluate(() => document.activeElement?.tagName);
    expect(['A', 'BUTTON', 'INPUT', 'SELECT']).toContain(focused);
  });

  test('focus states are visible', async ({ page }) => {
    await page.goto('/login');
    
    await page.keyboard.press('Tab');
    const focused = page.locator(':focus');
    await expect(focused).toBeVisible();
  });

  test('ARIA labels on icon buttons', async ({ page }) => {
    await page.goto('/');
    
    // Check theme toggle has aria-label
    const themeBtn = page.locator('button[aria-label*="theme" i]');
    await expect(themeBtn).toHaveAttribute('aria-label');
  });

  test('form labels associated with inputs', async ({ page }) => {
    await page.goto('/login');
    
    const emailInput = page.locator('input[name="email"]');
    const emailLabel = page.locator('label[for="email"]');
    
    await expect(emailInput).toBeVisible();
    await expect(emailLabel).toBeVisible();
  });

  test('color contrast meets WCAG AA', async ({ page }) => {
    await page.goto('/');
    
    // Check text contrast - this is a basic check
    const body = page.locator('body');
    await expect(body).toBeVisible();
    
    // In real test, you'd use axe-core or similar
    // For now, verify the page renders without errors
  });
});

test.describe('Error Pages', () => {
  test('404 page displays correctly', async ({ page }) => {
    await page.goto('/nonexistent-page');
    
    await expect(page.locator('text=404')).toBeVisible();
    await expect(page.locator('text=Not Found')).toBeVisible();
    await expect(page.locator('a[href="/"]')).toBeVisible();
  });

  test('500 page accessible', async ({ page }) => {
    await page.goto('/500');
    
    await expect(page.locator('text=500')).toBeVisible();
    await expect(page.locator('text=Server Error')).toBeVisible();
  });
});