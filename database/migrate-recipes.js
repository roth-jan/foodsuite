// Migration: Alte Rezepte zum neuen Artikel-System

const migrateRecipesToNewSystem = {
    
    // Erweitere Lieferantenartikel für bessere Rezept-Abdeckung
    additionalSupplierArticles: [
        
        // ZWIEBELN - für Rindergulasch
        {
            id: 1008,
            supplier_id: 1, // Gemüsehof Meyer
            article_number: "MEYER-ZWIEBEL-10KG",
            name: "Zwiebeln gelb, 10kg Netz",
            neutral_article_id: 6, // Neue neutral ID für Zwiebeln
            price: 12.90,
            unit: "10kg Netz",
            availability: "available",
            lead_time_days: 1,
            nutrition: {
                energy_kj: 166,
                energy_kcal: 40,
                protein: 1.1,
                carbs: 9.3,
                fat: 0.1,
                fiber: 1.8,
                salt: 0.004
            },
            allergens: [],
            allergen_traces: [],
            organic: true,
            regional: true,
            fairtrade: false,
            quality_grade: "A",
            tenant_id: 1,
            status: "active"
        },
        
        // PFEFFER - Gewürze
        {
            id: 1009,
            supplier_id: 2, // Transgourmet Deutschland
            article_number: "TG-PFEFFER-1KG",
            name: "Pfeffer schwarz gemahlen, 1kg Dose",
            neutral_article_id: 7, // Neue neutral ID für Gewürze
            price: 24.90,
            unit: "1kg Dose",
            availability: "available",
            lead_time_days: 2,
            nutrition: {
                energy_kj: 1329,
                energy_kcal: 251,
                protein: 10.4,
                carbs: 64.8,
                fat: 3.3,
                fiber: 25.3,
                salt: 0.02
            },
            allergens: [],
            allergen_traces: ["Sellerie", "Senf"],
            organic: false,
            regional: false,
            fairtrade: false,
            quality_grade: "B",
            tenant_id: 1,
            status: "active"
        },
        
        // PAPRIKA - Gewürze
        {
            id: 1010,
            supplier_id: 2, // Transgourmet Deutschland
            article_number: "TG-PAPRIKA-500G",
            name: "Paprika edelsüß, 500g Dose",
            neutral_article_id: 7, // Gewürze
            price: 8.90,
            unit: "500g Dose",
            availability: "available",
            lead_time_days: 2,
            nutrition: {
                energy_kj: 1417,
                energy_kcal: 289,
                protein: 14.8,
                carbs: 54.0,
                fat: 12.9,
                fiber: 37.4,
                salt: 0.68
            },
            allergens: [],
            allergen_traces: [],
            organic: false,
            regional: false,
            fairtrade: false,
            quality_grade: "B",
            tenant_id: 1,
            status: "active"
        },
        
        // CURRY PULVER - für Hähnchencurry
        {
            id: 1011,
            supplier_id: 2, // Transgourmet Deutschland
            article_number: "TG-CURRY-1KG",
            name: "Curry Pulver mild, 1kg Dose",
            neutral_article_id: 7, // Gewürze
            price: 22.90,
            unit: "1kg Dose",
            availability: "available",
            lead_time_days: 2,
            nutrition: {
                energy_kj: 1340,
                energy_kcal: 325,
                protein: 14.3,
                carbs: 58.2,
                fat: 14.0,
                fiber: 53.2,
                salt: 0.52
            },
            allergens: [],
            allergen_traces: ["Sellerie", "Senf", "Sesam"],
            organic: false,
            regional: false,
            fairtrade: true,
            quality_grade: "A",
            tenant_id: 1,
            status: "active"
        },
        
        // KOKOSMILCH - für Hähnchencurry
        {
            id: 1012,
            supplier_id: 2, // Transgourmet Deutschland
            article_number: "TG-KOKOSMILCH-12x400ML",
            name: "Kokosmilch, 12x400ml Dosen",
            neutral_article_id: 8, // Neue neutral ID für Milchersatz
            price: 28.90,
            unit: "12x400ml Karton",
            availability: "available",
            lead_time_days: 3,
            nutrition: {
                energy_kj: 870,
                energy_kcal: 230,
                protein: 2.3,
                carbs: 6.0,
                fat: 24.0,
                fiber: 0,
                salt: 0.02
            },
            allergens: [],
            allergen_traces: ["Nüsse"],
            organic: false,
            regional: false,
            fairtrade: true,
            quality_grade: "A",
            tenant_id: 1,
            status: "active"
        }
    ],
    
    // Zusätzliche neutrale Artikel
    additionalNeutralArticles: [
        {
            id: 6,
            name: "Zwiebeln",
            category_id: 2, // Gemüse
            base_unit: "kg",
            avg_nutrition: {
                energy_kj: 166,
                energy_kcal: 40,
                protein: 1.1,
                carbs: 9.3,
                fat: 0.1,
                fiber: 1.8,
                salt: 0.004
            },
            common_allergens: [],
            estimated_price_range: { min: 1.00, max: 2.00, currency: "EUR" },
            description: "Zwiebeln verschiedener Sorten"
        },
        {
            id: 7,
            name: "Gewürze & Kräuter",
            category_id: 6, // Gewürze
            base_unit: "kg",
            avg_nutrition: {
                energy_kj: 1200,
                energy_kcal: 300,
                protein: 10.0,
                carbs: 50.0,
                fat: 10.0,
                fiber: 20.0,
                salt: 0.5
            },
            common_allergens: ["Sellerie", "Senf"],
            estimated_price_range: { min: 15.00, max: 50.00, currency: "EUR" },
            description: "Gewürze und Kräuter für die Küche"
        },
        {
            id: 8,
            name: "Milchersatz",
            category_id: 3, // Molkereiprodukte
            base_unit: "l",
            avg_nutrition: {
                energy_kj: 800,
                energy_kcal: 200,
                protein: 2.0,
                carbs: 8.0,
                fat: 20.0,
                fiber: 0,
                salt: 0.1
            },
            common_allergens: ["Nüsse"],
            estimated_price_range: { min: 2.00, max: 6.00, currency: "EUR" },
            description: "Pflanzliche Milchalternativen"
        }
    ],
    
    // Erweiterte Rezept-Zutaten für bestehende Rezepte
    migratedRecipeIngredients: [
        
        // RINDERGULASCH MIT SPÄTZLE (Rezept ID: 1) - VOLLSTÄNDIG
        {
            id: 1,
            recipe_id: 1,
            supplier_article_id: 1005, // WAGNER-RIND-GULASCH-5KG
            neutral_article_id: 3,     // Rindfleisch (Fallback)
            quantity: 50.0,
            unit: "kg",
            preparation_note: "in 3cm Würfel schneiden",
            optional: false,
            substitution_factor: 1.0,
            sort_order: 1
        },
        {
            id: 2,
            recipe_id: 1,
            supplier_article_id: 1003, // METRO-KART-25KG-FEST
            neutral_article_id: 2,     // Kartoffeln (Fallback)
            quantity: 25.0,
            unit: "kg",
            preparation_note: "festkochend, geschält",
            optional: false,
            substitution_factor: 1.0,
            sort_order: 2
        },
        {
            id: 5, // Neue Zutaten für vollständiges Rezept
            recipe_id: 1,
            supplier_article_id: 1008, // MEYER-ZWIEBEL-10KG
            neutral_article_id: 6,     // Zwiebeln (Fallback)
            quantity: 10.0,
            unit: "kg",
            preparation_note: "grob gewürfelt",
            optional: false,
            substitution_factor: 1.0,
            sort_order: 3
        },
        {
            id: 6,
            recipe_id: 1,
            supplier_article_id: 1009, // TG-PFEFFER-1KG
            neutral_article_id: 7,     // Gewürze (Fallback)
            quantity: 0.5,
            unit: "kg",
            preparation_note: "zum Würzen",
            optional: false,
            substitution_factor: 1.0,
            sort_order: 4
        },
        {
            id: 7,
            recipe_id: 1,
            supplier_article_id: 1010, // TG-PAPRIKA-500G
            neutral_article_id: 7,     // Gewürze (Fallback)
            quantity: 0.8,
            unit: "kg",
            preparation_note: "zum Würzen",
            optional: false,
            substitution_factor: 1.0,
            sort_order: 5
        },
        
        // HÄHNCHENCURRY MIT BASMATIREIS (Rezept ID: 4) - VOLLSTÄNDIG
        {
            id: 3,
            recipe_id: 4,
            supplier_article_id: 1006, // WAGNER-HAEHNCHEN-BRUST-5KG
            neutral_article_id: 4,     // Hähnchenfleisch (Fallback)
            quantity: 45.0,
            unit: "kg",
            preparation_note: "in Streifen geschnitten",
            optional: false,
            substitution_factor: 1.0,
            sort_order: 1
        },
        {
            id: 4,
            recipe_id: 4,
            supplier_article_id: 1007, // TG-REIS-BASMATI-25KG
            neutral_article_id: 5,     // Reis (Fallback)
            quantity: 20.0,
            unit: "kg",
            preparation_note: "gewaschen",
            optional: false,
            substitution_factor: 1.0,
            sort_order: 2
        },
        {
            id: 8, // Neue Zutaten für vollständiges Curry
            recipe_id: 4,
            supplier_article_id: 1011, // TG-CURRY-1KG
            neutral_article_id: 7,     // Gewürze (Fallback)
            quantity: 1.0,
            unit: "kg",
            preparation_note: "für die Curry-Sauce",
            optional: false,
            substitution_factor: 1.0,
            sort_order: 3
        },
        {
            id: 9,
            recipe_id: 4,
            supplier_article_id: 1012, // TG-KOKOSMILCH-12x400ML
            neutral_article_id: 8,     // Milchersatz (Fallback)
            quantity: 10.0,
            unit: "l",
            preparation_note: "für cremige Sauce",
            optional: false,
            substitution_factor: 1.0,
            sort_order: 4
        }
    ],
    
    // Migration-Funktion
    applyMigration: function(database) {
        console.log('🔄 Migrating recipes to new article system...');
        
        // 1. Erweitere neutrale Artikel
        if (!database.data.neutral_articles) {
            database.data.neutral_articles = [];
        }
        this.additionalNeutralArticles.forEach(article => {
            const exists = database.data.neutral_articles.find(a => a.id === article.id);
            if (!exists) {
                database.data.neutral_articles.push(article);
                console.log(`✅ Added neutral article: ${article.name}`);
            }
        });
        
        // 2. Erweitere Lieferantenartikel
        if (!database.data.supplier_articles) {
            database.data.supplier_articles = [];
        }
        this.additionalSupplierArticles.forEach(article => {
            const exists = database.data.supplier_articles.find(a => a.id === article.id);
            if (!exists) {
                database.data.supplier_articles.push(article);
                console.log(`✅ Added supplier article: ${article.name} (${article.article_number})`);
            }
        });
        
        // 3. Ersetze alte recipe_ingredients mit neuen
        database.data.recipe_ingredients_new = this.migratedRecipeIngredients;
        console.log(`✅ Migrated ${this.migratedRecipeIngredients.length} recipe ingredients`);
        
        // 4. Aktualisiere Rezeptkosten mit neuen Daten (asynchron nach Initialisierung)
        const recipe1 = database.data.recipes.find(r => r.id === 1);
        const recipe4 = database.data.recipes.find(r => r.id === 4);
        
        if (recipe1) {
            console.log(`🍽️ Recipe available for cost calculation: ${recipe1.name}`);
        }
        
        if (recipe4) {
            console.log(`🍽️ Recipe available for cost calculation: ${recipe4.name}`);
        }
        
        console.log('✅ Recipe migration completed successfully!');
        
        return {
            neutralArticles: this.additionalNeutralArticles.length,
            supplierArticles: this.additionalSupplierArticles.length,
            recipeIngredients: this.migratedRecipeIngredients.length,
            migratedRecipes: 2
        };
    }
};

module.exports = migrateRecipesToNewSystem;