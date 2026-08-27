# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: employer-journey.spec.ts >> Employer Journey >> complete employer flow: register → post job → view applicants → shortlist
- Location: e2e\employer-journey.spec.ts:8:3

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
  3  | test.describe('Employer Journey', () => {
  4  |   test.beforeEach(async ({ page }) => {
  5  |     await page.goto('/');
  6  |   });
  7  | 
  8  |   test('complete employer flow: register → post job → view applicants → shortlist', async ({ page }) => {
  9  |     // 1. Register as employer
  10 |     await page.click('text=Sign Up');
> 11 |     await page.fill('input[name="email"]', 'testemployer@example.com');
     |                ^ Error: page.fill: Test timeout of 60000ms exceeded.
  12 |     await page.fill('input[name="full_name"]', 'Test Employer');
  13 |     await page.fill('input[name="password"]', 'TestPass123!');
  14 |     await page.fill('input[name="company_name"]', 'Test Company');
  15 |     await page.selectOption('select[name="role"]', 'employer');
  16 |     await page.click('button[type="submit"]');
  17 |     
  18 |     // 2. Login
  19 |     await page.goto('/login');
  20 |     await page.fill('input[name="email"]', 'testemployer@example.com');
  21 |     await page.fill('input[name="password"]', 'TestPass123!');
  22 |     await page.click('button[type="submit"]');
  23 |     
  24 |     // 3. Post a job
  25 |     await page.goto('/app/postings');
  26 |     await page.click('text=Create Job Posting');
  27 |     await page.fill('input[name="title"]', 'Senior Python Developer');
  28 |     await page.fill('textarea[name="description"]', 'We are looking for a Senior Python Developer...');
  29 |     await page.fill('textarea[name="requirements"]', 'Python, FastAPI, PostgreSQL');
  30 |     await page.fill('input[name="location"]', 'Remote');
  31 |     await page.selectOption('select[name="category"]', 'Software Engineering');
  32 |     await page.fill('input[name="salary_min"]', '100000');
  33 |     await page.fill('input[name="salary_max"]', '150000');
  34 |     await page.click('button:has-text("Publish")');
  35 |     
  36 |     await expect(page.locator('text=Job posted successfully')).toBeVisible();
  37 |     
  38 |     // 4. View applicants (will be empty initially)
  39 |     await page.goto('/app/applicants');
  40 |     await expect(page.locator('text=Applicants')).toBeVisible();
  41 |     
  42 |     // 5. Analytics dashboard
  43 |     await page.goto('/app/analytics');
  44 |     await expect(page.locator('text=Analytics')).toBeVisible();
  45 |   });
  46 | 
  47 |   test('job posting management', async ({ page }) => {
  48 |     await page.goto('/login');
  49 |     await page.fill('input[name="email"]', 'testemployer@example.com');
  50 |     await page.fill('input[name="password"]', 'TestPass123!');
  51 |     await page.click('button[type="submit"]');
  52 |     
  53 |     await page.goto('/app/postings');
  54 |     
  55 |     // Toggle job status
  56 |     await page.click('button:has-text("Active")');
  57 |     await expect(page.locator('text=Job status updated')).toBeVisible();
  58 |     
  59 |     // Duplicate job
  60 |     await page.click('button:has-text("Duplicate")');
  61 |     await expect(page.locator('text=Job duplicated')).toBeVisible();
  62 |   });
  63 | 
  64 |   test('applicant screening and status changes', async ({ page }) => {
  65 |     await page.goto('/login');
  66 |     await page.fill('input[name="email"]', 'testemployer@example.com');
  67 |     await page.fill('input[name="password"]', 'TestPass123!');
  68 |     await page.click('button[type="submit"]');
  69 |     
  70 |     await page.goto('/app/applicants');
  71 |     
  72 |     // Should see applicant list (even if empty)
  73 |     await expect(page.locator('text=No applicants yet').or(page.locator('table'))).toBeVisible();
  74 |   });
  75 | });
  76 | 
  77 | test.describe('Employer Dashboard', () => {
  78 |   test.beforeEach(async ({ page }) => {
  79 |     await page.goto('/login');
  80 |     await page.fill('input[name="email"]', 'testemployer@example.com');
  81 |     await page.fill('input[name="password"]', 'TestPass123!');
  82 |     await page.click('button[type="submit"]');
  83 |   });
  84 | 
  85 |   test('shows employer dashboard', async ({ page }) => {
  86 |     await page.goto('/app/dashboard');
  87 |     await expect(page.locator('text=Employer Dashboard')).toBeVisible();
  88 |   });
  89 | });
```