// Production-grade feature flags for safe deployments
class FeatureFlags {
    constructor(db) {
        this.db = db;
        this.cache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    }

    // Check if feature is enabled for tenant/user
    async isEnabled(flagName, tenantId, userId = null) {
        try {
            const cacheKey = `${flagName}-${tenantId}`;
            const cached = this.cache.get(cacheKey);
            
            // Use cache if valid
            if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
                return this.evaluateFlag(cached.flag, tenantId, userId);
            }

            // Get from database
            let flag;
            if (this.db.query) {
                // PostgreSQL
                const result = await this.db.query(
                    'SELECT * FROM feature_flags WHERE flag_name = $1 AND (tenant_id = $2 OR tenant_id IS NULL) ORDER BY tenant_id DESC LIMIT 1',
                    [flagName, tenantId]
                );
                flag = result.rows[0];
            } else {
                // Memory database
                const flags = this.db.data.feature_flags || [];
                flag = flags.find(f => 
                    f.flag_name === flagName && 
                    (f.tenant_id === tenantId || f.tenant_id === 'global')
                );
            }

            // Cache the result
            this.cache.set(cacheKey, { flag, timestamp: Date.now() });

            return this.evaluateFlag(flag, tenantId, userId);
        } catch (error) {
            console.error(`❌ Feature flag error for ${flagName}:`, error);
            return false; // Fail closed for safety
        }
    }

    evaluateFlag(flag, tenantId, userId) {
        if (!flag) return false;
        if (!flag.is_enabled) return false;

        // Simple rollout percentage
        if (flag.rollout_percentage < 100) {
            const hash = this.hashTenantUser(tenantId, userId);
            return hash < flag.rollout_percentage;
        }

        // Advanced conditions (if specified)
        if (flag.conditions) {
            return this.evaluateConditions(flag.conditions, tenantId, userId);
        }

        return true;
    }

    evaluateConditions(conditions, tenantId, userId) {
        try {
            // Example conditions:
            // { "tenant_plan": "enterprise", "user_role": "admin" }
            // { "business_hours": true, "region": "europe" }
            
            if (conditions.tenant_plan) {
                // Check tenant plan (would need tenant data)
                // For now, assume all demo tenants are 'enterprise'
                if (tenantId === 'demo' && conditions.tenant_plan !== 'enterprise') {
                    return false;
                }
            }

            if (conditions.business_hours) {
                const hour = new Date().getHours();
                const isBusinessHours = hour >= 8 && hour <= 18;
                if (conditions.business_hours && !isBusinessHours) {
                    return false;
                }
            }

            return true;
        } catch (error) {
            console.error('Error evaluating flag conditions:', error);
            return false;
        }
    }

    hashTenantUser(tenantId, userId) {
        // Simple hash for consistent rollout
        const str = `${tenantId}-${userId || 'anonymous'}`;
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return Math.abs(hash) % 100;
    }

    // Create or update feature flag
    async setFlag(flagName, tenantId, options = {}) {
        const flag = {
            flag_name: flagName,
            tenant_id: tenantId,
            is_enabled: options.enabled !== undefined ? options.enabled : true,
            rollout_percentage: options.rollout || 100,
            conditions: options.conditions || null,
            description: options.description || `Feature flag: ${flagName}`,
            updated_at: new Date().toISOString()
        };

        try {
            if (this.db.query) {
                // PostgreSQL
                await this.db.query(`
                    INSERT INTO feature_flags (flag_name, tenant_id, is_enabled, rollout_percentage, conditions, description)
                    VALUES ($1, $2, $3, $4, $5, $6)
                    ON CONFLICT (tenant_id, flag_name) 
                    DO UPDATE SET 
                        is_enabled = EXCLUDED.is_enabled,
                        rollout_percentage = EXCLUDED.rollout_percentage,
                        conditions = EXCLUDED.conditions,
                        updated_at = CURRENT_TIMESTAMP
                `, [flag.flag_name, flag.tenant_id, flag.is_enabled, flag.rollout_percentage, flag.conditions, flag.description]);
            } else {
                // Memory database
                if (!this.db.data.feature_flags) {
                    this.db.data.feature_flags = [];
                }
                
                const existingIndex = this.db.data.feature_flags.findIndex(f => 
                    f.flag_name === flagName && f.tenant_id === tenantId
                );
                
                if (existingIndex >= 0) {
                    this.db.data.feature_flags[existingIndex] = { ...this.db.data.feature_flags[existingIndex], ...flag };
                } else {
                    flag.id = Date.now();
                    flag.created_at = new Date().toISOString();
                    this.db.data.feature_flags.push(flag);
                }
            }

            // Clear cache
            this.cache.delete(`${flagName}-${tenantId}`);
            
            console.log(`🚩 Feature flag set: ${flagName} = ${flag.is_enabled} (${flag.rollout_percentage}%)`);
            return { success: true, flag };
        } catch (error) {
            console.error(`❌ Failed to set feature flag ${flagName}:`, error);
            return { success: false, error: error.message };
        }
    }

    // Initialize default production flags
    async initializeDefaultFlags(tenantId = 'demo') {
        const defaultFlags = [
            {
                name: 'advanced_analytics',
                enabled: false,
                rollout: 0,
                description: 'Advanced analytics dashboard with AI insights'
            },
            {
                name: 'pdf_generation',
                enabled: false,
                rollout: 0,
                description: 'PDF invoice and report generation'
            },
            {
                name: 'real_time_collaboration',
                enabled: true,
                rollout: 100,
                description: 'Real-time collaborative meal planning'
            },
            {
                name: 'price_monitoring_alerts',
                enabled: true,
                rollout: 50,
                description: 'Automated price monitoring and alerts'
            },
            {
                name: 'automated_ordering',
                enabled: false,
                rollout: 0,
                description: 'Fully automated inventory ordering'
            },
            {
                name: 'multi_location_support',
                enabled: false,
                rollout: 25,
                description: 'Support for multiple restaurant locations'
            }
        ];

        console.log('🚩 Initializing default feature flags...');
        
        for (const flag of defaultFlags) {
            await this.setFlag(flag.name, tenantId, {
                enabled: flag.enabled,
                rollout: flag.rollout,
                description: flag.description
            });
        }

        console.log(`✅ ${defaultFlags.length} default feature flags initialized`);
    }

    // Middleware for Express routes
    middleware(flagName, fallbackResponse = null) {
        return async (req, res, next) => {
            try {
                const tenantId = req.tenantId || req.headers['x-tenant-id'] || 'demo';
                const userId = req.user?.id || null;
                
                const enabled = await this.isEnabled(flagName, tenantId, userId);
                
                if (!enabled) {
                    if (fallbackResponse) {
                        return res.json(fallbackResponse);
                    } else {
                        return res.status(404).json({
                            error: 'Feature not available',
                            feature: flagName,
                            message: 'This feature is not enabled for your account'
                        });
                    }
                }
                
                next();
            } catch (error) {
                console.error(`Feature flag middleware error for ${flagName}:`, error);
                next(); // Continue on error for safety
            }
        };
    }
}

module.exports = FeatureFlags;