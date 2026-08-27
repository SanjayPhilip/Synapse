# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: theme-mobile.spec.ts >> Theme and Responsive >> light/dark theme toggle persists
- Location: e2e\theme-mobile.spec.ts:4:3

# Error details

```
Test timeout of 60000ms exceeded.
```

```
Error: page.click: Test timeout of 60000ms exceeded.
Call log:
  - waiting for locator('button[aria-label*="theme" i]')

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - generic [ref=e4]:
    - banner [ref=e6]:
      - link "SYNAPSE" [ref=e7] [cursor=pointer]:
        - /url: /
      - generic [ref=e20]:
        - link "Sign In" [ref=e21] [cursor=pointer]:
          - /url: /login
        - link "Get Started" [ref=e22] [cursor=pointer]:
          - /url: /register/seeker
        - button [ref=e23] [cursor=pointer]
    - generic [ref=e30]:
      - generic [ref=e31]: AI-Driven Hiring Platform
      - heading "THIS IS YOUR SYNAPSE" [level=1] [ref=e32]: THIS ISYOUR SYNAPSE
      - paragraph [ref=e33]: A free, AI-powered platform where resumes come alive and hiring makes sense. We read every line, match every skill, and connect the right people to the right opportunities.
      - generic [ref=e34]:
        - link "I'm Looking for a Job" [ref=e35] [cursor=pointer]:
          - /url: /register/seeker
        - link "I'm Hiring Talent" [ref=e38] [cursor=pointer]:
          - /url: /register/employer
      - link [ref=e41] [cursor=pointer]:
        - /url: "#main"
  - main [ref=e44]:
    - article [ref=e45]:
      - generic [ref=e46]: How Synapse Works
      - heading "One platform. Both sides of hiring." [level=2] [ref=e47]: One platform.Both sides of hiring.
      - paragraph [ref=e48]: Upload a resume, get a match score, and let AI rewrite it to fit. Employers post jobs, rank applicants, and shortlist the best — all in one place.
      - img "Synapse platform" [ref=e49]
    - generic [ref=e50]:
      - generic [ref=e51]:
        - generic [ref=e52]: For Job Seekers
        - list [ref=e56]:
          - listitem [ref=e57]:
            - generic [ref=e59]: Upload your resume — AI parses and structures it instantly
          - listitem [ref=e60]:
            - generic [ref=e62]: See your Match Score for every job with detailed gap analysis
          - listitem [ref=e63]:
            - generic [ref=e65]: Get AI-powered rewrite suggestions to strengthen weak sections
          - listitem [ref=e66]:
            - generic [ref=e68]: Browse ranked job feed — apply or save with one click
      - generic [ref=e69]:
        - generic [ref=e70]: For Employers
        - list [ref=e74]:
          - listitem [ref=e75]:
            - generic [ref=e77]: Post job openings with requirements and responsibilities
          - listitem [ref=e78]:
            - generic [ref=e80]: Receive ranked applicant shortlists with AI scoring
          - listitem [ref=e81]:
            - generic [ref=e83]: Review per-candidate gap summaries and AI analysis
          - listitem [ref=e84]:
            - generic [ref=e86]: Shortlist, reject, or hire with one-click actions
    - generic [ref=e87]:
      - heading "Ready to transform your hiring?" [level=2] [ref=e88]
      - paragraph [ref=e89]: Join thousands of job seekers and employers using SYNAPSE to find perfect matches.
      - generic [ref=e90]:
        - link "Get Started as Seeker" [ref=e91] [cursor=pointer]:
          - /url: /register/seeker
        - link "Get Started as Employer" [ref=e94] [cursor=pointer]:
          - /url: /register/employer
  - contentinfo [ref=e97]:
    - generic [ref=e98]:
      - link "Sign In" [ref=e99] [cursor=pointer]:
        - /url: /login
      - generic [ref=e100]: •
      - link "Sign Up" [ref=e101] [cursor=pointer]:
        - /url: /register/seeker
    - paragraph [ref=e102]: SYNAPSE © 2026. Powered by Gemini AI, FastAPI, and React.
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
> 12  |     await page.click('button[aria-label*="theme" i]');
      |                ^ Error: page.click: Test timeout of 60000ms exceeded.
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
  111 |     await expect(emailInput).toBeVisible();
  112 |     await expect(emailLabel).toBeVisible();
```