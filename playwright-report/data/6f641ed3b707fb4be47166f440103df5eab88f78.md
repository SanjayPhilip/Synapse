# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: admin-journey.spec.ts >> Admin Journey >> user management actions
- Location: e2e\admin-journey.spec.ts:51:3

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
  3  | test.describe('Admin Journey', () => {
  4  |   test.beforeEach(async ({ page }) => {
  5  |     await page.goto('/');
  6  |   });
  7  | 
  8  |   test('complete admin flow: login → manage users → moderate jobs → broadcast', async ({ page }) => {
  9  |     // 1. Login as admin
  10 |     await page.goto('/login');
  11 |     await page.fill('input[name="email"]', 'admin@synapse.demo');
  12 |     await page.fill('input[name="password"]', 'Demo1234!');
  13 |     await page.click('button[type="submit"]');
  14 |     
  15 |     // 2. Access admin dashboard
  16 |     await page.goto('/app/admin');
  17 |     await expect(page.locator('text=Admin Dashboard')).toBeVisible();
  18 |     
  19 |     // 3. View users table
  20 |     await expect(page.locator('text=Users')).toBeVisible();
  21 |     await expect(page.locator('table')).toBeVisible();
  22 |     
  23 |     // 4. Search/filter users
  24 |     await page.fill('input[placeholder*="Search"]', 'seeker');
  25 |     await expect(page.locator('table')).toBeVisible();
  26 |     
  27 |     // 5. View jobs table
  28 |     await page.click('text=Jobs');
  29 |     await expect(page.locator('text=All Jobs')).toBeVisible();
  30 |     
  31 |     // 6. Moderate a job
  32 |     await page.click('button:has-text("Flag")');
  33 |     await expect(page.locator('text=Job moderated')).toBeVisible();
  34 |     
  35 |     // 7. View activity log
  36 |     await page.click('text=Activity');
  37 |     await expect(page.locator('text=Activity Log')).toBeVisible();
  38 |     
  39 |     // 8. Broadcast notification
  40 |     await page.click('text=Broadcast');
  41 |     await page.fill('input[name="title"]', 'Test Announcement');
  42 |     await page.fill('textarea[name="message"]', 'This is a test broadcast');
  43 |     await page.click('button:has-text("Send")');
  44 |     await expect(page.locator('text=Broadcast sent')).toBeVisible();
  45 |     
  46 |     // 9. System health
  47 |     await page.click('text=Health');
  48 |     await expect(page.locator('text=System Health')).toBeVisible();
  49 |   });
  50 | 
  51 |   test('user management actions', async ({ page }) => {
  52 |     await page.goto('/login');
> 53 |     await page.fill('input[name="email"]', 'admin@synapse.demo');
     |                ^ Error: page.fill: Test timeout of 60000ms exceeded.
  54 |     await page.fill('input[name="password"]', 'Demo1234!');
  55 |     await page.click('button[type="submit"]');
  56 |     
  57 |     await page.goto('/app/admin');
  58 |     
  59 |     // Suspend user
  60 |     await page.click('button:has-text("Suspend")');
  61 |     await expect(page.locator('text=User suspended')).toBeVisible();
  62 |     
  63 |     // Change role
  64 |     await page.selectOption('select[name="role"]', 'employer');
  65 |     await expect(page.locator('text=Role updated')).toBeVisible();
  66 |   });
  67 | });
  68 | 
  69 | test.describe('Admin Dashboard Stats', () => {
  70 |   test.beforeEach(async ({ page }) => {
  71 |     await page.goto('/login');
  72 |     await page.fill('input[name="email"]', 'admin@synapse.demo');
  73 |     await page.fill('input[name="password"]', 'Demo1234!');
  74 |     await page.click('button[type="submit"]');
  75 |   });
  76 | 
  77 |   test('shows platform statistics', async ({ page }) => {
  78 |     await page.goto('/app/admin');
  79 |     
  80 |     await expect(page.locator('text=Total Users')).toBeVisible();
  81 |     await expect(page.locator('text=Total Jobs')).toBeVisible();
  82 |     await expect(page.locator('text=Total Applications')).toBeVisible();
  83 |   });
  84 | });
```