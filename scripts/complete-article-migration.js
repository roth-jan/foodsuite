// Complete article migration - map ALL products to article system
const db = require('../database/db-memory');

async function migrateAllProductsToArticleSystem() {
    console.log('🔄 Starting complete product-to-article migration...');
    
    if (!db.data) {
        await db.initialize();
    }
    
    const products = db.data.products || [];
    const neutralArticles = db.data.neutral_articles || [];
    const supplierArticles = db.data.supplier_articles || [];
    
    console.log(`📊 Found ${products.length} products to migrate`);
    console.log(`📊 Existing neutral articles: ${neutralArticles.length}`);
    console.log(`📊 Existing supplier articles: ${supplierArticles.length}`);
    
    let neutralCreated = 0;
    let supplierCreated = 0;
    let mapped = 0;
    
    // Create category mapping
    const categoryMapping = {
        'Gemüse': 2,
        'Fleisch': 1,
        'Fisch': 3,
        'Milchprodukte': 4,
        'Molkereiprodukte': 4,
        'Getreide': 5,
        'Gewürze': 6,
        'Getränke': 7,
        'Tiefkühl': 8,
        'Konserven': 9,
        'Backwaren': 10,
        'Süßwaren': 11,
        'Sonstige': 99
    };
    
    // Process each product
    for (const product of products) {
        const productName = product.name;
        const category = product.category || 'Sonstige';
        const categoryId = categoryMapping[category] || 99;
        
        // Check if product already has article mapping
        const existingSupplierArticle = supplierArticles.find(sa => 
            sa.name === productName || 
            sa.name.includes(productName.split(',')[0]) ||
            productName.includes(sa.name.split(',')[0])
        );
        
        if (existingSupplierArticle) {
            // Product already mapped
            mapped++;
            continue;
        }
        
        // Extract base product name (remove size/pack info)
        const baseProductName = extractBaseProductName(productName);
        
        // Find or create neutral article
        let neutralArticle = neutralArticles.find(na => 
            na.name === baseProductName || 
            na.name.includes(baseProductName) ||
            baseProductName.includes(na.name)
        );
        
        if (!neutralArticle) {
            // Create new neutral article
            const neutralId = Math.max(...neutralArticles.map(na => na.id || 0), 0) + 1;
            neutralArticle = {
                id: neutralId,
                name: baseProductName,
                category_id: categoryId,
                base_unit: extractUnit(product.unit),
                avg_nutrition: generateEstimatedNutrition(baseProductName, category),
                common_allergens: extractCommonAllergens(baseProductName, category),
                estimated_price_range: {
                    min: Math.max(0.50, (product.price || 1) * 0.8),
                    max: (product.price || 1) * 1.2,
                    currency: "EUR"
                },
                description: `${baseProductName} - verschiedene Anbieter und Packungsgrößen`
            };
            
            neutralArticles.push(neutralArticle);
            neutralCreated++;
            console.log(`✅ Created neutral article: ${baseProductName}`);
        }
        
        // Create supplier article for specific product
        const supplierArticleId = Math.max(...supplierArticles.map(sa => sa.id || 0), 0) + 1;
        const supplierArticle = {
            id: supplierArticleId,
            neutral_article_id: neutralArticle.id,
            supplier_id: product.supplier_id || getDefaultSupplierId(category),
            article_number: generateArticleNumber(productName),
            name: productName,
            price: product.price || estimatePrice(baseProductName, category),
            unit: product.unit || 'kg',
            pack_size: extractPackSize(productName),
            availability: 'available',
            allergens: extractSpecificAllergens(productName, category),
            nutritional_info: generateSpecificNutrition(productName, category),
            last_price_update: new Date().toISOString(),
            created_at: new Date().toISOString()
        };
        
        supplierArticles.push(supplierArticle);
        supplierCreated++;
        
        // Update product with article references
        product.supplier_article_id = supplierArticleId;
        product.neutral_article_id = neutralArticle.id;
        
        console.log(`✅ Mapped: ${productName} → ${baseProductName} (Supplier Article ${supplierArticleId})`);
    }
    
    // Update database
    db.data.neutral_articles = neutralArticles;
    db.data.supplier_articles = supplierArticles;
    
    console.log('\n📊 Migration Summary:');
    console.log(`✅ Neutral articles created: ${neutralCreated}`);
    console.log(`✅ Supplier articles created: ${supplierCreated}`);
    console.log(`✅ Products already mapped: ${mapped}`);
    console.log(`✅ Total products processed: ${products.length}`);
    
    // Verify all products now have article mapping
    const unmappedProducts = products.filter(p => !p.supplier_article_id && !p.neutral_article_id);
    console.log(`🔍 Unmapped products remaining: ${unmappedProducts.length}`);
    
    if (unmappedProducts.length > 0) {
        console.log('⚠️ Unmapped products:');
        unmappedProducts.forEach(p => console.log(`  - ${p.name}`));
    }
    
    return {
        success: true,
        neutralCreated,
        supplierCreated,
        totalMapped: products.length - unmappedProducts.length,
        unmapped: unmappedProducts.length
    };
}

// Helper functions
function extractBaseProductName(fullName) {
    // Remove size, pack info, brand info
    let baseName = fullName;
    
    // Remove common pack size patterns
    baseName = baseName.replace(/,?\s*\d+\s*(kg|g|L|ml|Stück|Karton|Kiste|Sack|Dose|Packung|Netz).*$/i, '');
    baseName = baseName.replace(/\s*(TK|tiefgekühlt|bio|regional|frisch)$/i, '');
    baseName = baseName.trim();
    
    return baseName || fullName;
}

function extractUnit(unit) {
    const unitMapping = {
        'kg': 'kg',
        'g': 'kg',
        'L': 'L',
        'ml': 'L',
        'Stück': 'Stück',
        'Dose': 'Stück',
        'Packung': 'Stück'
    };
    
    return unitMapping[unit] || 'kg';
}

function generateEstimatedNutrition(productName, category) {
    // Basic nutrition estimates based on category and product name
    const nutritionTemplates = {
        'Gemüse': { energy_kcal: 25, protein: 2, carbs: 5, fat: 0.2, fiber: 3 },
        'Fleisch': { energy_kcal: 200, protein: 20, carbs: 0, fat: 15, fiber: 0 },
        'Fisch': { energy_kcal: 150, protein: 22, carbs: 0, fat: 8, fiber: 0 },
        'Milchprodukte': { energy_kcal: 65, protein: 3.5, carbs: 4.8, fat: 3.5, fiber: 0 },
        'Getreide': { energy_kcal: 350, protein: 10, carbs: 70, fat: 2, fiber: 8 },
        'Gewürze': { energy_kcal: 250, protein: 10, carbs: 50, fat: 5, fiber: 15 }
    };
    
    return nutritionTemplates[category] || nutritionTemplates['Sonstige'] || nutritionTemplates['Gemüse'];
}

function extractCommonAllergens(productName, category) {
    const allergenPatterns = {
        'Milch': ['Milch'],
        'Ei': ['Ei'],
        'Weizen': ['Gluten'],
        'Nuss': ['Nüsse'],
        'Soja': ['Soja'],
        'Fisch': ['Fisch'],
        'Garnele': ['Krebstiere']
    };
    
    const allergens = [];
    Object.keys(allergenPatterns).forEach(pattern => {
        if (productName.toLowerCase().includes(pattern.toLowerCase())) {
            allergens.push(...allergenPatterns[pattern]);
        }
    });
    
    return allergens;
}

function extractSpecificAllergens(productName, category) {
    // More specific allergen detection for individual products
    return extractCommonAllergens(productName, category);
}

function generateSpecificNutrition(productName, category) {
    // Generate more specific nutrition based on exact product
    const baseNutrition = generateEstimatedNutrition(extractBaseProductName(productName), category);
    
    // Adjust for specific products
    if (productName.includes('Bio')) {
        baseNutrition.protein *= 1.1; // Bio products often have higher protein
    }
    
    if (productName.includes('TK')) {
        baseNutrition.energy_kcal *= 0.95; // Frozen products slightly lower energy
    }
    
    return baseNutrition;
}

function getDefaultSupplierId(category) {
    // Assign default suppliers based on category
    const categorySuppliers = {
        'Gemüse': 3,      // BioFrisch Vertrieb
        'Fleisch': 4,     // Fleischerei Wagner
        'Fisch': 4,       // Fleischerei Wagner
        'Milchprodukte': 5, // Molkerei Hansen
        'Getreide': 1,    // METRO AG
        'Gewürze': 7,     // Getränke Müller (diverser Lieferant)
        'Getränke': 7,    // Getränke Müller
        'Tiefkühl': 1,    // METRO AG
        'Konserven': 2,   // Großhandel Schmidt
        'Sonstige': 1     // METRO AG
    };
    
    return categorySuppliers[category] || 1; // Default to METRO AG
}

function generateArticleNumber(productName) {
    // Generate meaningful article numbers
    const baseName = extractBaseProductName(productName);
    const prefix = baseName.substring(0, 3).toUpperCase();
    const hash = baseName.length * 13 + baseName.charCodeAt(0);
    const suffix = (hash % 10000).toString().padStart(4, '0');
    
    return `${prefix}-${suffix}`;
}

function estimatePrice(baseName, category) {
    // Estimate prices based on category and product
    const categoryPrices = {
        'Gemüse': 2.50,
        'Fleisch': 15.00,
        'Fisch': 18.00,
        'Milchprodukte': 1.20,
        'Getreide': 1.80,
        'Gewürze': 25.00,
        'Getränke': 1.50,
        'Tiefkühl': 3.50,
        'Konserven': 2.20
    };
    
    let basePrice = categoryPrices[category] || 5.00;
    
    // Adjust for specific products
    if (baseName.includes('Bio')) basePrice *= 1.4;
    if (baseName.includes('Premium')) basePrice *= 1.6;
    if (baseName.includes('TK')) basePrice *= 0.9;
    
    return Math.round(basePrice * 100) / 100;
}

function extractPackSize(productName) {
    const sizeMatch = productName.match(/(\d+\s*(kg|g|L|ml|Stück))/i);
    return sizeMatch ? sizeMatch[1] : '1 kg';
}

// Run migration if called directly
if (require.main === module) {
    migrateAllProductsToArticleSystem().then(result => {
        console.log('\n🎯 Migration completed!');
        console.log(JSON.stringify(result, null, 2));
        process.exit(0);
    }).catch(error => {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    });
}

module.exports = { migrateAllProductsToArticleSystem };