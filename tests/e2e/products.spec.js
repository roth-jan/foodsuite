const { test, expect } = require('@playwright/test');

test.describe('Product Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should display products list', async ({ page }) => {
    // Navigate to products
    await page.click('a[data-tab="products"]');
    
    // Wait for products table
    await expect(page.locator('#productsTable')).toBeVisible();
    
    // Check if products are loaded
    const productRows = page.locator('#productsTable tbody tr');
    await expect(productRows).toHaveCount(150); // Based on test data
  });

  test('should filter products by search', async ({ page }) => {
    await page.click('a[data-tab="products"]');
    await page.waitForSelector('#productsTable');
    
    // Search for specific product
    await page.fill('#productSearch', 'Tomate');
    await page.waitForTimeout(500); // Debounce
    
    // Check filtered results
    const visibleRows = page.locator('#productsTable tbody tr:visible');
    const count = await visibleRows.count();
    expect(count).toBeLessThan(150);
    expect(count).toBeGreaterThan(0);
  });

  test('should validate product creation form', async ({ page }) => {
    await page.click('a[data-tab="products"]');
    await page.click('[data-action="showModal"][data-param="createProductModal"]');
    
    // Wait for modal
    await expect(page.locator('#createProductModal')).toBeVisible();
    
    // Try to submit empty form
    await page.click('#createProductModal button[type="submit"]');
    
    // Check for validation errors
    const errors = page.locator('#createProductModal .invalid-feedback:visible');
    await expect(errors).toHaveCount(3); // name, price, unit required
    
    // Fill valid data
    await page.fill('#productName', 'Test Product');
    await page.fill('#productPrice', '9.99');
    await page.fill('#productUnit', 'kg');
    await page.selectOption('#productCategory', 'vegetable');
    
    // Submit should work now
    await page.click('#createProductModal button[type="submit"]');
    await expect(page.locator('#createProductModal')).not.toBeVisible();
  });

  test('should handle negative price validation', async ({ page }) => {
    await page.click('a[data-tab="products"]');
    await page.click('[data-action="showModal"][data-param="createProductModal"]');
    
    await page.fill('#productName', 'Test Product');
    await page.fill('#productPrice', '-5');
    await page.fill('#productUnit', 'kg');
    
    await page.click('#createProductModal button[type="submit"]');
    
    // Should show validation error
    const priceError = page.locator('#productPrice ~ .invalid-feedback');
    await expect(priceError).toBeVisible();
    await expect(priceError).toContainText('positive');
  });
});