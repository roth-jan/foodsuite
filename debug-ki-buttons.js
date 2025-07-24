// Debug-Skript für KI-Buttons
// Füge dies in die Browser-Konsole ein, während du auf localhost:3003 bist

console.log('🔍 KI-Button Debugger gestartet...');

// Überprüfe ob Funktionen existieren
console.log('\n📋 Funktions-Check:');
console.log('generateAIWeekMenu:', typeof generateAIWeekMenu);
console.log('optimizeCurrentPlan:', typeof optimizeCurrentPlan);
console.log('generateIntelligentShoppingList:', typeof generateIntelligentShoppingList);

// Überprüfe API-Variablen
console.log('\n🔧 API-Konfiguration:');
console.log('API_BASE_URL:', typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : 'NICHT DEFINIERT');
console.log('TENANT_ID:', typeof TENANT_ID !== 'undefined' ? TENANT_ID : 'NICHT DEFINIERT');

// Überprüfe AppData
console.log('\n💾 AppData:');
console.log('AppData.recipes:', Array.isArray(AppData?.recipes) ? AppData.recipes.length + ' Rezepte' : 'KEINE REZEPTE');
console.log('AppData.mealPlan:', typeof AppData?.mealPlan === 'object' ? Object.keys(AppData.mealPlan).length + ' Einträge' : 'KEIN PLAN');
console.log('AppData.aiMode:', AppData?.aiMode || 'NICHT GESETZT');

// Finde KI-Buttons
console.log('\n🔘 KI-Buttons im DOM:');
const buttons = {
    generate: document.querySelector('button[data-action="generateAIWeekMenu"]'),
    optimize: document.querySelector('button[data-action="optimizeCurrentPlan"]'),
    shopping: document.querySelector('button[onclick*="generateIntelligentShoppingList"]'),
    designer: document.querySelector('.ai-designer-btn')
};

Object.entries(buttons).forEach(([name, btn]) => {
    if (btn) {
        console.log(`✅ ${name}:`, btn.textContent.trim(), '- Sichtbar:', btn.offsetParent !== null);
    } else {
        console.log(`❌ ${name}: NICHT GEFUNDEN`);
    }
});

// Überprüfe Meal Planning Sektion
const mealPlanningSection = document.querySelector('#mealplanning');
console.log('\n📅 Meal Planning Sektion:', mealPlanningSection ? 'GEFUNDEN' : 'NICHT GEFUNDEN');
if (mealPlanningSection) {
    console.log('Sichtbar:', mealPlanningSection.style.display !== 'none');
}

// Test-Funktion für KI-Plan
window.testKIPlan = async function() {
    console.log('\n🧪 Teste KI-Plan Generierung...');
    
    try {
        const response = await fetch(`${API_BASE_URL}/ai/suggest-meals`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-tenant-id': TENANT_ID
            },
            body: JSON.stringify({
                mode: 'cost_optimized',
                weekNumber: 1,
                currentPlan: {}
            })
        });
        
        const data = await response.json();
        console.log('API Response:', response.status, data);
        
        if (response.ok) {
            console.log('✅ API funktioniert!');
            console.log('Generierte Mahlzeiten:', Object.keys(data.mealPlan || {}).length);
        } else {
            console.log('❌ API Fehler:', data);
        }
    } catch (error) {
        console.log('❌ Netzwerkfehler:', error);
    }
};

// Überwache Button-Klicks
document.addEventListener('click', function(e) {
    if (e.target.matches('button[data-action]')) {
        const action = e.target.getAttribute('data-action');
        console.log(`\n🖱️ Button geklickt: ${action}`);
        console.log('Button:', e.target);
        console.log('Text:', e.target.textContent.trim());
    }
}, true);

console.log('\n✨ Debug-Setup abgeschlossen!');
console.log('Führe testKIPlan() aus, um die API zu testen.');
console.log('Klicke auf KI-Buttons und beobachte die Konsole.');