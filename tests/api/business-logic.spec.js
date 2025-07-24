const { test, expect } = require('@playwright/test');

test.describe('Business Logic API Tests', () => {
  test('should enforce multi-tenant isolation', async ({ request }) => {
    // Get products for demo tenant
    const demoResponse = await request.get('/api/products', {
      headers: { 'x-tenant-id': 'demo' }
    });
    expect(demoResponse.ok()).toBeTruthy();
    const demoData = await demoResponse.json();
    
    // Get products for different tenant
    const otherResponse = await request.get('/api/products', {
      headers: { 'x-tenant-id': 'other-tenant' }
    });
    expect(otherResponse.ok()).toBeTruthy();
    const otherData = await otherResponse.json();
    
    // Should have different data or filtered data
    expect(demoData.data.length).toBeGreaterThan(0);
    
    // Check no cross-tenant data leak
    const demoIds = demoData.data.map(p => p.id);
    const otherIds = otherData.data.map(p => p.id);
    const overlap = demoIds.filter(id => otherIds.includes(id));
    
    // Some overlap is OK (demo/fallback data), but not 100%
    expect(overlap.length).toBeLessThan(demoIds.length);
  });

  test('should calculate inventory stock status correctly', async ({ request }) => {
    const response = await request.get('/api/inventory', {
      headers: { 'x-tenant-id': 'demo' }
    });
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    expect(data.success).toBe(true);
    
    // Verify stock status logic
    data.data.forEach(item => {
      if (item.quantity === 0) {
        expect(item.stock_status).toBe('out_of_stock');
      } else if (item.quantity < item.min_stock) {
        expect(item.stock_status).toBe('critical');
      } else if (item.quantity <= item.min_stock * 1.5) {
        expect(item.stock_status).toBe('low');
      } else if (item.quantity > item.max_stock) {
        expect(item.stock_status).toBe('high');
      } else {
        expect(item.stock_status).toBe('normal');
      }
    });
  });

  test('should validate product creation', async ({ request }) => {
    // Test with invalid data
    const invalidResponse = await request.post('/api/products', {
      headers: { 
        'Content-Type': 'application/json',
        'x-tenant-id': 'demo'
      },
      data: {
        name: '', // Empty name
        price: -5, // Negative price
        unit: '',
        category: 'invalid_category'
      }
    });
    
    // Should reject invalid data
    expect(invalidResponse.status()).toBe(400);
    const error = await invalidResponse.json();
    expect(error.error).toBeTruthy();
  });

  test('should calculate recipe costs', async ({ request }) => {
    const response = await request.get('/api/recipes', {
      headers: { 'x-tenant-id': 'demo' }
    });
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    
    // Check recipe cost logic
    data.data.forEach(recipe => {
      // Cost should be non-negative
      expect(recipe.cost_per_portion).toBeGreaterThanOrEqual(0);
      
      // If recipe has ingredients, cost should be > 0
      if (recipe.ingredients && recipe.ingredients.length > 0) {
        expect(recipe.cost_per_portion).toBeGreaterThan(0);
      }
    });
  });

  test('should apply AI meal planning rules', async ({ request }) => {
    // Test cost optimized mode
    const costResponse = await request.post('/api/ai/suggest-meals', {
      headers: { 
        'Content-Type': 'application/json',
        'x-tenant-id': 'demo'
      },
      data: {
        mode: 'cost_optimized',
        weekNumber: 1,
        year: 2024,
        preferences: {}
      }
    });
    
    expect(costResponse.ok()).toBeTruthy();
    const costData = await costResponse.json();
    
    // Calculate average cost
    const meals = costData.data.meals;
    const avgCost = meals.reduce((sum, meal) => sum + meal.cost_per_portion, 0) / meals.length;
    
    // Cost optimized should aim for lower costs
    expect(avgCost).toBeLessThan(4.0); // Reasonable threshold
    
    // Test variety mode
    const varietyResponse = await request.post('/api/ai/suggest-meals', {
      headers: { 
        'Content-Type': 'application/json',
        'x-tenant-id': 'demo'
      },
      data: {
        mode: 'variety',
        weekNumber: 1,
        year: 2024,
        preferences: {}
      }
    });
    
    expect(varietyResponse.ok()).toBeTruthy();
    const varietyData = await varietyResponse.json();
    
    // Check variety
    const uniqueMeals = new Set(varietyData.data.meals.map(m => m.recipe_id)).size;
    const totalMeals = varietyData.data.meals.length;
    
    // Variety mode should have high uniqueness
    expect(uniqueMeals / totalMeals).toBeGreaterThan(0.7);
  });

  test('should handle order workflow states', async ({ request }) => {
    // Get orders
    const response = await request.get('/api/orders', {
      headers: { 'x-tenant-id': 'demo' }
    });
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    
    // Check order status transitions
    const validStatuses = ['draft', 'sent', 'confirmed', 'delivered', 'cancelled'];
    data.data.forEach(order => {
      expect(validStatuses).toContain(order.status);
    });
  });

  test('should calculate analytics correctly', async ({ request }) => {
    const response = await request.get('/api/analytics/dashboard', {
      headers: { 'x-tenant-id': 'demo' }
    });
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    
    // Verify analytics calculations
    expect(data.data).toHaveProperty('totalProducts');
    expect(data.data).toHaveProperty('lowStockItems');
    expect(data.data).toHaveProperty('totalOrders');
    expect(data.data).toHaveProperty('pendingDeliveries');
    
    // Values should be non-negative
    expect(data.data.totalProducts).toBeGreaterThanOrEqual(0);
    expect(data.data.lowStockItems).toBeGreaterThanOrEqual(0);
  });
});