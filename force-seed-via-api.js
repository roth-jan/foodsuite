const http = require('http');

console.log('🚀 FORCE SEED VIA API');
console.log('====================\n');

const API_HOST = '18.195.206.72';
const API_PORT = 3005;

// Helper function for HTTP requests
function httpRequest(options, data = null) {
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    try {
                        resolve(JSON.parse(body));
                    } catch {
                        resolve(body);
                    }
                } else {
                    reject(new Error(`HTTP ${res.statusCode}: ${body}`));
                }
            });
        });
        
        req.on('error', reject);
        req.setTimeout(10000);
        
        if (data) {
            req.write(JSON.stringify(data));
        }
        req.end();
    });
}

async function seedDatabase() {
    try {
        // 1. Check API health
        console.log('📡 Checking API...');
        const health = await httpRequest({
            hostname: API_HOST,
            port: API_PORT,
            path: '/api/health',
            method: 'GET'
        });
        console.log('✅ API is healthy:', health.status);

        // 2. Try to create admin user directly
        console.log('\n👤 Creating admin user...');
        try {
            await httpRequest({
                hostname: API_HOST,
                port: API_PORT,
                path: '/api/users/admin-init',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-tenant-id': '1'
                }
            }, {
                username: 'admin',
                password: 'Demo123!',
                email: 'admin@foodsuite.com'
            });
            console.log('✅ Admin user created');
        } catch (err) {
            console.log('⚠️  Admin creation failed:', err.message);
        }

        // 3. Login
        console.log('\n🔐 Attempting login...');
        let token = null;
        try {
            const loginResponse = await httpRequest({
                hostname: API_HOST,
                port: API_PORT,
                path: '/api/auth/login',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-tenant-id': '1'
                }
            }, {
                username: 'admin',
                password: 'Demo123!'
            });
            
            token = loginResponse.token;
            console.log('✅ Login successful!');
        } catch (err) {
            console.log('❌ Login failed:', err.message);
            console.log('\n⚠️  Database appears to be empty!');
            console.log('You need to seed it directly on EC2.');
            return;
        }

        if (!token) {
            console.log('\n❌ No token received - cannot continue');
            return;
        }

        // 4. Create test data
        console.log('\n📦 Creating test data...');
        
        // Create a supplier
        try {
            await httpRequest({
                hostname: API_HOST,
                port: API_PORT,
                path: '/api/suppliers',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                    'x-tenant-id': '1'
                }
            }, {
                name: 'Test Supplier',
                type: 'Großhandel',
                email: 'test@supplier.com'
            });
            console.log('✅ Test supplier created');
        } catch (err) {
            console.log('⚠️  Supplier creation failed:', err.message);
        }

        // Check current data
        console.log('\n📊 Checking current data...');
        const products = await httpRequest({
            hostname: API_HOST,
            port: API_PORT,
            path: '/api/products',
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'x-tenant-id': '1'
            }
        });
        
        console.log(`   Products: ${products.items?.length || 0}`);
        
        const recipes = await httpRequest({
            hostname: API_HOST,
            port: API_PORT,
            path: '/api/recipes',
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'x-tenant-id': '1'
            }
        });
        
        console.log(`   Recipes: ${recipes.items?.length || 0}`);
        
        console.log('\n' + '='.repeat(50));
        console.log('✅ API CHECK COMPLETE');
        console.log('='.repeat(50));
        console.log(`🔗 URL: http://${API_HOST}:${API_PORT}`);
        console.log('👤 Login: admin / Demo123!');
        
        if (products.items?.length === 0 && recipes.items?.length === 0) {
            console.log('\n⚠️  DATABASE IS EMPTY!');
            console.log('You need to run the seed script on EC2.');
        }
        
    } catch (error) {
        console.error('\n❌ ERROR:', error.message);
    }
}

seedDatabase();