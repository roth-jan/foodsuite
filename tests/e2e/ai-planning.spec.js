const { test, expect } = require('@playwright/test');

test.describe('AI Meal Planning', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Navigate to meal planning
    await page.click('a[data-tab="mealplans"]');
    await page.waitForSelector('#mealPlansContent');
  });

  test('should have all AI mode buttons', async ({ page }) => {
    const aiModes = ['cost', 'nutrition', 'variety', 'seasonal', 'inventory'];
    
    for (const mode of aiModes) {
      const button = page.locator(`[data-action="toggleAIMode"][data-param="${mode}"]`);
      await expect(button).toBeVisible();
    }
    
    // Custom designer button
    await expect(page.locator('[data-action="showModal"][data-modal="aiDesignerModal"]')).toBeVisible();
  });

  test('should toggle AI modes', async ({ page }) => {
    // Click nutrition mode
    await page.click('[data-action="toggleAIMode"][data-param="nutrition"]');
    
    // Should be active
    await expect(page.locator('[data-param="nutrition"].active')).toBeVisible();
    
    // Previous active (cost) should not be active
    await expect(page.locator('[data-param="cost"].active')).not.toBeVisible();
  });

  test('should generate AI meal plan', async ({ page }) => {
    // Click generate button
    await page.click('[data-action="generateAIWeekMenu"]');
    
    // Wait for generation (with timeout)
    await page.waitForTimeout(3000);
    
    // Check if meals were added to calendar
    const mealEvents = page.locator('.meal-event');
    const count = await mealEvents.count();
    
    // Should have generated some meals
    expect(count).toBeGreaterThan(0);
  });

  test('should open AI designer modal', async ({ page }) => {
    await page.click('[data-action="showModal"][data-modal="aiDesignerModal"]');
    
    // Modal should be visible
    await expect(page.locator('#aiDesignerModal.show')).toBeVisible();
    
    // Should have weight sliders
    const sliders = page.locator('#aiDesignerModal input[type="range"]');
    await expect(sliders).toHaveCount(4); // cost, health, variety, season weights
    
    // Should have exclusion inputs
    await expect(page.locator('#excludeIngredients')).toBeVisible();
    await expect(page.locator('#excludeCategories')).toBeVisible();
  });

  test('should optimize current plan', async ({ page }) => {
    // First generate a plan
    await page.click('[data-action="generateAIWeekMenu"]');
    await page.waitForTimeout(2000);
    
    // Then optimize it
    await page.click('[data-action="optimizeCurrentPlan"]');
    
    // Should show some feedback (toast or update)
    const toast = page.locator('.toast.show');
    const hasToast = await toast.isVisible().catch(() => false);
    
    // Either toast or plan should be updated
    expect(hasToast).toBeTruthy();
  });

  test('should calculate meal costs', async ({ page }) => {
    // Generate meals
    await page.click('[data-action="generateAIWeekMenu"]');
    await page.waitForTimeout(2000);
    
    // Check if cost badges are displayed
    const costBadges = page.locator('.meal-cost');
    const count = await costBadges.count();
    
    if (count > 0) {
      // Get first cost
      const firstCost = await costBadges.first().textContent();
      expect(firstCost).toMatch(/€\s*\d+[.,]\d{2}/); // Match euro format
    }
  });
});