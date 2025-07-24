// Ensure we use memory database
process.env.DB_TYPE = 'memory';

console.log('🚀 Starting server with memory database...');
console.log('DB_TYPE:', process.env.DB_TYPE);

// Start the server
require('./server.js');