#!/usr/bin/env node

// FoodSuite Production CLI Tools
const { program } = require('commander');
const DeploymentPipeline = require('./deployment-pipeline');
const BackupSystem = require('./backup-system');

program
  .name('foodsuite-cli')
  .description('FoodSuite Production Management CLI')
  .version('1.0.0');

// Deployment commands
program
  .command('deploy')
  .description('Deploy to production with safety checks')
  .option('-e, --env <environment>', 'Target environment', 'production')
  .option('-f, --force', 'Skip safety checks (dangerous)')
  .action(async (options) => {
    const pipeline = new DeploymentPipeline();
    
    if (options.force) {
      console.log('⚠️  FORCE deployment - skipping safety checks!');
      // Direct deployment without checks
      await pipeline.deployToEnvironment(options.env);
    } else {
      // Safe deployment with checks
      const result = await pipeline.deployWithSafetyChecks(options.env);
      
      if (result.success) {
        console.log('✅ Safe deployment completed successfully');
        process.exit(0);
      } else {
        console.error('❌ Deployment failed:', result.error);
        process.exit(1);
      }
    }
  });

// Rollback commands
program
  .command('rollback')
  .description('Rollback to previous version')
  .requiredOption('-e, --env <environment>', 'Target environment')
  .option('-c, --commit <commit>', 'Specific commit to rollback to')
  .action(async (options) => {
    const pipeline = new DeploymentPipeline();
    
    const targetCommit = options.commit || await pipeline.getLastGoodCommit(options.env);
    const success = await pipeline.rollback(options.env, targetCommit);
    
    if (success) {
      console.log(`✅ Rollback to ${targetCommit} completed`);
      process.exit(0);
    } else {
      console.error('❌ Rollback failed - manual intervention required');
      process.exit(1);
    }
  });

// Health monitoring commands
program
  .command('health')
  .description('Check system health')
  .option('-e, --env <environment>', 'Environment to check', 'production')
  .option('-d, --deep', 'Run deep health checks')
  .action(async (options) => {
    const env = options.env === 'staging' ? 
      'https://foodsuite-staging.onrender.com' : 
      'https://foodsuite-pro.onrender.com';
    
    const endpoint = options.deep ? '/api/health/deep' : '/api/health';
    
    try {
      const response = await fetch(`${env}${endpoint}`);
      const health = await response.json();
      
      console.log(`🏥 Health Status for ${options.env}:`);
      console.log(JSON.stringify(health, null, 2));
      
      if (health.status === 'healthy') {
        process.exit(0);
      } else {
        console.log(`⚠️  System status: ${health.status}`);
        process.exit(1);
      }
    } catch (error) {
      console.error(`❌ Health check failed: ${error.message}`);
      process.exit(1);
    }
  });

// Backup management
program
  .command('backup')
  .description('Manage backups')
  .option('-c, --create', 'Create new backup')
  .option('-l, --list', 'List available backups')
  .option('-r, --restore <file>', 'Restore from backup file')
  .option('-t, --tenant <id>', 'Tenant-specific operation')
  .action(async (options) => {
    // This would need database connection
    console.log('📦 Backup operations require database connection');
    console.log('Use: DB_TYPE=postgres node scripts/backup-cli.js');
  });

// Feature flag management
program
  .command('feature')
  .description('Manage feature flags')
  .requiredOption('-f, --flag <name>', 'Feature flag name')
  .option('-e, --enable', 'Enable feature')
  .option('-d, --disable', 'Disable feature')
  .option('-r, --rollout <percentage>', 'Set rollout percentage')
  .option('-t, --tenant <id>', 'Tenant ID', 'demo')
  .action(async (options) => {
    console.log('🚩 Feature flag operations require database connection');
    console.log('Use: DB_TYPE=postgres node scripts/feature-cli.js');
  });

// Monitoring commands
program
  .command('monitor')
  .description('Monitor production metrics')
  .option('-w, --watch', 'Watch mode (continuous monitoring)')
  .option('-i, --interval <seconds>', 'Check interval', '30')
  .action(async (options) => {
    const env = 'https://foodsuite-pro.onrender.com';
    
    const checkHealth = async () => {
      try {
        const response = await fetch(`${env}/api/health/metrics`);
        const metrics = await response.json();
        
        console.clear();
        console.log('📊 FoodSuite Production Metrics');
        console.log('================================');
        console.log(`🕐 Uptime: ${Math.floor(metrics.uptime_seconds / 3600)}h ${Math.floor((metrics.uptime_seconds % 3600) / 60)}m`);
        console.log(`💾 Memory: ${metrics.memory_usage_mb}MB`);
        console.log(`❌ Errors: ${metrics.error_count}`);
        console.log(`🌍 Environment: ${metrics.environment}`);
        console.log(`📱 Node: ${metrics.node_version}`);
        console.log(`⏰ Last check: ${new Date().toLocaleTimeString()}`);
        
      } catch (error) {
        console.error(`❌ Monitoring failed: ${error.message}`);
      }
    };
    
    if (options.watch) {
      const interval = parseInt(options.interval) * 1000;
      console.log(`👁️  Monitoring every ${options.interval} seconds (Ctrl+C to stop)...`);
      
      await checkHealth();
      setInterval(checkHealth, interval);
    } else {
      await checkHealth();
    }
  });

// Emergency commands
program
  .command('emergency')
  .description('Emergency recovery procedures')
  .option('--status', 'Check emergency status')
  .option('--restart', 'Emergency restart')
  .option('--maintenance', 'Enable maintenance mode')
  .action(async (options) => {
    if (options.status) {
      console.log('🚨 Emergency Status Check');
      // Check all critical systems
    }
    
    if (options.restart) {
      console.log('🔄 Emergency Restart (requires manual Render intervention)');
    }
    
    if (options.maintenance) {
      console.log('🚧 Maintenance Mode (requires feature flag deployment)');
    }
  });

program.parse();

// Helper function to check if we have the required dependencies
async function checkDependencies() {
  try {
    require('commander');
    return true;
  } catch (error) {
    console.error('❌ Missing dependencies. Run: npm install commander');
    return false;
  }
}

module.exports = program;