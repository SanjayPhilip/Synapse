# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: seeker-journey.spec.ts >> Seeker Dashboard >> shows applications overview
- Location: e2e\seeker-journey.spec.ts:69:3

# Error details

```
Test timeout of 60000ms exceeded while running "beforeEach" hook.
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
  11 |     await page.fill('input[name="email"]', 'testseeker@example.com');
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
> 64 |     await page.fill('input[name="email"]', 'testseeker@example.com');
     |                ^ Error: page.fill: Test timeout of 60000ms exceeded.
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