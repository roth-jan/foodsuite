-- FoodSuite Production Database Schema
-- Run this on PostgreSQL for production setup

-- Create database and user
CREATE DATABASE foodsuite_production;
CREATE USER foodsuite_admin WITH PASSWORD 'secure_production_password_2025';
GRANT ALL PRIVILEGES ON DATABASE foodsuite_production TO foodsuite_admin;

-- Connect to the database
\c foodsuite_production;

-- Grant schema permissions
GRANT ALL ON SCHEMA public TO foodsuite_admin;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO foodsuite_admin;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO foodsuite_admin;

-- Core tables for multi-tenant SaaS
CREATE TABLE tenants (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    plan VARCHAR(50) DEFAULT 'starter',
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User management with roles
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
    username VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'user',
    status VARCHAR(20) DEFAULT 'active',
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Article system (NEW - replaces products)
CREATE TABLE neutral_articles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    unit VARCHAR(50),
    estimated_price_min DECIMAL(10,2),
    estimated_price_max DECIMAL(10,2),
    common_allergens TEXT[],
    nutritional_info JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE supplier_articles (
    id SERIAL PRIMARY KEY,
    neutral_article_id INTEGER REFERENCES neutral_articles(id),
    supplier_id INTEGER,
    article_number VARCHAR(100),
    name VARCHAR(255) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    unit VARCHAR(50),
    pack_size VARCHAR(50),
    availability VARCHAR(20) DEFAULT 'available',
    allergens TEXT[],
    nutritional_info JSONB,
    last_price_update TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Suppliers with rating system
CREATE TABLE suppliers (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    rating DECIMAL(3,2) DEFAULT 0.00,
    delivery_days INTEGER[] DEFAULT '{1,2,3,4,5}',
    minimum_order_value DECIMAL(10,2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Products (Legacy - being phased out)
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    unit VARCHAR(50),
    price DECIMAL(10,2),
    stock INTEGER DEFAULT 0,
    min_stock INTEGER DEFAULT 0,
    max_stock INTEGER,
    consumption_rate_per_day DECIMAL(10,2),
    supplier_id INTEGER REFERENCES suppliers(id),
    article_number VARCHAR(100),
    storage_location VARCHAR(100),
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Recipes with article system
CREATE TABLE recipes (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    portions INTEGER DEFAULT 1,
    prep_time INTEGER,
    difficulty VARCHAR(50),
    calories_per_portion INTEGER,
    cost_per_portion DECIMAL(10,2),
    instructions TEXT,
    tags TEXT[],
    allergens TEXT[],
    dietary_flags TEXT[],
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Recipe ingredients (NEW system)
CREATE TABLE recipe_ingredients_new (
    id SERIAL PRIMARY KEY,
    recipe_id INTEGER REFERENCES recipes(id) ON DELETE CASCADE,
    supplier_article_id INTEGER REFERENCES supplier_articles(id),
    neutral_article_id INTEGER REFERENCES neutral_articles(id),
    quantity DECIMAL(10,3) NOT NULL,
    unit VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Orders with workflow states
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
    order_number VARCHAR(100) UNIQUE NOT NULL,
    supplier_id INTEGER REFERENCES suppliers(id),
    status VARCHAR(50) DEFAULT 'pending',
    total_items INTEGER DEFAULT 0,
    total_value DECIMAL(10,2) DEFAULT 0,
    delivery_date DATE,
    notes TEXT,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Goods receipts (Warehouse receiving)
CREATE TABLE goods_receipts (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
    receipt_number VARCHAR(100) UNIQUE NOT NULL,
    supplier_id INTEGER REFERENCES suppliers(id),
    order_id INTEGER REFERENCES orders(id),
    date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    total_items INTEGER DEFAULT 0,
    total_value DECIMAL(10,2) DEFAULT 0,
    status VARCHAR(50) DEFAULT 'pending',
    status_text VARCHAR(100),
    notes TEXT,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Inventory tracking with transactions
CREATE TABLE inventory_transactions (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id),
    transaction_type VARCHAR(50) NOT NULL, -- 'in', 'out', 'adjustment'
    quantity DECIMAL(10,3) NOT NULL,
    unit_cost DECIMAL(10,2),
    reference_type VARCHAR(50), -- 'order', 'recipe', 'manual'
    reference_id INTEGER,
    notes TEXT,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Audit logging for compliance
CREATE TABLE audit_log (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id INTEGER,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- System health monitoring
CREATE TABLE system_health (
    id SERIAL PRIMARY KEY,
    service_name VARCHAR(100) NOT NULL,
    status VARCHAR(20) NOT NULL, -- 'healthy', 'degraded', 'down'
    response_time_ms INTEGER,
    error_count INTEGER DEFAULT 0,
    last_error TEXT,
    environment VARCHAR(50),
    checked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Feature flags for safe deployments
CREATE TABLE feature_flags (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
    flag_name VARCHAR(100) NOT NULL,
    is_enabled BOOLEAN DEFAULT FALSE,
    rollout_percentage INTEGER DEFAULT 0,
    conditions JSONB,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tenant_id, flag_name)
);

-- Backup metadata tracking
CREATE TABLE backup_metadata (
    id SERIAL PRIMARY KEY,
    backup_type VARCHAR(50) NOT NULL, -- 'full', 'incremental'
    file_path TEXT,
    size_bytes BIGINT,
    status VARCHAR(20) DEFAULT 'completed',
    tenant_id INTEGER REFERENCES tenants(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    verified_at TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_users_tenant_id ON users(tenant_id);
CREATE INDEX idx_products_tenant_id ON products(tenant_id);
CREATE INDEX idx_recipes_tenant_id ON recipes(tenant_id);
CREATE INDEX idx_orders_tenant_id ON orders(tenant_id);
CREATE INDEX idx_goods_receipts_tenant_id ON goods_receipts(tenant_id);
CREATE INDEX idx_inventory_transactions_tenant_id ON inventory_transactions(tenant_id);
CREATE INDEX idx_audit_log_tenant_user ON audit_log(tenant_id, user_id);
CREATE INDEX idx_system_health_service_time ON system_health(service_name, checked_at);
CREATE INDEX idx_feature_flags_tenant_flag ON feature_flags(tenant_id, flag_name);

-- Insert default tenant
INSERT INTO tenants (name, slug, plan, status) VALUES 
('Demo Restaurant', 'demo', 'enterprise', 'active');

-- Insert default admin user
INSERT INTO users (tenant_id, username, email, password_hash, role) VALUES 
(1, 'admin', 'admin@demo-restaurant.com', '$2b$10$rQ7qJ8qY9Z8qY9Z8qY9Z8O', 'admin');

COMMIT;