const fetch = require('node-fetch');

const API_URL = 'http://18.195.206.72:3005/api';
let authToken = '';
const TENANT_ID = '1'; // Numerischer String für tenant_id

async function login() {
    console.log('🔐 Login als Admin...');
    const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'x-tenant-id': TENANT_ID
        },
        body: JSON.stringify({
            username: 'admin',
            password: 'Demo123!'
        })
    });
    
    if (!response.ok) {
        console.error('Login Response Status:', response.status);
        const text = await response.text();
        console.error('Login Error:', text);
        return false;
    }
    
    const data = await response.json();
    if (data.token) {
        authToken = data.token;
        console.log('✅ Login erfolgreich!');
        return true;
    }
    console.error('❌ Kein Token erhalten:', data);
    return false;
}

async function createSuppliers() {
    console.log('\n🚚 Erstelle Lieferanten...');
    const suppliers = [
        { name: 'METRO AG', type: 'Großhandel', email: 'bestellung@metro.de' },
        { name: 'Transgourmet', type: 'Großhandel', email: 'order@transgourmet.de' },
        { name: 'Metzgerei Wagner', type: 'Regional', email: 'info@metzgerei-wagner.de' },
        { name: 'Bio-Hof Schmidt', type: 'Regional', email: 'bio@schmidt-hof.de' }
    ];
    
    for (const supplier of suppliers) {
        const response = await fetch(`${API_URL}/suppliers`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`,
                'x-tenant-id': TENANT_ID
            },
            body: JSON.stringify(supplier)
        });
        if (!response.ok) {
            console.error(`Fehler bei Lieferant ${supplier.name}:`, response.status, await response.text());
        }
    }
    console.log(`✅ ${suppliers.length} Lieferanten erstellt`);
}

async function createProducts() {
    console.log('\n📦 Erstelle Produkte...');
    const products = [
        { name: 'Tomaten rot', article_number: 'TOM-001', category: 'Gemüse', unit: 'kg', price: 2.50, supplier_id: 1, stock: 50 },
        { name: 'Zwiebeln gelb', article_number: 'ZWI-001', category: 'Gemüse', unit: 'kg', price: 1.80, supplier_id: 1, stock: 80 },
        { name: 'Kartoffeln festkochend', article_number: 'KAR-001', category: 'Gemüse', unit: 'kg', price: 1.20, supplier_id: 2, stock: 120 },
        { name: 'Rindergulasch', article_number: 'RIN-001', category: 'Fleisch', unit: 'kg', price: 12.90, supplier_id: 3, stock: 30 },
        { name: 'Hähnchenbrust', article_number: 'HAE-001', category: 'Fleisch', unit: 'kg', price: 8.90, supplier_id: 3, stock: 40 },
        { name: 'Basmati Reis', article_number: 'REI-001', category: 'Grundnahrung', unit: 'kg', price: 3.50, supplier_id: 2, stock: 60 },
        { name: 'Spaghetti', article_number: 'NUD-001', category: 'Grundnahrung', unit: 'kg', price: 1.80, supplier_id: 2, stock: 90 },
        { name: 'Olivenöl', article_number: 'OEL-001', category: 'Grundnahrung', unit: 'l', price: 8.90, supplier_id: 1, stock: 25 },
        { name: 'Vollmilch', article_number: 'MIL-001', category: 'Milchprodukte', unit: 'l', price: 1.19, supplier_id: 1, stock: 40 },
        { name: 'Pfeffer schwarz', article_number: 'PFE-001', category: 'Gewürze', unit: 'kg', price: 18.90, supplier_id: 1, stock: 10 }
    ];
    
    for (const product of products) {
        const response = await fetch(`${API_URL}/products`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`,
                'x-tenant-id': TENANT_ID
            },
            body: JSON.stringify(product)
        });
        if (!response.ok) {
            console.error(`Fehler bei Produkt ${product.name}:`, response.status, await response.text());
        }
    }
    console.log(`✅ ${products.length} Produkte erstellt`);
}

async function createRecipes() {
    console.log('\n🍳 Erstelle Rezepte...');
    const recipes = [
        {
            name: 'Spaghetti Bolognese',
            category: 'Hauptgericht',
            servings: 10,
            preparation_time: 30,
            cooking_time: 45,
            cost_per_serving: 2.80,
            selling_price: 5.90,
            ingredients: [
                { product_id: 7, quantity: 1.5, unit: 'kg' },
                { product_id: 4, quantity: 1.0, unit: 'kg' },
                { product_id: 1, quantity: 0.5, unit: 'kg' },
                { product_id: 2, quantity: 0.2, unit: 'kg' }
            ]
        },
        {
            name: 'Hähnchencurry mit Reis',
            category: 'Hauptgericht',
            servings: 10,
            preparation_time: 20,
            cooking_time: 30,
            cost_per_serving: 3.50,
            selling_price: 6.90,
            ingredients: [
                { product_id: 5, quantity: 1.5, unit: 'kg' },
                { product_id: 6, quantity: 1.0, unit: 'kg' },
                { product_id: 2, quantity: 0.3, unit: 'kg' },
                { product_id: 9, quantity: 0.5, unit: 'l' }
            ]
        },
        {
            name: 'Kartoffelgulasch',
            category: 'Hauptgericht',
            servings: 10,
            preparation_time: 20,
            cooking_time: 40,
            cost_per_serving: 2.20,
            selling_price: 4.50,
            ingredients: [
                { product_id: 3, quantity: 2.0, unit: 'kg' },
                { product_id: 4, quantity: 0.5, unit: 'kg' },
                { product_id: 2, quantity: 0.3, unit: 'kg' }
            ]
        },
        {
            name: 'Gemüsepfanne',
            category: 'Vegetarisch',
            servings: 10,
            preparation_time: 15,
            cooking_time: 20,
            cost_per_serving: 1.80,
            selling_price: 3.90,
            ingredients: [
                { product_id: 1, quantity: 0.5, unit: 'kg' },
                { product_id: 2, quantity: 0.3, unit: 'kg' },
                { product_id: 3, quantity: 1.0, unit: 'kg' },
                { product_id: 8, quantity: 0.1, unit: 'l' }
            ]
        }
    ];
    
    for (const recipe of recipes) {
        const response = await fetch(`${API_URL}/recipes`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`,
                'x-tenant-id': TENANT_ID
            },
            body: JSON.stringify(recipe)
        });
        if (!response.ok) {
            console.error(`Fehler bei Rezept ${recipe.name}:`, response.status, await response.text());
        }
    }
    console.log(`✅ ${recipes.length} Rezepte erstellt`);
}

async function checkData() {
    console.log('\n📊 Prüfe Daten...');
    
    // Produkte
    const productsRes = await fetch(`${API_URL}/products`, {
        headers: {
            'Authorization': `Bearer ${authToken}`,
            'x-tenant-id': TENANT_ID
        }
    });
    const products = await productsRes.json();
    console.log(`✅ ${products.items?.length || 0} Produkte in DB`);
    
    // Rezepte
    const recipesRes = await fetch(`${API_URL}/recipes`, {
        headers: {
            'Authorization': `Bearer ${authToken}`,
            'x-tenant-id': TENANT_ID
        }
    });
    const recipes = await recipesRes.json();
    console.log(`✅ ${recipes.items?.length || 0} Rezepte in DB`);
    
    // Lieferanten
    const suppliersRes = await fetch(`${API_URL}/suppliers`, {
        headers: {
            'Authorization': `Bearer ${authToken}`,
            'x-tenant-id': TENANT_ID
        }
    });
    const suppliers = await suppliersRes.json();
    console.log(`✅ ${suppliers.items?.length || 0} Lieferanten in DB`);
}

async function seedDatabase() {
    console.log('🚀 Fülle FoodSuite Datenbank über API...\n');
    
    try {
        // Login
        const loggedIn = await login();
        if (!loggedIn) {
            console.error('❌ Login fehlgeschlagen!');
            return;
        }
        
        // Erstelle Daten
        await createSuppliers();
        await createProducts();
        await createRecipes();
        
        // Prüfe Ergebnis
        await checkData();
        
        console.log('\n✅ DATENBANK ERFOLGREICH GEFÜLLT!');
        console.log('🔗 Teste jetzt: http://18.195.206.72:3005');
        
    } catch (error) {
        console.error('❌ Fehler:', error.message);
    }
}

// Starte Seed
seedDatabase();