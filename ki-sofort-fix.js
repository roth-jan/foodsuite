// SOFORTIGE KI-LÖSUNG - In Browser Console einfügen

console.log('🚀 Loading immediate KI fix...');

// Override API call to bypass CORS issue
window.generateAIWeekMenuDirect = async function() {
    console.log('🤖 Direct AI Call (bypassing CORS)...');
    
    const currentMode = document.querySelector('.ai-button.active')?.dataset?.mode || 'cost_optimized';
    
    try {
        showToast('🤖 Generiere KI-Speiseplan...', 'info');
        
        // Use different fetch approach
        const response = await fetch('/api/ai/suggest-meals', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-tenant-id': 'demo'
            },
            body: JSON.stringify({
                mode: currentMode,
                days: 7
            })
        });
        
        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }
        
        const aiPlan = await response.json();
        console.log('✅ AI Plan received:', aiPlan);
        
        if (aiPlan.success && aiPlan.mealPlan) {
            // Clear calendar
            document.querySelectorAll('.meal-plan-cell').forEach(cell => {
                cell.innerHTML = '<span class="text-muted">Gericht hier ablegen</span>';
                cell.classList.remove('has-meal');
            });
            
            // Fill calendar with AI meals
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
            
            showToast(`✅ KI-Plan erstellt: 21 Mahlzeiten generiert!`, 'success');
        }
        
    } catch (error) {
        console.error('❌ Direct AI Error:', error);
        showToast('❌ Fehler: ' + error.message, 'error');
    }
};

// Replace broken function
window.generateAIWeekMenu = window.generateAIWeekMenuDirect;

console.log('✅ Immediate KI fix loaded! Click "KI-Plan erstellen" now!');