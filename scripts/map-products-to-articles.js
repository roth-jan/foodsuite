// Map all products to their corresponding supplier articles
// This ensures ALL 150 products appear in recipe ingredient dropdowns

const productArticleMappings = {
    // === GEMÜSE ===
    "Bio-Tomaten rot, 5kg Kiste": { supplier_article_id: 1001, neutral_article_id: 1 },
    "Tomaten rot, 10kg Karton": { supplier_article_id: 1002, neutral_article_id: 1 },
    "Kartoffeln festkochend, 25kg Sack": { supplier_article_id: 1003, neutral_article_id: 2 },
    "Kartoffeln mehlig, 25kg Sack": { supplier_article_id: 1004, neutral_article_id: 2 },
    "Blumenkohl TK, 2kg Beutel": { supplier_article_id: 1020, neutral_article_id: 6 },
    "Blumenkohl": { supplier_article_id: 1020, neutral_article_id: 6 },
    "Möhren, 10kg Sack": { supplier_article_id: 1023, neutral_article_id: 9 },
    "Möhren": { supplier_article_id: 1023, neutral_article_id: 9 },
    
    // === FLEISCH ===
    "Rindergulasch regional, 5kg Packung": { supplier_article_id: 1005, neutral_article_id: 3 },
    "Rindfleisch Gulasch": { supplier_article_id: 1005, neutral_article_id: 3 },
    "Hähnchenbrust, 5kg Packung": { supplier_article_id: 1006, neutral_article_id: 4 },
    "Hähnchenbrust": { supplier_article_id: 1006, neutral_article_id: 4 },
    "Hähnchenschnitzel": { supplier_article_id: 1006, neutral_article_id: 4 },
    
    // === MILCHPRODUKTE ===
    "Sahne 30%, 5L Kanister": { supplier_article_id: 1022, neutral_article_id: 8 },
    "Sahne 30%": { supplier_article_id: 1022, neutral_article_id: 8 },
    "Butter, 5kg Block": { supplier_article_id: 1025, neutral_article_id: 11 },
    "Butter": { supplier_article_id: 1025, neutral_article_id: 11 },
    "Milch 3,5%, 10L Kanister": { supplier_article_id: 1026, neutral_article_id: 12 },
    "Milch 3.5%": { supplier_article_id: 1026, neutral_article_id: 12 },
    "Milch 3,5%": { supplier_article_id: 1026, neutral_article_id: 12 },
    
    // === GETRÄNKE ===
    "Apfelsaftkonzentrat, 5L Kanister": { supplier_article_id: 1021, neutral_article_id: 7 },
    "Apfelsaftkonzentrat": { supplier_article_id: 1021, neutral_article_id: 7 },
    "Apfelsaft": { supplier_article_id: 1021, neutral_article_id: 7 },
    
    // === GRUNDNAHRUNG ===
    "Reis Basmati, 10kg Sack": { supplier_article_id: 1007, neutral_article_id: 5 },
    "Reis Basmati": { supplier_article_id: 1007, neutral_article_id: 5 },
    "Nudeln Penne, 5kg Karton": { supplier_article_id: 1024, neutral_article_id: 10 },
    "Nudeln Penne": { supplier_article_id: 1024, neutral_article_id: 10 }
};

// Function to apply mappings to existing products
function applyProductArticleMappings(db) {
    if (!db.data || !db.data.products) {
        console.log('❌ No products data available');
        return { success: false, error: 'No products data' };
    }
    
    const products = db.data.products;
    let mapped = 0;
    let created = 0;
    
    console.log(`📊 Processing ${products.length} products for article mapping...`);
    
    products.forEach(product => {
        const productName = product.name;
        
        // Direct mapping
        if (productArticleMappings[productName]) {
            const mapping = productArticleMappings[productName];
            product.supplier_article_id = mapping.supplier_article_id;
            product.neutral_article_id = mapping.neutral_article_id;
            mapped++;
            console.log(`✅ Direct mapping: ${productName}`);
            return;
        }
        
        // Fuzzy matching for similar names
        const fuzzyMatch = Object.keys(productArticleMappings).find(key => {
            const keyWords = key.toLowerCase().split(/[\s,]+/);
            const productWords = productName.toLowerCase().split(/[\s,]+/);
            
            // Check if at least 2 key words match
            const matches = keyWords.filter(word => 
                productWords.some(pWord => 
                    pWord.includes(word) || word.includes(pWord)
                )
            );
            
            return matches.length >= 2;
        });
        
        if (fuzzyMatch) {
            const mapping = productArticleMappings[fuzzyMatch];
            product.supplier_article_id = mapping.supplier_article_id;
            product.neutral_article_id = mapping.neutral_article_id;
            mapped++;
            console.log(`✅ Fuzzy mapping: ${productName} → ${fuzzyMatch}`);
            return;
        }
        
        // Create automatic mapping for unmapped products
        const autoMapping = createAutoMapping(productName, product.category);
        if (autoMapping) {
            product.supplier_article_id = autoMapping.supplier_article_id;
            product.neutral_article_id = autoMapping.neutral_article_id;
            created++;
            console.log(`🔧 Auto mapping: ${productName} → Neutral ${autoMapping.neutral_article_id}`);
        }
    });
    
    console.log(`\n📊 Mapping Summary:`);
    console.log(`✅ Direct/Fuzzy mapped: ${mapped}`);
    console.log(`🔧 Auto-generated mappings: ${created}`);
    console.log(`📦 Total products with articles: ${mapped + created}`);
    
    return {
        success: true,
        directMapped: mapped,
        autoMapped: created,
        totalMapped: mapped + created,
        totalProducts: products.length
    };
}

function createAutoMapping(productName, category) {
    // Create automatic neutral article mappings for unmapped products
    const categoryNeutralMapping = {
        'Gemüse': 2,      // Kartoffeln
        'Fleisch': 3,     // Rindfleisch  
        'Fisch': 3,       // Rindfleisch (fallback)
        'Milchprodukte': 12, // Milch
        'Molkereiprodukte': 12, // Milch
        'Getreide': 5,    // Reis
        'Grundnahrung': 5, // Reis
        'Gewürze': 3,     // Generic
        'Getränke': 7,    // Apfelsaft
        'Tiefkühl': 2,    // Kartoffeln (fallback)
        'Konserven': 1,   // Tomaten (fallback)
        'Sonstige': 1     // Tomaten (fallback)
    };
    
    const neutralId = categoryNeutralMapping[category] || 1;
    
    // Generate a high supplier article ID for auto-mapped items
    const autoSupplierArticleId = 2000 + Math.abs(productName.length * 13 + productName.charCodeAt(0)) % 1000;
    
    return {
        supplier_article_id: autoSupplierArticleId,
        neutral_article_id: neutralId
    };
}

// Export for server integration
module.exports = { 
    productArticleMappings,
    applyProductArticleMappings,
    createAutoMapping
};

// Run if called directly
if (require.main === module) {
    console.log('📋 Product-Article mappings available');
    console.log(`📊 Direct mappings: ${Object.keys(productArticleMappings).length}`);
    console.log('\n🔧 Use applyProductArticleMappings(db) to apply to database');
}