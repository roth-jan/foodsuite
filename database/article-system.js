// Artikel-System: Lieferantenartikel → Neutrale Artikel → Rezepte

class ArticleSystem {
    
    // === DATENSTRUKTUREN ===
    
    // 1. LIEFERANTENARTIKEL (Priorität 1 für Rezepte)
    static supplierArticleSchema = {
        id: 'unique_id',
        supplier_id: 'foreign_key_to_supplier',
        article_number: 'supplier_article_code', // z.B. "MEYER-TOM-5KG"
        name: 'detailed_product_name',
        neutral_article_id: 'links_to_neutral_article', // Mapping zu neutralem Artikel
        
        // PREISE & VERFÜGBARKEIT
        price: 'current_price_per_unit',
        unit: 'packaging_unit', // z.B. "5kg Kiste", "10L Kanister"
        availability: 'current_availability_status',
        lead_time_days: 'delivery_time',
        
        // NÄHRWERTE VOM LIEFERANTEN
        nutrition: {
            energy_kj: 'per_100g',
            energy_kcal: 'per_100g',
            protein: 'per_100g',
            carbs: 'per_100g',
            fat: 'per_100g',
            fiber: 'per_100g',
            salt: 'per_100g'
        },
        
        // ALLERGENE VOM LIEFERANTEN
        allergens: ['list_of_allergens'],
        allergen_traces: ['may_contain_traces'],
        
        // QUALITÄTSMERKMALE
        organic: 'boolean',
        regional: 'boolean',
        fairtrade: 'boolean',
        quality_grade: 'A|B|C',
        
        // META
        tenant_id: 'multi_tenant',
        status: 'active|inactive|discontinued',
        created_at: 'timestamp',
        updated_at: 'timestamp'
    };
    
    // 2. NEUTRALE ARTIKEL (Fallback wenn kein Lieferanterartikel)
    static neutralArticleSchema = {
        id: 'unique_id',
        name: 'generic_name', // z.B. "Tomaten"
        category_id: 'product_category',
        base_unit: 'kg|l|stk',
        
        // DURCHSCHNITTLICHE NÄHRWERTE
        avg_nutrition: {
            energy_kj: 'average_value',
            energy_kcal: 'average_value',
            protein: 'average_value',
            carbs: 'average_value',
            fat: 'average_value',
            fiber: 'average_value',
            salt: 'average_value'
        },
        
        // HÄUFIGE ALLERGENE
        common_allergens: ['typical_allergens'],
        
        // GESCHÄTZTE KOSTEN
        estimated_price_range: {
            min: 'minimum_expected_price',
            max: 'maximum_expected_price',
            currency: 'EUR'
        },
        
        // META
        description: 'text',
        created_at: 'timestamp',
        updated_at: 'timestamp'
    };
    
    // 3. REZEPT-ZUTATEN (Verknüpfung mit Priorisierung)
    static recipeIngredientSchema = {
        id: 'unique_id',
        recipe_id: 'foreign_key',
        
        // PRIORISIERTE ARTIKEL-REFERENZ
        supplier_article_id: 'preferred_supplier_article', // PRIORITÄT 1
        neutral_article_id: 'fallback_neutral_article',    // PRIORITÄT 2
        
        // MENGENANGABEN
        quantity: 'required_amount',
        unit: 'measurement_unit',
        
        // ZUBEREITUNGSHINWEISE
        preparation_note: 'how_to_use', // z.B. "gewürfelt", "fein gehackt"
        optional: 'boolean',
        
        // SUBSTITUIERBARKEIT
        substitution_factor: 'conversion_ratio', // Für Lieferantenwechsel
        
        // META
        sort_order: 'display_order',
        created_at: 'timestamp'
    };
    
    // === BUSINESS LOGIC ===
    
    // Resolve Artikel für Rezept-Zutat
    static resolveIngredientArticle(recipeIngredient, availableSupplierArticles) {
        // 1. Versuche Lieferantenartikel (Priorität 1)
        if (recipeIngredient.supplier_article_id) {
            const supplierArticle = availableSupplierArticles.find(
                a => a.id === recipeIngredient.supplier_article_id && a.status === 'active'
            );
            
            if (supplierArticle && supplierArticle.availability === 'available') {
                return {
                    type: 'supplier_article',
                    article: supplierArticle,
                    price_per_unit: supplierArticle.price,
                    nutrition: supplierArticle.nutrition,
                    allergens: supplierArticle.allergens,
                    confidence: 'high'
                };
            }
        }
        
        // 2. Fallback auf neutralen Artikel (Priorität 2)
        if (recipeIngredient.neutral_article_id) {
            const neutralArticle = this.getNeutralArticle(recipeIngredient.neutral_article_id);
            
            if (neutralArticle) {
                return {
                    type: 'neutral_article',
                    article: neutralArticle,
                    price_per_unit: neutralArticle.estimated_price_range.min, // Vorsichtige Schätzung
                    nutrition: neutralArticle.avg_nutrition,
                    allergens: neutralArticle.common_allergens,
                    confidence: 'medium',
                    warning: 'Kein spezifischer Lieferantenartikel verfügbar'
                };
            }
        }
        
        // 3. Fehlerfall
        return {
            type: 'error',
            article: null,
            price_per_unit: 0,
            nutrition: null,
            allergens: [],
            confidence: 'none',
            error: 'Kein Artikel verfügbar - Rezept kann nicht kalkuliert werden'
        };
    }
    
    // Berechne Rezeptkosten
    static calculateRecipeCost(recipe, ingredients) {
        let totalCost = 0;
        let confidence = 'high';
        const warnings = [];
        
        for (const ingredient of ingredients) {
            const resolved = this.resolveIngredientArticle(ingredient, this.getAvailableSupplierArticles());
            
            if (resolved.type === 'error') {
                warnings.push(`Zutat nicht verfügbar: ${ingredient.name}`);
                confidence = 'none';
                continue;
            }
            
            if (resolved.type === 'neutral_article') {
                confidence = 'medium';
                warnings.push(resolved.warning);
            }
            
            const ingredientCost = resolved.price_per_unit * ingredient.quantity;
            totalCost += ingredientCost;
        }
        
        return {
            total_cost: totalCost,
            cost_per_portion: totalCost / recipe.portions,
            confidence: confidence,
            warnings: warnings,
            currency: 'EUR'
        };
    }
    
    // Suche alternative Lieferantenartikel
    static findAlternativeSupplierArticles(neutralArticleId) {
        return this.getSupplierArticles().filter(article => 
            article.neutral_article_id === neutralArticleId && 
            article.status === 'active'
        ).sort((a, b) => a.price - b.price); // Sortiert nach Preis
    }
    
    // Lieferantenvergleich
    static compareSuppliers(neutralArticleId) {
        const alternatives = this.findAlternativeSupplierArticles(neutralArticleId);
        
        return alternatives.map(article => ({
            supplier_name: this.getSupplier(article.supplier_id).name,
            article_number: article.article_number,
            price: article.price,
            unit: article.unit,
            quality_score: this.calculateQualityScore(article),
            delivery_time: article.lead_time_days,
            sustainability_score: this.calculateSustainabilityScore(article)
        }));
    }
    
    // Qualitätsbewertung
    static calculateQualityScore(article) {
        let score = 0;
        if (article.organic) score += 30;
        if (article.regional) score += 20;
        if (article.fairtrade) score += 15;
        if (article.quality_grade === 'A') score += 35;
        else if (article.quality_grade === 'B') score += 20;
        else score += 10;
        return score;
    }
    
    // Nachhaltigkeitsbewertung
    static calculateSustainabilityScore(article) {
        let score = 0;
        if (article.organic) score += 40;
        if (article.regional) score += 35;
        if (article.fairtrade) score += 25;
        return score;
    }
}

module.exports = { ArticleSystem };