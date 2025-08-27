# FoodSuite Production Deployment Guide

## Overview
This guide covers deploying FoodSuite as a production-ready SaaS application with proper staging, monitoring, backups, and rollback capabilities.

## Environment Setup

### 1. Staging Environment
- **URL**: `foodsuite-staging.onrender.com`
- **Purpose**: Test deployments before production
- **Database**: PostgreSQL (shared with dev data)
- **Configuration**: `render-staging.yaml`

### 2. Production Environment  
- **URL**: `foodsuite-pro.onrender.com`
- **Purpose**: Live customer environment
- **Database**: PostgreSQL (dedicated production instance)
- **Configuration**: `render-production.yaml`

## Deployment Process

### Safe Deployment Pipeline
```bash
# 1. Deploy to staging first
git push origin staging

# 2. Test staging thoroughly
curl https://foodsuite-staging.onrender.com/api/health

# 3. Deploy to production (after staging tests pass)
git push origin main

# 4. Monitor production health
curl https://foodsuite-pro.onrender.com/api/health/deep
```

### Automatic Rollback
The system automatically rolls back if:
- Health checks fail after deployment
- Error rate exceeds threshold (20 errors/5min)
- Critical API endpoints return 5xx errors
- Database connectivity fails

## Database Migration

### Production PostgreSQL Setup
```bash
# 1. Create production database
psql -h your-postgres-host -U admin -d postgres -f database/production-setup.sql

# 2. Migrate from memory to PostgreSQL
DB_TYPE=postgres node scripts/migrate-to-postgres.js

# 3. Verify data integrity
DB_TYPE=postgres node scripts/verify-migration.js
```

## Monitoring & Alerting

### Health Endpoints
- `/api/health` - Basic health check (200/503)
- `/api/health/metrics` - System metrics (memory, uptime, errors)
- `/api/health/deep` - Full dependency health check

### Error Monitoring
- All errors logged to `system_health` table
- Automatic alerting when error rate spikes
- Stack traces logged (dev) vs sanitized (prod)

### Performance Metrics
- Response time monitoring
- Memory usage alerts
- Database connection monitoring
- API endpoint availability

## Backup Strategy

### Automatic Backups
- **Frequency**: Every 6 hours
- **Retention**: 7 days
- **Type**: Full database export (JSON)
- **Location**: `./backups/` directory

### Manual Backups
```bash
# Create full backup
curl -X POST https://foodsuite-pro.onrender.com/api/health/backup

# Create tenant-specific backup  
curl -X POST https://foodsuite-pro.onrender.com/api/health/backup -d '{"tenant_id": "demo"}'

# List available backups
curl https://foodsuite-pro.onrender.com/api/health/backups
```

### Disaster Recovery
```bash
# Restore from backup
node scripts/restore-backup.js backup-full-2025-08-27.json

# Restore specific tenant
node scripts/restore-backup.js backup-tenant-demo-2025-08-27.json demo
```

## Feature Flags

### Default Production Flags
- `advanced_analytics`: 0% rollout (Phase 2)
- `pdf_generation`: 0% rollout (Phase 2)  
- `price_monitoring_alerts`: 50% rollout (Testing)
- `automated_ordering`: 0% rollout (Phase 2)
- `real_time_collaboration`: 100% rollout (Stable)

### Managing Feature Flags
```javascript
// Enable feature for specific tenant
await featureFlags.setFlag('pdf_generation', 'enterprise_tenant', {
    enabled: true,
    rollout: 100
});

// Gradual rollout
await featureFlags.setFlag('advanced_analytics', 'demo', {
    enabled: true,
    rollout: 25 // 25% of users
});
```

## Production Checklist

### Before Deployment
- [ ] All tests pass locally
- [ ] Staging deployment successful
- [ ] Health checks pass on staging
- [ ] Backup created
- [ ] Feature flags configured
- [ ] Database migration tested

### After Deployment
- [ ] Health checks pass (5 minutes)
- [ ] Error rate normal (< 5 errors/minute)
- [ ] Key user journeys work
- [ ] Database queries respond quickly
- [ ] Backup system functional

### Emergency Procedures

#### Immediate Rollback
```bash
# Automatic rollback via health system
curl -X POST https://foodsuite-pro.onrender.com/api/health/rollback

# Manual rollback to specific commit
git checkout [last_good_commit]
git push origin main --force
```

#### Service Recovery
```bash
# Restart application (triggers auto-recovery)
# Via Render dashboard: Manual Deploy → Restart

# Check service dependencies
curl https://foodsuite-pro.onrender.com/api/health/deep

# Verify database connectivity
DB_TYPE=postgres node scripts/test-db-connection.js
```

## Security Considerations

### Production Environment Variables
```env
NODE_ENV=production
DB_TYPE=postgres
POSTGRES_URL=postgresql://user:password@host:5432/database
BACKUP_DIR=/app/backups
JWT_SECRET=secure_random_secret_2025
RATE_LIMIT_MAX=1000
CORS_ORIGINS=https://foodsuite-pro.onrender.com
```

### Security Headers
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`  
- `Strict-Transport-Security: max-age=31536000`
- Rate limiting: 1000 requests/hour per IP

## Scaling Considerations

### Database Optimization
- Connection pooling (pg-pool)
- Query optimization with EXPLAIN
- Indexes on frequently queried columns
- Tenant data partitioning

### Application Scaling
- Horizontal scaling via Render
- CDN for static assets
- Database read replicas
- Caching layer (Redis)

## Disaster Recovery Plan

### RTO/RPO Goals
- **Recovery Time Objective**: 15 minutes
- **Recovery Point Objective**: 6 hours (backup frequency)

### Recovery Steps
1. Identify scope of outage
2. Check health monitoring dashboard
3. Attempt automatic recovery
4. Manual rollback if needed
5. Restore from backup as last resort
6. Post-incident review and improvements

## Support Contacts
- **Primary**: Development Team
- **Database**: Database Admin
- **Infrastructure**: DevOps Team  
- **Emergency**: 24/7 On-call Rotation