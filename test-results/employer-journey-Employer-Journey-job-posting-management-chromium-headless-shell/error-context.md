# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: employer-journey.spec.ts >> Employer Journey >> job posting management
- Location: e2e\employer-journey.spec.ts:47:3

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
- generic [ref=f1e3]:
  - navigation [ref=f1e5]:
    - link "SYNAPSE" [ref=f1e6] [cursor=pointer]:
      - /url: /
    - generic [ref=f1e19]:
      - link "Homepage" [ref=f1e20] [cursor=pointer]:
        - /url: /
      - link "Sign Up" [ref=f1e21] [cursor=pointer]:
        - /url: /register/seeker
  - generic [ref=f1e23]:
    - generic [ref=f1e24]:
      - button "Job Seeker" [ref=f1e25] [cursor=pointer]
      - button "Employer" [ref=f1e26] [cursor=pointer]
    - heading "Welcome Back" [level=1] [ref=f1e27]
    - paragraph [ref=f1e28]: Sign in to your job seeker account
    - generic [ref=f1e29]:
      - generic [ref=f1e30]:
        - text: Email Address
        - textbox "you@example.com" [ref=f1e35]
      - generic [ref=f1e36]:
        - generic [ref=f1e37]:
          - generic [ref=f1e38]: Password
          - button "Forgot Password?" [ref=f1e39] [cursor=pointer]
        - textbox "••••••••" [ref=f1e44]
      - button "Sign In" [ref=f1e45] [cursor=pointer]
      - generic [ref=f1e46]:
        - checkbox "Remember me" [ref=f1e47]
        - text: Remember me
    - generic [ref=f1e48]:
      - paragraph [ref=f1e49]: Quick Demo Access
      - generic [ref=f1e50]:
        - button "Seeker" [ref=f1e51] [cursor=pointer]
        - button "Employer" [ref=f1e52] [cursor=pointer]
        - button "Admin" [ref=f1e53] [cursor=pointer]
    - paragraph [ref=f1e54]:
      - text: Don't have an account?
      - link "Sign up here" [ref=f1e55] [cursor=pointer]:
        - /url: /register/seeker
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
  11 |     await page.fill('input[name="email"]', 'testemployer@example.com');
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
> 49 |     await page.fill('input[name="email"]', 'testemployer@example.com');
     |                ^ Error: page.fill: Test timeout of 60000ms exceeded.
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