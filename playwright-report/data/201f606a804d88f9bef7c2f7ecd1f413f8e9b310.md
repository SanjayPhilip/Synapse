# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: theme-mobile.spec.ts >> Error Pages >> 404 page displays correctly
- Location: e2e\theme-mobile.spec.ts:128:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('a[href="/"]')
Expected: visible
Error: strict mode violation: locator('a[href="/"]') resolved to 2 elements:
    1) <a href="/" data-discover="true" class="mb-8 flex items-center justify-center gap-2">…</a> aka getByRole('link', { name: 'SYNAPSE' })
    2) <a href="/" data-discover="true" class="mt-8 inline-flex items-center justify-center gap-2 rounded-lg bg-cyan-500 px-6 py-3 text-sm font-bold text-slate-950 transition-all hover:bg-cyan-400">…</a> aka getByRole('link', { name: 'Back to Homepage' })

Call log:
  - Expect "toBeVisible" with timeout 10000ms
  - waiting for locator('a[href="/"]')

```

# Page snapshot

```yaml
- generic [ref=e4]:
  - link "SYNAPSE" [ref=e5] [cursor=pointer]:
    - /url: /
  - generic [ref=e18]:
    - generic [ref=e19]: "404"
    - heading "Page not found" [level=1] [ref=e20]
    - paragraph [ref=e21]: The page you're looking for doesn't exist or has been moved.
    - link "Back to Homepage" [ref=e22] [cursor=pointer]:
      - /url: /
```

# Test source

```ts
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
  127 | test.describe('Error Pages', () => {
  128 |   test('404 page displays correctly', async ({ page }) => {
  129 |     await page.goto('/nonexistent-page');
  130 |     
  131 |     await expect(page.locator('text=404')).toBeVisible();
  132 |     await expect(page.locator('text=Not Found')).toBeVisible();
> 133 |     await expect(page.locator('a[href="/"]')).toBeVisible();
      |                                               ^ Error: expect(locator).toBeVisible() failed
  134 |   });
  135 | 
  136 |   test('500 page accessible', async ({ page }) => {
  137 |     await page.goto('/500');
  138 |     
  139 |     await expect(page.locator('text=500')).toBeVisible();
  140 |     await expect(page.locator('text=Server Error')).toBeVisible();
  141 |   });
  142 | });
```