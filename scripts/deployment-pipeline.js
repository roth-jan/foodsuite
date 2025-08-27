// Production deployment pipeline with automatic rollback
const { execSync } = require('child_process');
const fs = require('fs').promises;

class DeploymentPipeline {
    constructor() {
        this.environments = {
            staging: {
                url: 'https://foodsuite-staging.onrender.com',
                healthCheck: 'https://foodsuite-staging.onrender.com/api/health',
                branch: 'staging'
            },
            production: {
                url: 'https://foodsuite-pro.onrender.com', 
                healthCheck: 'https://foodsuite-pro.onrender.com/api/health',
                branch: 'main'
            }
        };
        
        this.healthCheckTimeout = 30000; // 30 seconds
        this.maxRetries = 5;
    }

    // Deploy to staging first, then production
    async deployWithSafetyChecks(targetEnv = 'production') {
        console.log(`🚀 Starting safe deployment to ${targetEnv}...`);
        
        try {
            // Step 1: Backup current state
            const backupResult = await this.createPreDeployBackup(targetEnv);
            if (!backupResult.success) {
                throw new Error(`Backup failed: ${backupResult.error}`);
            }

            // Step 2: Deploy to staging first (if deploying to production)
            if (targetEnv === 'production') {
                console.log('🧪 Testing deployment on staging first...');
                await this.deployToStaging();
                
                // Wait for staging to be healthy
                const stagingHealth = await this.waitForHealthy('staging', 60000);
                if (!stagingHealth) {
                    throw new Error('Staging deployment failed health checks');
                }
                
                // Run automated tests on staging
                const testsPass = await this.runSmokeTests('staging');
                if (!testsPass) {
                    throw new Error('Staging tests failed');
                }
                
                console.log('✅ Staging deployment and tests successful');
            }

            // Step 3: Deploy to target environment
            await this.deployToEnvironment(targetEnv);
            
            // Step 4: Health check with automatic rollback
            const isHealthy = await this.waitForHealthy(targetEnv, this.healthCheckTimeout);
            
            if (!isHealthy) {
                console.log('❌ Health check failed - initiating automatic rollback');
                await this.rollback(targetEnv, backupResult.commit);
                throw new Error('Deployment failed health checks - rolled back');
            }

            // Step 5: Run production smoke tests
            const productionTests = await this.runSmokeTests(targetEnv);
            if (!productionTests) {
                console.log('❌ Production tests failed - initiating rollback');
                await this.rollback(targetEnv, backupResult.commit);
                throw new Error('Production tests failed - rolled back');
            }

            console.log(`✅ Safe deployment to ${targetEnv} completed successfully`);
            return { success: true, environment: targetEnv };

        } catch (error) {
            console.error(`❌ Deployment failed: ${error.message}`);
            return { success: false, error: error.message };
        }
    }

    async createPreDeployBackup(environment) {
        try {
            const currentCommit = execSync('git rev-parse HEAD').toString().trim();
            const timestamp = new Date().toISOString();
            
            // Create backup metadata
            const backup = {
                commit: currentCommit,
                timestamp,
                environment,
                branch: this.environments[environment].branch
            };

            await fs.writeFile(
                `./backups/pre-deploy-${environment}-${timestamp}.json`,
                JSON.stringify(backup, null, 2)
            );

            console.log(`📦 Pre-deployment backup created for ${environment}`);
            return { success: true, commit: currentCommit, backup };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async deployToStaging() {
        console.log('🧪 Deploying to staging environment...');
        
        try {
            // Push to staging branch
            execSync('git checkout -B staging');
            execSync('git push origin staging --force');
            
            console.log('✅ Staging deployment triggered');
            return true;
        } catch (error) {
            console.error('❌ Staging deployment failed:', error);
            return false;
        }
    }

    async deployToEnvironment(environment) {
        console.log(`🚀 Deploying to ${environment}...`);
        
        try {
            const targetBranch = this.environments[environment].branch;
            
            if (environment === 'production') {
                // Deploy to main branch for production
                execSync('git checkout main');
                execSync('git push origin main');
            }
            
            console.log(`✅ ${environment} deployment triggered`);
            return true;
        } catch (error) {
            console.error(`❌ ${environment} deployment failed:`, error);
            return false;
        }
    }

    async waitForHealthy(environment, timeout = 30000) {
        const env = this.environments[environment];
        const startTime = Date.now();
        let attempt = 0;

        console.log(`🔍 Waiting for ${environment} to be healthy...`);

        while (Date.now() - startTime < timeout) {
            attempt++;
            
            try {
                const response = await fetch(env.healthCheck, {
                    timeout: 10000,
                    headers: { 'User-Agent': 'FoodSuite-Deploy-Bot/1.0' }
                });
                
                if (response.ok) {
                    const health = await response.json();
                    
                    if (health.status === 'healthy') {
                        console.log(`✅ ${environment} is healthy (attempt ${attempt})`);
                        return true;
                    } else {
                        console.log(`⚠️  ${environment} status: ${health.status} (attempt ${attempt})`);
                    }
                } else {
                    console.log(`❌ ${environment} health check HTTP ${response.status} (attempt ${attempt})`);
                }
            } catch (error) {
                console.log(`❌ ${environment} health check failed (attempt ${attempt}): ${error.message}`);
            }

            // Wait before retry
            await this.sleep(5000);
        }

        console.log(`❌ ${environment} failed to become healthy within ${timeout}ms`);
        return false;
    }

    async runSmokeTests(environment) {
        const env = this.environments[environment];
        console.log(`🧪 Running smoke tests on ${environment}...`);

        const tests = [
            { name: 'Homepage loads', path: '/' },
            { name: 'Health check', path: '/api/health' },
            { name: 'Products API', path: '/api/products?limit=1' },
            { name: 'Recipes API', path: '/api/recipes?limit=1' },
            { name: 'AI API health', path: '/api/ai/health' }
        ];

        let passedTests = 0;
        
        for (const test of tests) {
            try {
                const response = await fetch(`${env.url}${test.path}`, {
                    timeout: 10000,
                    headers: { 
                        'x-tenant-id': 'demo',
                        'User-Agent': 'FoodSuite-SmokeTest/1.0'
                    }
                });
                
                if (response.ok) {
                    console.log(`✅ ${test.name}: PASS`);
                    passedTests++;
                } else {
                    console.log(`❌ ${test.name}: FAIL (HTTP ${response.status})`);
                }
            } catch (error) {
                console.log(`❌ ${test.name}: ERROR (${error.message})`);
            }
        }

        const successRate = passedTests / tests.length;
        console.log(`🧪 Smoke tests: ${passedTests}/${tests.length} passed (${Math.round(successRate * 100)}%)`);
        
        return successRate >= 0.8; // 80% pass rate required
    }

    async rollback(environment, targetCommit) {
        console.log(`⏪ Rolling back ${environment} to ${targetCommit}...`);
        
        try {
            // Create rollback branch
            execSync(`git checkout ${targetCommit}`);
            execSync(`git checkout -B rollback-${Date.now()}`);
            
            const targetBranch = this.environments[environment].branch;
            execSync(`git push origin rollback-${Date.now()}:${targetBranch} --force`);
            
            // Wait for rollback to be healthy
            const isHealthy = await this.waitForHealthy(environment, 60000);
            
            if (isHealthy) {
                console.log(`✅ ${environment} rollback successful`);
                return true;
            } else {
                console.log(`❌ ${environment} rollback failed - manual intervention required`);
                return false;
            }
        } catch (error) {
            console.error(`❌ Rollback failed: ${error.message}`);
            return false;
        }
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

module.exports = DeploymentPipeline;