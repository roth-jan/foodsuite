// Fix für KI-Buttons
// Dieses Skript behebt Probleme mit den KI-Funktionen

console.log('🔧 Applying KI button fixes...');

// Stelle sicher, dass die globalen Variablen definiert sind
if (typeof API_BASE_URL === 'undefined') {
    window.API_BASE_URL = 'http://localhost:3003/api';
    console.log('✅ API_BASE_URL set to:', window.API_BASE_URL);
}

if (typeof TENANT_ID === 'undefined') {
    window.TENANT_ID = 'demo';
    console.log('✅ TENANT_ID set to:', window.TENANT_ID);
}

// Stelle sicher, dass AppData existiert
if (typeof AppData === 'undefined') {
    window.AppData = {
        recipes: [],
        mealPlan: {},
        aiMode: 'cost_optimized',
        currentWeek: 1
    };
    console.log('✅ AppData initialized');
}

// Lade Rezepte wenn noch nicht geladen
async function ensureRecipesLoaded() {
    if (!AppData.recipes || AppData.recipes.length === 0) {
        console.log('📚 Loading recipes...');
        try {
            const response = await fetch(`${API_BASE_URL}/recipes?limit=100`, {
                headers: { 'x-tenant-id': TENANT_ID }
            });
            
            if (response.ok) {
                const data = await response.json();
                AppData.recipes = data.items || [];
                console.log(`✅ Loaded ${AppData.recipes.length} recipes`);
            } else {
                console.error('❌ Failed to load recipes:', response.status);
            }
        } catch (error) {
            console.error('❌ Error loading recipes:', error);
        }
    } else {
        console.log(`✅ Already have ${AppData.recipes.length} recipes`);
    }
}

// Überschreibe generateAIWeekMenu mit einer funktionierenden Version
window.generateAIWeekMenuFixed = async function() {
    console.log('🤖 Fixed generateAIWeekMenu called...');
    
    // Stelle sicher, dass Rezepte geladen sind
    await ensureRecipesLoaded();
    
    if (!AppData.recipes || AppData.recipes.length === 0) {
        showToast('❌ Keine Rezepte verfügbar für KI-Generierung', 'error');
        return;
    }
    
    const mode = document.getElementById('aiModeSelect')?.value || 'cost_optimized';
    console.log('📋 Using mode:', mode);
    
    showToast(`🤖 KI generiert Wochenmenü (${mode})...`, 'info');
    
    try {
        const response = await fetch(`${API_BASE_URL}/ai/suggest-meals`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-tenant-id': TENANT_ID
            },
            body: JSON.stringify({
                mode: mode,
                weekNumber: AppData.currentWeek || 1,
                currentPlan: {}
            })
        });
        
        console.log('📡 API Response:', response.status);
        
        if (!response.ok) {
            throw new Error(`API returned ${response.status}`);
        }
        
        const result = await response.json();
        console.log('📊 Result:', result);
        
        if (result.mealPlan) {
            AppData.mealPlan = result.mealPlan;
            console.log(`✅ Generated ${Object.keys(result.mealPlan).length} meals`);
            
            // Update UI
            if (typeof refreshMealPlanningDisplay === 'function') {
                refreshMealPlanningDisplay();
            }
            if (typeof updateCostSummary === 'function') {
                updateCostSummary();
            }
            
            showToast(`✅ KI-Wochenmenü generiert! ${Object.keys(result.mealPlan).length} Gerichte geplant`, 'success');
        } else {
            throw new Error('No meal plan in response');
        }
        
    } catch (error) {
        console.error('❌ Error generating AI meal plan:', error);
        showToast('❌ Fehler bei der KI-Generierung: ' + error.message, 'error');
    }
};

// Überschreibe die originale Funktion
if (typeof generateAIWeekMenu !== 'undefined') {
    window.generateAIWeekMenu = window.generateAIWeekMenuFixed;
    console.log('✅ Replaced generateAIWeekMenu with fixed version');
}

// Füge Event-Listener für den Button hinzu
document.addEventListener('click', function(e) {
    if (e.target.matches('button[data-action="generateAIWeekMenu"]') || 
        e.target.closest('button[data-action="generateAIWeekMenu"]')) {
        console.log('🖱️ KI button clicked!');
        e.preventDefault();
        generateAIWeekMenuFixed();
    }
});

// Test-Funktion
window.testKI = async function() {
    console.log('🧪 Testing KI functionality...');
    await ensureRecipesLoaded();
    await generateAIWeekMenuFixed();
};

console.log('✅ KI fixes applied!');
console.log('💡 You can now:');
console.log('   - Click "KI-Plan erstellen" button');
console.log('   - Run testKI() in console');
console.log('   - Check AppData.recipes to see loaded recipes');