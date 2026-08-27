# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: theme-mobile.spec.ts >> Theme and Responsive >> theme toggle in settings page
- Location: e2e\theme-mobile.spec.ts:24:3

# Error details

```
Test timeout of 60000ms exceeded.
```

```
Error: page.fill: Test timeout of 60000ms exceeded.
Call log:
  - waiting for locator('input[name="email"]')

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - navigation [ref=e5]:
    - link "SYNAPSE" [ref=e6] [cursor=pointer]:
      - /url: /
    - generic [ref=e19]:
      - link "Homepage" [ref=e20] [cursor=pointer]:
        - /url: /
      - link "Sign Up" [ref=e21] [cursor=pointer]:
        - /url: /register/seeker
  - generic [ref=e23]:
    - generic [ref=e24]:
      - button "Job Seeker" [ref=e25] [cursor=pointer]
      - button "Employer" [ref=e26] [cursor=pointer]
    - heading "Welcome Back" [level=1] [ref=e27]
    - paragraph [ref=e28]: Sign in to your job seeker account
    - generic [ref=e29]:
      - generic [ref=e30]:
        - text: Email Address
        - textbox "you@example.com" [ref=e35]
      - generic [ref=e36]:
        - generic [ref=e37]:
          - generic [ref=e38]: Password
          - button "Forgot Password?" [ref=e39] [cursor=pointer]
        - textbox "••••••••" [ref=e44]
      - button "Sign In" [ref=e45] [cursor=pointer]
      - generic [ref=e46]:
        - checkbox "Remember me" [ref=e47]
        - text: Remember me
    - generic [ref=e48]:
      - paragraph [ref=e49]: Quick Demo Access
      - generic [ref=e50]:
        - button "Seeker" [ref=e51] [cursor=pointer]
        - button "Employer" [ref=e52] [cursor=pointer]
        - button "Admin" [ref=e53] [cursor=pointer]
    - paragraph [ref=e54]:
      - text: Don't have an account?
      - link "Sign up here" [ref=e55] [cursor=pointer]:
        - /url: /register/seeker
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | 
  3   | test.describe('Theme and Responsive', () => {
  4   |   test('light/dark theme toggle persists', async ({ page }) => {
  5   |     await page.goto('/');
  6   |     
  7   |     // Check default theme (dark)
  8   |     const html = page.locator('html');
  9   |     await expect(html).toHaveAttribute('data-theme', 'dark');
  10  |     
  11  |     // Toggle theme
  12  |     await page.click('button[aria-label*="theme" i]');
  13  |     await expect(html).toHaveAttribute('data-theme', 'light');
  14  |     
  15  |     // Reload and verify persistence
  16  |     await page.reload();
  17  |     await expect(html).toHaveAttribute('data-theme', 'light');
  18  |     
  19  |     // Toggle back
  20  |     await page.click('button[aria-label*="theme" i]');
  21  |     await expect(html).toHaveAttribute('data-theme', 'dark');
  22  |   });
  23  | 
  24  |   test('theme toggle in settings page', async ({ page }) => {
  25  |     await page.goto('/login');
> 26  |     await page.fill('input[name="email"]', 'testseeker@example.com');
      |                ^ Error: page.fill: Test timeout of 60000ms exceeded.
  27  |     await page.fill('input[name="password"]', 'TestPass123!');
  28  |     await page.click('button[type="submit"]');
  29  |     
  30  |     await page.goto('/app/settings');
  31  |     
  32  |     // Find theme toggle in settings
  33  |     const themeToggle = page.locator('button[role="switch"]').first();
  34  |     await expect(themeToggle).toBeVisible();
  35  |     
  36  |     // Toggle and verify
  37  |     await themeToggle.click();
  38  |     const html = page.locator('html');
  39  |     await expect(html).toHaveAttribute('data-theme', 'light');
  40  |   });
  41  | });
  42  | 
  43  | test.describe('Mobile Viewport', () => {
  44  |   test('mobile layout works on 375px', async ({ page }) => {
  45  |     await page.setViewportSize({ width: 375, height: 667 });
  46  |     await page.goto('/');
  47  |     
  48  |     // Check hamburger menu exists
  49  |     await expect(page.locator('button[aria-label*="menu" i]')).toBeVisible();
  50  |     
  51  |     // Open mobile menu
  52  |     await page.click('button[aria-label*="menu" i]');
  53  |     await expect(page.locator('nav[role="navigation"]')).toBeVisible();
  54  |     
  55  |     // Check no horizontal scroll
  56  |     const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
  57  |     expect(bodyWidth).toBeLessThanOrEqual(375);
  58  |   });
  59  | 
  60  |   test('tablet layout works on 768px', async ({ page }) => {
  61  |     await page.setViewportSize({ width: 768, height: 1024 });
  62  |     await page.goto('/');
  63  |     
  64  |     // Check layout adapts
  65  |     const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
  66  |     expect(bodyWidth).toBeLessThanOrEqual(768);
  67  |   });
  68  | 
  69  |   test('desktop layout works on 1440px', async ({ page }) => {
  70  |     await page.setViewportSize({ width: 1440, height: 900 });
  71  |     await page.goto('/');
  72  |     
  73  |     // Full layout should be visible
  74  |     const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
  75  |     expect(bodyWidth).toBeLessThanOrEqual(1440);
  76  |   });
  77  | });
  78  | 
  79  | test.describe('Accessibility', () => {
  80  |   test('keyboard navigation works', async ({ page }) => {
  81  |     await page.goto('/');
  82  |     
  83  |     // Tab through focusable elements
  84  |     await page.keyboard.press('Tab');
  85  |     const focused = await page.evaluate(() => document.activeElement?.tagName);
  86  |     expect(['A', 'BUTTON', 'INPUT', 'SELECT']).toContain(focused);
  87  |   });
  88  | 
  89  |   test('focus states are visible', async ({ page }) => {
  90  |     await page.goto('/login');
  91  |     
  92  |     await page.keyboard.press('Tab');
  93  |     const focused = page.locator(':focus');
  94  |     await expect(focused).toBeVisible();
  95  |   });
  96  | 
  97  |   test('ARIA labels on icon buttons', async ({ page }) => {
  98  |     await page.goto('/');
  99  |     
  100 |     // Check theme toggle has aria-label
  101 |     const themeBtn = page.locator('button[aria-label*="theme" i]');
  102 |     await expect(themeBtn).toHaveAttribute('aria-label');
  103 |   });
  104 | 
  105 |   test('form labels associated with inputs', async ({ page }) => {
  106 |     await page.goto('/login');
  107 |     
  108 |     const emailInput = page.locator('input[name="email"]');
  109 |     const emailLabel = page.locator('label[for="email"]');
  110 |     
  111 |     await expect(emailInput).toBeVisible();
  112 |     await expect(emailLabel).toBeVisible();
  113 |   });
  114 | 
  115 |   test('color contrast meets WCAG AA', async ({ page }) => {
  116 |     await page.goto('/');
  117 |     
  118 |     // Check text contrast - this is a basic check
  119 |     const body = page.locator('body');
  120 |     await expect(body).toBeVisible();
  121 |     
  122 |     // In real test, you'd use axe-core or similar
  123 |     // For now, verify the page renders without errors
  124 |   });
  125 | });
  126 | 
```