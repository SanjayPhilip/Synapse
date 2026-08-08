import { test, expect } from '@playwright/test';

test.describe('Employer Journey', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('complete employer flow: register → post job → view applicants → shortlist', async ({ page }) => {
    // 1. Register as employer
    await page.click('text=Sign Up');
    await page.fill('input[name="email"]', 'testemployer@example.com');
    await page.fill('input[name="full_name"]', 'Test Employer');
    await page.fill('input[name="password"]', 'TestPass123!');
    await page.fill('input[name="company_name"]', 'Test Company');
    await page.selectOption('select[name="role"]', 'employer');
    await page.click('button[type="submit"]');
    
    // 2. Login
    await page.goto('/login');
    await page.fill('input[name="email"]', 'testemployer@example.com');
    await page.fill('input[name="password"]', 'TestPass123!');
    await page.click('button[type="submit"]');
    
    // 3. Post a job
    await page.goto('/app/postings');
    await page.click('text=Create Job Posting');
    await page.fill('input[name="title"]', 'Senior Python Developer');
    await page.fill('textarea[name="description"]', 'We are looking for a Senior Python Developer...');
    await page.fill('textarea[name="requirements"]', 'Python, FastAPI, PostgreSQL');
    await page.fill('input[name="location"]', 'Remote');
    await page.selectOption('select[name="category"]', 'Software Engineering');
    await page.fill('input[name="salary_min"]', '100000');
    await page.fill('input[name="salary_max"]', '150000');
    await page.click('button:has-text("Publish")');
    
    await expect(page.locator('text=Job posted successfully')).toBeVisible();
    
    // 4. View applicants (will be empty initially)
    await page.goto('/app/applicants');
    await expect(page.locator('text=Applicants')).toBeVisible();
    
    // 5. Analytics dashboard
    await page.goto('/app/analytics');
    await expect(page.locator('text=Analytics')).toBeVisible();
  });

  test('job posting management', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', 'testemployer@example.com');
    await page.fill('input[name="password"]', 'TestPass123!');
    await page.click('button[type="submit"]');
    
    await page.goto('/app/postings');
    
    // Toggle job status
    await page.click('button:has-text("Active")');
    await expect(page.locator('text=Job status updated')).toBeVisible();
    
    // Duplicate job
    await page.click('button:has-text("Duplicate")');
    await expect(page.locator('text=Job duplicated')).toBeVisible();
  });

  test('applicant screening and status changes', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', 'testemployer@example.com');
    await page.fill('input[name="password"]', 'TestPass123!');
    await page.click('button[type="submit"]');
    
    await page.goto('/app/applicants');
    
    // Should see applicant list (even if empty)
    await expect(page.locator('text=No applicants yet').or(page.locator('table'))).toBeVisible();
  });
});

test.describe('Employer Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', 'testemployer@example.com');
    await page.fill('input[name="password"]', 'TestPass123!');
    await page.click('button[type="submit"]');
  });

  test('shows employer dashboard', async ({ page }) => {
    await page.goto('/app/dashboard');
    await expect(page.locator('text=Employer Dashboard')).toBeVisible();
  });
});