# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: seeker-journey.spec.ts >> Seeker Journey >> complete seeker flow: register → upload resume → match → apply
- Location: e2e\seeker-journey.spec.ts:8:3

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
      - link "Sign In" [ref=e21] [cursor=pointer]:
        - /url: /login
  - generic [ref=e23]:
    - button "← Back to role selection" [ref=e24] [cursor=pointer]
    - generic [ref=e30]:
      - heading "Create Account" [level=1] [ref=e31]
      - paragraph [ref=e32]: Sign up as a job seeker
    - generic [ref=e33]:
      - generic [ref=e34]:
        - text: Full Name
        - textbox "John Doe" [ref=e39]
      - generic [ref=e40]:
        - text: Email Address
        - textbox "you@example.com" [ref=e45]
      - generic [ref=e46]:
        - text: Password
        - textbox "Min 8 chars, 1 uppercase, 1 number" [ref=e51]
      - generic [ref=e52] [cursor=pointer]:
        - checkbox "I agree to the Terms of Service and Privacy Policy" [ref=e53]
        - generic [ref=e54]: I agree to the Terms of Service and Privacy Policy
      - button "Create Account" [ref=e55] [cursor=pointer]
    - paragraph [ref=e56]:
      - text: Already have an account?
      - link "Sign in here" [ref=e57] [cursor=pointer]:
        - /url: /login
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('Seeker Journey', () => {
  4  |   test.beforeEach(async ({ page }) => {
  5  |     await page.goto('/');
  6  |   });
  7  | 
  8  |   test('complete seeker flow: register → upload resume → match → apply', async ({ page }) => {
  9  |     // 1. Register as seeker
  10 |     await page.click('text=Sign Up');
> 11 |     await page.fill('input[name="email"]', 'testseeker@example.com');
     |                ^ Error: page.fill: Test timeout of 60000ms exceeded.
  12 |     await page.fill('input[name="full_name"]', 'Test Seeker');
  13 |     await page.fill('input[name="password"]', 'TestPass123!');
  14 |     await page.selectOption('select[name="role"]', 'seeker');
  15 |     await page.click('button[type="submit"]');
  16 |     
  17 |     // Verify email (in test mode, token is shown)
  18 |     await expect(page.locator('text=Verify your email')).toBeVisible();
  19 |     
  20 |     // 2. Login
  21 |     await page.goto('/login');
  22 |     await page.fill('input[name="email"]', 'testseeker@example.com');
  23 |     await page.fill('input[name="password"]', 'TestPass123!');
  24 |     await page.click('button[type="submit"]');
  25 |     
  26 |     // 3. Upload resume
  27 |     await page.goto('/app/resume');
  28 |     await expect(page.locator('text=Upload Resume')).toBeVisible();
  29 |     
  30 |     // Create a test file
  31 |     const filePath = 'tests/fixtures/sample-resume.txt';
  32 |     await page.setInputFiles('input[type="file"]', filePath);
  33 |     await expect(page.locator('text=Resume uploaded')).toBeVisible();
  34 |     
  35 |     // 4. Browse jobs and check match score
  36 |     await page.goto('/app/jobs');
  37 |     await expect(page.locator('text=Job Feed')).toBeVisible();
  38 |     
  39 |     // 5. Apply to a job
  40 |     await page.click('button:has-text("Apply")');
  41 |     await expect(page.locator('text=Application submitted')).toBeVisible();
  42 |   });
  43 | 
  44 |   test('job alerts creation and management', async ({ page }) => {
  45 |     await page.goto('/login');
  46 |     await page.fill('input[name="email"]', 'testseeker@example.com');
  47 |     await page.fill('input[name="password"]', 'TestPass123!');
  48 |     await page.click('button[type="submit"]');
  49 |     
  50 |     await page.goto('/app/alerts');
  51 |     await page.click('text=Create Alert');
  52 |     await page.fill('input[name="keywords"]', 'python, fastapi');
  53 |     await page.fill('input[name="location"]', 'Remote');
  54 |     await page.selectOption('select[name="frequency"]', 'daily');
  55 |     await page.click('button:has-text("Save")');
  56 |     
  57 |     await expect(page.locator('text=Job alert created')).toBeVisible();
  58 |   });
  59 | });
  60 | 
  61 | test.describe('Seeker Dashboard', () => {
  62 |   test.beforeEach(async ({ page }) => {
  63 |     await page.goto('/login');
  64 |     await page.fill('input[name="email"]', 'testseeker@example.com');
  65 |     await page.fill('input[name="password"]', 'TestPass123!');
  66 |     await page.click('button[type="submit"]');
  67 |   });
  68 | 
  69 |   test('shows applications overview', async ({ page }) => {
  70 |     await page.goto('/app/dashboard');
  71 |     await expect(page.locator('text=My Applications')).toBeVisible();
  72 |   });
  73 | 
  74 |   test('shows match score page', async ({ page }) => {
  75 |     await page.goto('/app/match');
  76 |     await expect(page.locator('text=Match Score')).toBeVisible();
  77 |   });
  78 | });
```