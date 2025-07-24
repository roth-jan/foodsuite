// Lieferantenartikel mit vollständigen Daten für realistische Kostenberechnung

const supplierArticlesData = {
    
    // === NEUTRALE ARTIKEL (Basis-Kategorien) ===
    neutralArticles: [
        {
            id: 1,
            name: "Tomaten",
            category_id: 2, // Gemüse
            base_unit: "kg",
            avg_nutrition: {
                energy_kj: 75,
                energy_kcal: 18,
                protein: 0.9,
                carbs: 3.9,
                fat: 0.2,
                fiber: 1.2,
                salt: 0.005
            },
            common_allergens: [],
            estimated_price_range: { min: 2.50, max: 4.50, currency: "EUR" },
            description: "Frische Tomaten verschiedener Sorten"
        },
        {
            id: 2,
            name: "Kartoffeln",
            category_id: 2, // Gemüse
            base_unit: "kg",
            avg_nutrition: {
                energy_kj: 322,
                energy_kcal: 77,
                protein: 2.0,
                carbs: 17.5,
                fat: 0.1,
                fiber: 2.2,
                salt: 0.002
            },
            common_allergens: [],
            estimated_price_range: { min: 0.60, max: 1.20, currency: "EUR" },
            description: "Kartoffeln verschiedener Kochtypen"
        },
        {
            id: 3,
            name: "Rindfleisch",
            category_id: 1, // Fleisch
            base_unit: "kg",
            avg_nutrition: {
                energy_kj: 1050,
                energy_kcal: 250,
                protein: 26.0,
                carbs: 0,
                fat: 15.0,
                fiber: 0,
                salt: 0.06
            },
            common_allergens: [],
            estimated_price_range: { min: 12.00, max: 25.00, currency: "EUR" },
            description: "Rindfleisch verschiedener Teilstücke"
        },
        {
            id: 4,
            name: "Hähnchenfleisch",
            category_id: 1, // Fleisch
            base_unit: "kg",
            avg_nutrition: {
                energy_kj: 840,
                energy_kcal: 200,
                protein: 23.0,
                carbs: 0,
                fat: 11.0,
                fiber: 0,
                salt: 0.08
            },
            common_allergens: [],
            estimated_price_range: { min: 6.00, max: 15.00, currency: "EUR" },
            description: "Hähnchenfleisch verschiedener Teilstücke"
        },
        {
            id: 5,
            name: "Reis",
            category_id: 7, // Grundnahrung
            base_unit: "kg",
            avg_nutrition: {
                energy_kj: 1540,
                energy_kcal: 365,
                protein: 7.5,
                carbs: 77.8,
                fat: 0.6,
                fiber: 2.2,
                salt: 0.004
            },
            common_allergens: [],
            estimated_price_range: { min: 1.50, max: 4.00, currency: "EUR" },
            description: "Reis verschiedener Sorten"
        }
    ],
    
    // === LIEFERANTENARTIKEL (Mit spezifischen Daten) ===
    supplierArticles: [
        
        // GEMÜSEHOF MEYER - Tomaten
        {
            id: 1001,
            supplier_id: 1, // Gemüsehof Meyer
            article_number: "MEYER-TOM-5KG",
            name: "Bio-Tomaten rot, 5kg Kiste",
            neutral_article_id: 1, // Tomaten
            
            price: 19.90,
            unit: "5kg Kiste",
            availability: "available",
            lead_time_days: 2,
            
            nutrition: {
                energy_kj: 79,
                energy_kcal: 19,
                protein: 1.0,
                carbs: 3.5,
                fat: 0.2,
                fiber: 1.4,
                salt: 0.003
            },
            
            allergens: [],
            allergen_traces: ["Sellerie"], // Verarbeitung in Betrieb
            
            organic: true,
            regional: true,
            fairtrade: false,
            quality_grade: "A",
            
            tenant_id: 1,
            status: "active"
        },
        
        // TRANSGOURMET - Tomaten (günstiger, aber konventionell)
        {
            id: 1002,
            supplier_id: 2, // Transgourmet Deutschland
            article_number: "TG-TOM-10KG",
            name: "Tomaten rot, 10kg Karton",
            neutral_article_id: 1, // Tomaten
            
            price: 24.90,
            unit: "10kg Karton",
            availability: "available",
            lead_time_days: 1,
            
            nutrition: {
                energy_kj: 75,
                energy_kcal: 18,
                protein: 0.9,
                carbs: 3.9,
                fat: 0.2,
                fiber: 1.2,
                salt: 0.005
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
        
        // METRO AG - Kartoffeln festkochend
        {
            id: 1003,
            supplier_id: 3, // METRO AG
            article_number: "METRO-KART-25KG-FEST",
            name: "Kartoffeln festkochend, 25kg Sack",
            neutral_article_id: 2, // Kartoffeln
            
            price: 18.50,
            unit: "25kg Sack",
            availability: "available",
            lead_time_days: 1,
            
            nutrition: {
                energy_kj: 322,
                energy_kcal: 77,
                protein: 2.0,
                carbs: 17.5,
                fat: 0.1,
                fiber: 2.2,
                salt: 0.002
            },
            
            allergens: [],
            allergen_traces: [],
            
            organic: false,
            regional: true,
            fairtrade: false,
            quality_grade: "B",
            
            tenant_id: 1,
            status: "active"
        },
        
        // METRO AG - Kartoffeln mehlig
        {
            id: 1004,
            supplier_id: 3, // METRO AG
            article_number: "METRO-KART-25KG-MEHL",
            name: "Kartoffeln mehlig, 25kg Sack",
            neutral_article_id: 2, // Kartoffeln
            
            price: 17.50,
            unit: "25kg Sack",
            availability: "available",
            lead_time_days: 1,
            
            nutrition: {
                energy_kj: 322,
                energy_kcal: 77,
                protein: 2.0,
                carbs: 17.5,
                fat: 0.1,
                fiber: 2.2,
                salt: 0.002
            },
            
            allergens: [],
            allergen_traces: [],
            
            organic: false,
            regional: true,
            fairtrade: false,
            quality_grade: "B",
            
            tenant_id: 1,
            status: "active"
        },
        
        // METZGEREI WAGNER - Rindergulasch
        {
            id: 1005,
            supplier_id: 4, // Metzgerei Wagner
            article_number: "WAGNER-RIND-GULASCH-5KG",
            name: "Rindergulasch regional, 5kg Packung",
            neutral_article_id: 3, // Rindfleisch
            
            price: 58.50,
            unit: "5kg Packung",
            availability: "available",
            lead_time_days: 2,
            
            nutrition: {
                energy_kj: 1080,
                energy_kcal: 258,
                protein: 27.0,
                carbs: 0,
                fat: 16.5,
                fiber: 0,
                salt: 0.07
            },
            
            allergens: [],
            allergen_traces: [],
            
            organic: false,
            regional: true,
            fairtrade: false,
            quality_grade: "A",
            
            tenant_id: 1,
            status: "active"
        },
        
        // METZGEREI WAGNER - Hähnchenbrust
        {
            id: 1006,
            supplier_id: 4, // Metzgerei Wagner
            article_number: "WAGNER-HAEHNCHEN-BRUST-5KG",
            name: "Hähnchenbrust ohne Haut, 5kg Packung",
            neutral_article_id: 4, // Hähnchenfleisch
            
            price: 48.90,
            unit: "5kg Packung",
            availability: "available",
            lead_time_days: 1,
            
            nutrition: {
                energy_kj: 690,
                energy_kcal: 165,
                protein: 31.0,
                carbs: 0,
                fat: 3.6,
                fiber: 0,
                salt: 0.08
            },
            
            allergens: [],
            allergen_traces: [],
            
            organic: false,
            regional: true,
            fairtrade: false,
            quality_grade: "A",
            
            tenant_id: 1,
            status: "active"
        },
        
        // TRANSGOURMET - Basmatireis
        {
            id: 1007,
            supplier_id: 2, // Transgourmet Deutschland
            article_number: "TG-REIS-BASMATI-25KG",
            name: "Basmatireis Premium, 25kg Sack",
            neutral_article_id: 5, // Reis
            
            price: 89.50,
            unit: "25kg Sack",
            availability: "available",
            lead_time_days: 3,
            
            nutrition: {
                energy_kj: 1520,
                energy_kcal: 360,
                protein: 8.5,
                carbs: 78.0,
                fat: 0.5,
                fiber: 1.8,
                salt: 0.002
            },
            
            allergens: [],
            allergen_traces: ["Gluten"], // Verarbeitung in glutenhaltigen Betrieb
            
            organic: false,
            regional: false,
            fairtrade: true,
            quality_grade: "A",
            
            tenant_id: 1,
            status: "active"
        }
    ],
    
    // === REZEPT-ZUTATEN (Mit korrekter Artikel-Verknüpfung) ===
    recipeIngredients: [
        
        // RINDERGULASCH MIT SPÄTZLE (Rezept ID: 1)
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
        
        // HÄHNCHENCURRY MIT BASMATIREIS (Rezept ID: 4)
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
        }
    ]
};

module.exports = supplierArticlesData;