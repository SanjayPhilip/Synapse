import { test, expect } from '@playwright/test';

test.describe('Seeker Journey', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('complete seeker flow: register → upload resume → match → apply', async ({ page }) => {
    // 1. Register as seeker
    await page.click('text=Sign Up');
    await page.fill('input[name="email"]', 'testseeker@example.com');
    await page.fill('input[name="full_name"]', 'Test Seeker');
    await page.fill('input[name="password"]', 'TestPass123!');
    await page.selectOption('select[name="role"]', 'seeker');
    await page.click('button[type="submit"]');
    
    // Verify email (in test mode, token is shown)
    await expect(page.locator('text=Verify your email')).toBeVisible();
    
    // 2. Login
    await page.goto('/login');
    await page.fill('input[name="email"]', 'testseeker@example.com');
    await page.fill('input[name="password"]', 'TestPass123!');
    await page.click('button[type="submit"]');
    
    // 3. Upload resume
    await page.goto('/app/resume');
    await expect(page.locator('text=Upload Resume')).toBeVisible();
    
    // Create a test file
    const filePath = 'tests/fixtures/sample-resume.txt';
    await page.setInputFiles('input[type="file"]', filePath);
    await expect(page.locator('text=Resume uploaded')).toBeVisible();
    
    // 4. Browse jobs and check match score
    await page.goto('/app/jobs');
    await expect(page.locator('text=Job Feed')).toBeVisible();
    
    // 5. Apply to a job
    await page.click('button:has-text("Apply")');
    await expect(page.locator('text=Application submitted')).toBeVisible();
  });

  test('job alerts creation and management', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', 'testseeker@example.com');
    await page.fill('input[name="password"]', 'TestPass123!');
    await page.click('button[type="submit"]');
    
    await page.goto('/app/alerts');
    await page.click('text=Create Alert');
    await page.fill('input[name="keywords"]', 'python, fastapi');
    await page.fill('input[name="location"]', 'Remote');
    await page.selectOption('select[name="frequency"]', 'daily');
    await page.click('button:has-text("Save")');
    
    await expect(page.locator('text=Job alert created')).toBeVisible();
  });
});

test.describe('Seeker Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', 'testseeker@example.com');
    await page.fill('input[name="password"]', 'TestPass123!');
    await page.click('button[type="submit"]');
  });

  test('shows applications overview', async ({ page }) => {
    await page.goto('/app/dashboard');
    await expect(page.locator('text=My Applications')).toBeVisible();
  });

  test('shows match score page', async ({ page }) => {
    await page.goto('/app/match');
    await expect(page.locator('text=Match Score')).toBeVisible();
  });
});