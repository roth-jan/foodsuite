const { test, expect } = require('@playwright/test');

test.describe('Inventory Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should navigate to inventory through dropdown', async ({ page }) => {
    // Click on "Mehr" dropdown
    await page.click('a.dropdown-toggle:has-text("Mehr")');
    
    // Click on inventory
    await page.click('a[data-tab="inventory"]:visible');
    
    // Check if inventory content is visible
    await expect(page.locator('#inventoryContent')).toBeVisible();
  });

  test('should display all three inventory tabs', async ({ page }) => {
    // Navigate to inventory
    await page.click('a.dropdown-toggle:has-text("Mehr")');
    await page.click('a[data-tab="inventory"]:visible');
    
    // Check all tabs exist
    await expect(page.locator('[data-action="startInventoryCheck"]')).toBeVisible();
    await expect(page.locator('[data-action="showGoodsReceipts"]')).toBeVisible();
    await expect(page.locator('[data-action="showPendingDeliveries"]')).toBeVisible();
  });

  test('should calculate stock status correctly', async ({ page }) => {
    await page.click('a.dropdown-toggle:has-text("Mehr")');
    await page.click('a[data-tab="inventory"]:visible');
    
    // Wait for inventory table
    await page.waitForSelector('#inventoryTable');
    
    // Check stock status badges
    const outOfStockItems = page.locator('.badge.bg-danger:has-text("Leer")');
    const criticalItems = page.locator('.badge.bg-warning:has-text("Kritisch")');
    const normalItems = page.locator('.badge.bg-success:has-text("Normal")');
    
    // Should have at least some items in each category
    await expect(outOfStockItems.first()).toBeVisible();
    await expect(criticalItems.first()).toBeVisible();
    await expect(normalItems.first()).toBeVisible();
  });

  test('should switch between inventory tabs', async ({ page }) => {
    await page.click('a.dropdown-toggle:has-text("Mehr")');
    await page.click('a[data-tab="inventory"]:visible');
    
    // Test goods receipts tab
    await page.click('[data-action="showGoodsReceipts"]');
    await expect(page.locator('#goods-receiptsContent')).toBeVisible();
    await expect(page.locator('#stockContent')).not.toBeVisible();
    
    // Test pending deliveries tab
    await page.click('[data-action="showPendingDeliveries"]');
    await expect(page.locator('#pending-deliveriesContent')).toBeVisible();
    await expect(page.locator('#goods-receiptsContent')).not.toBeVisible();
    
    // Back to stock tab
    await page.click('[data-action="startInventoryCheck"]');
    await expect(page.locator('#stockContent')).toBeVisible();
  });

  test('should create goods receipt', async ({ page }) => {
    await page.click('a.dropdown-toggle:has-text("Mehr")');
    await page.click('a[data-tab="inventory"]:visible');
    
    // Go to goods receipts
    await page.click('[data-action="showGoodsReceipts"]');
    
    // Click create button
    await page.click('[data-action="createGoodsReceipt"]');
    
    // Should show modal or form
    const modal = page.locator('.modal.show');
    const form = page.locator('#goodsReceiptForm');
    
    // Either modal or inline form should be visible
    const isModalVisible = await modal.isVisible().catch(() => false);
    const isFormVisible = await form.isVisible().catch(() => false);
    
    expect(isModalVisible || isFormVisible).toBeTruthy();
  });
});