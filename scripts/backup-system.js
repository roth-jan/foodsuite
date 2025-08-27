// Production backup and recovery system
const fs = require('fs').promises;
const path = require('path');

class BackupSystem {
    constructor(db) {
        this.db = db;
        this.backupDir = process.env.BACKUP_DIR || './backups';
    }

    async initialize() {
        try {
            await fs.mkdir(this.backupDir, { recursive: true });
            console.log(`📦 Backup system initialized: ${this.backupDir}`);
        } catch (error) {
            console.error('❌ Failed to initialize backup system:', error);
        }
    }

    // Create full database backup
    async createFullBackup(tenantId = null) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupName = tenantId ? 
            `backup-tenant-${tenantId}-${timestamp}` : 
            `backup-full-${timestamp}`;

        try {
            let data;
            
            if (this.db.data) {
                // Memory database backup
                data = tenantId ? 
                    this.filterDataByTenant(this.db.data, tenantId) : 
                    this.db.data;
            } else {
                // PostgreSQL backup
                data = await this.exportPostgreSQLData(tenantId);
            }

            const backupPath = path.join(this.backupDir, `${backupName}.json`);
            await fs.writeFile(backupPath, JSON.stringify(data, null, 2));

            const stats = await fs.stat(backupPath);
            
            console.log(`✅ Backup created: ${backupName}.json (${Math.round(stats.size / 1024)}KB)`);
            
            // Log backup metadata
            await this.logBackup({
                backup_type: 'full',
                file_path: backupPath,
                size_bytes: stats.size,
                tenant_id: tenantId,
                status: 'completed'
            });

            return {
                success: true,
                backup_file: `${backupName}.json`,
                size_kb: Math.round(stats.size / 1024),
                tenant_id: tenantId
            };
        } catch (error) {
            console.error('❌ Backup failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Restore from backup
    async restoreFromBackup(backupFile, tenantId = null) {
        try {
            const backupPath = path.join(this.backupDir, backupFile);
            const backupData = JSON.parse(await fs.readFile(backupPath, 'utf8'));

            if (this.db.data) {
                // Memory database restore
                if (tenantId) {
                    await this.restoreMemoryTenantData(backupData, tenantId);
                } else {
                    this.db.data = backupData;
                }
            } else {
                // PostgreSQL restore
                await this.restorePostgreSQLData(backupData, tenantId);
            }

            console.log(`✅ Restore completed from: ${backupFile}`);
            return { success: true, message: 'Restore completed successfully' };
        } catch (error) {
            console.error('❌ Restore failed:', error);
            return { success: false, error: error.message };
        }
    }

    // Automatic scheduled backups
    startAutomaticBackups() {
        const interval = process.env.BACKUP_INTERVAL_HOURS || 6;
        const intervalMs = interval * 60 * 60 * 1000;

        setInterval(async () => {
            console.log('📦 Starting scheduled backup...');
            const result = await this.createFullBackup();
            if (result.success) {
                console.log(`✅ Scheduled backup completed: ${result.backup_file}`);
            } else {
                console.error(`❌ Scheduled backup failed: ${result.error}`);
            }
        }, intervalMs);

        console.log(`🕐 Automatic backups scheduled every ${interval} hours`);
    }

    // List available backups
    async listBackups() {
        try {
            const files = await fs.readdir(this.backupDir);
            const backups = [];

            for (const file of files.filter(f => f.endsWith('.json'))) {
                const filePath = path.join(this.backupDir, file);
                const stats = await fs.stat(filePath);
                
                backups.push({
                    filename: file,
                    size_kb: Math.round(stats.size / 1024),
                    created: stats.birthtime,
                    age_hours: Math.round((Date.now() - stats.birthtime.getTime()) / (1000 * 60 * 60))
                });
            }

            return backups.sort((a, b) => b.created - a.created);
        } catch (error) {
            console.error('❌ Failed to list backups:', error);
            return [];
        }
    }

    // Clean old backups
    async cleanOldBackups(maxAge = 7) { // days
        try {
            const files = await fs.readdir(this.backupDir);
            const cutoffDate = Date.now() - (maxAge * 24 * 60 * 60 * 1000);
            let cleaned = 0;

            for (const file of files.filter(f => f.endsWith('.json'))) {
                const filePath = path.join(this.backupDir, file);
                const stats = await fs.stat(filePath);
                
                if (stats.birthtime.getTime() < cutoffDate) {
                    await fs.unlink(filePath);
                    cleaned++;
                }
            }

            console.log(`🗑️  Cleaned ${cleaned} old backup files (older than ${maxAge} days)`);
            return { cleaned, maxAge };
        } catch (error) {
            console.error('❌ Failed to clean old backups:', error);
            return { error: error.message };
        }
    }

    // Helper methods
    filterDataByTenant(data, tenantId) {
        const filtered = {};
        
        Object.keys(data).forEach(key => {
            if (Array.isArray(data[key])) {
                filtered[key] = data[key].filter(item => 
                    item.tenant_id === tenantId || 
                    item.tenant_id === 'demo' || 
                    item.tenant_id === 1
                );
            } else {
                filtered[key] = data[key];
            }
        });
        
        return filtered;
    }

    async exportPostgreSQLData(tenantId) {
        // Implementation for PostgreSQL export
        const tables = ['tenants', 'users', 'products', 'recipes', 'orders', 'suppliers'];
        const data = {};
        
        for (const table of tables) {
            const query = tenantId ? 
                `SELECT * FROM ${table} WHERE tenant_id = $1` : 
                `SELECT * FROM ${table}`;
            const params = tenantId ? [tenantId] : [];
            
            const result = await this.db.query(query, params);
            data[table] = result.rows;
        }
        
        return data;
    }

    async restoreMemoryTenantData(backupData, tenantId) {
        // Clear existing tenant data
        Object.keys(this.db.data).forEach(key => {
            if (Array.isArray(this.db.data[key])) {
                this.db.data[key] = this.db.data[key].filter(item =>
                    item.tenant_id !== tenantId
                );
            }
        });

        // Restore backup data
        Object.keys(backupData).forEach(key => {
            if (Array.isArray(backupData[key]) && Array.isArray(this.db.data[key])) {
                this.db.data[key] = this.db.data[key].concat(backupData[key]);
            }
        });
    }

    async restorePostgreSQLData(backupData, tenantId) {
        // Implementation for PostgreSQL restore
        const tables = Object.keys(backupData);
        
        for (const table of tables) {
            if (tenantId) {
                // Delete existing tenant data
                await this.db.query(`DELETE FROM ${table} WHERE tenant_id = $1`, [tenantId]);
            }
            
            // Insert backup data
            const rows = backupData[table];
            if (rows.length > 0) {
                const columns = Object.keys(rows[0]);
                const values = rows.map(row => columns.map(col => row[col]));
                
                // Build INSERT query
                const placeholders = values.map((_, i) => 
                    `(${columns.map((_, j) => `$${i * columns.length + j + 1}`).join(', ')})`
                ).join(', ');
                
                const query = `INSERT INTO ${table} (${columns.join(', ')}) VALUES ${placeholders}`;
                await this.db.query(query, values.flat());
            }
        }
    }

    async logBackup(metadata) {
        try {
            if (this.db.query) {
                await this.db.query(
                    'INSERT INTO backup_metadata (backup_type, file_path, size_bytes, tenant_id, status) VALUES ($1, $2, $3, $4, $5)',
                    [metadata.backup_type, metadata.file_path, metadata.size_bytes, metadata.tenant_id, metadata.status]
                );
            }
        } catch (error) {
            console.error('Failed to log backup metadata:', error);
        }
    }
}

module.exports = BackupSystem;