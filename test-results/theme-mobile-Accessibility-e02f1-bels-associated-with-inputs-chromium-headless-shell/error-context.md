# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: theme-mobile.spec.ts >> Accessibility >> form labels associated with inputs
- Location: e2e\theme-mobile.spec.ts:105:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('input[name="email"]')
Expected: visible
Timeout: 10000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 10000ms
  - waiting for locator('input[name="email"]')

```

```yaml
- navigation:
  - link "SYNAPSE":
    - /url: /
    - img
    - text: SYNAPSE
  - link "Homepage":
    - /url: /
  - link "Sign Up":
    - /url: /register/seeker
- button "Job Seeker"
- button "Employer"
- heading "Welcome Back" [level=1]
- paragraph: Sign in to your job seeker account
- text: Email Address
- img
- textbox "you@example.com"
- text: Password
- button "Forgot Password?"
- img
- textbox "••••••••"
- button "Sign In"
- checkbox "Remember me"
- text: Remember me
- paragraph: Quick Demo Access
- button "Seeker"
- button "Employer"
- button "Admin"
- paragraph:
  - text: Don't have an account?
  - link "Sign up here":
    - /url: /register/seeker
```

# Test source

```ts
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
  26  |     await page.fill('input[name="email"]', 'testseeker@example.com');
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
> 111 |     await expect(emailInput).toBeVisible();
      |                              ^ Error: expect(locator).toBeVisible() failed
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
  133 |     await expect(page.locator('a[href="/"]')).toBeVisible();
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