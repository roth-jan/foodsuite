// HOTPATCH: KI-Speiseplanung Fix für Live-Deployment
// Kann direkt in Browser Console eingefügt werden

console.log('🔧 Loading KI-Speiseplanung Hotpatch...');

// Helper functions
function getCurrentAIMode() {
    const activeButton = document.querySelector('.ai-button.active');
    if (activeButton) {
        return activeButton.dataset.mode || 'cost_optimized';
    }
    return 'cost_optimized';
}

function clearMealPlan() {
    // Clear all meal plan cells
    const cells = document.querySelectorAll('.meal-plan-cell');
    cells.forEach(cell => {
        cell.innerHTML = '<span class="text-muted">Gericht hier ablegen</span>';
        cell.classList.remove('has-meal');
    });
}

// Fixed AI function
window.generateAIWeekMenuFixed = async function() {
    console.log('🤖 Starting AI Meal Planning (HOTPATCH)...');
    
    const currentMode = getCurrentAIMode();
    console.log('🎯 Using AI mode:', currentMode);
    
    try {
        showToast('🤖 Generiere KI-Speiseplan...', 'info');
        
        const response = await fetch(`${API_BASE_URL}/ai/suggest-meals`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-tenant-id': TENANT_ID
            },
            body: JSON.stringify({
                mode: currentMode,
                days: 7
            })
        });
        
        if (!response.ok) {
            throw new Error(`AI API error: ${response.status}`);
        }
        
        const aiPlan = await response.json();
        console.log('✅ AI Plan received:', aiPlan);
        
        if (aiPlan.success && aiPlan.mealPlan) {
            // Clear current plan
            clearMealPlan();
            
            // Apply AI meals to calendar
            for (const [key, meal] of Object.entries(aiPlan.mealPlan)) {
                const [day, mealType] = key.split('-');
                const cellId = `${day}-${mealType}`;
                const cell = document.getElementById(cellId);
                
                if (cell && meal) {
                    cell.innerHTML = `
                        <div class="meal-item" data-recipe-id="${meal.id}">
                            <strong>${meal.name}</strong><br>
                            <small>${meal.portions} Portionen</small><br>
                            <small>€${meal.cost_per_portion}/Portion</small>
                        </div>
                    `;
                    cell.classList.add('has-meal');
                }
            }
            
            showToast(`✅ ${aiPlan.message || 'KI-Plan erfolgreich erstellt!'}`, 'success');
        } else {
            throw new Error('Invalid AI response format');
        }
        
    } catch (error) {
        console.error('❌ AI Generation Error:', error);
        showToast('❌ Fehler bei der KI-Generierung: ' + error.message, 'error');
    }
};

// Replace broken function
window.generateAIWeekMenu = window.generateAIWeekMenuFixed;

console.log('✅ KI-Speiseplanung Hotpatch loaded! Try the KI-Plan erstellen button now.');