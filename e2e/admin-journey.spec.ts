import { test, expect } from '@playwright/test';

test.describe('Admin Journey', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('complete admin flow: login → manage users → moderate jobs → broadcast', async ({ page }) => {
    // 1. Login as admin
    await page.goto('/login');
    await page.fill('input[name="email"]', 'admin@synapse.demo');
    await page.fill('input[name="password"]', 'Demo1234!');
    await page.click('button[type="submit"]');
    
    // 2. Access admin dashboard
    await page.goto('/app/admin');
    await expect(page.locator('text=Admin Dashboard')).toBeVisible();
    
    // 3. View users table
    await expect(page.locator('text=Users')).toBeVisible();
    await expect(page.locator('table')).toBeVisible();
    
    // 4. Search/filter users
    await page.fill('input[placeholder*="Search"]', 'seeker');
    await expect(page.locator('table')).toBeVisible();
    
    // 5. View jobs table
    await page.click('text=Jobs');
    await expect(page.locator('text=All Jobs')).toBeVisible();
    
    // 6. Moderate a job
    await page.click('button:has-text("Flag")');
    await expect(page.locator('text=Job moderated')).toBeVisible();
    
    // 7. View activity log
    await page.click('text=Activity');
    await expect(page.locator('text=Activity Log')).toBeVisible();
    
    // 8. Broadcast notification
    await page.click('text=Broadcast');
    await page.fill('input[name="title"]', 'Test Announcement');
    await page.fill('textarea[name="message"]', 'This is a test broadcast');
    await page.click('button:has-text("Send")');
    await expect(page.locator('text=Broadcast sent')).toBeVisible();
    
    // 9. System health
    await page.click('text=Health');
    await expect(page.locator('text=System Health')).toBeVisible();
  });

  test('user management actions', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', 'admin@synapse.demo');
    await page.fill('input[name="password"]', 'Demo1234!');
    await page.click('button[type="submit"]');
    
    await page.goto('/app/admin');
    
    // Suspend user
    await page.click('button:has-text("Suspend")');
    await expect(page.locator('text=User suspended')).toBeVisible();
    
    // Change role
    await page.selectOption('select[name="role"]', 'employer');
    await expect(page.locator('text=Role updated')).toBeVisible();
  });
});

test.describe('Admin Dashboard Stats', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', 'admin@synapse.demo');
    await page.fill('input[name="password"]', 'Demo1234!');
    await page.click('button[type="submit"]');
  });

  test('shows platform statistics', async ({ page }) => {
    await page.goto('/app/admin');
    
    await expect(page.locator('text=Total Users')).toBeVisible();
    await expect(page.locator('text=Total Jobs')).toBeVisible();
    await expect(page.locator('text=Total Applications')).toBeVisible();
  });
});