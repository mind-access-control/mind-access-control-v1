const { Client } = require('pg');
require('dotenv').config();

async function testConnection() {
    const config = {
        host: 'aws-0-us-east-2.pooler.supabase.com',
        port: 5432,
        database: 'postgres',
        user: 'postgres.qadqvssrgduxzklxolsn',
        password: process.env.SUPABASE_DB_PASSWORD,
        ssl: {
            rejectUnauthorized: false // Allow self-signed certificates
        }
    };

    console.log('Connection details:');
    console.log('Host:', config.host);
    console.log('Port:', config.port);
    console.log('Database:', config.database);
    console.log('User:', config.user);
    console.log('Password length:', config.password ? config.password.length : 0);
    console.log('SSL enabled:', !!config.ssl);

    const client = new Client(config);

    try {
        console.log('\nAttempting to connect to database...');
        await client.connect();
        const result = await client.query('SELECT version();');
        console.log('✅ Connection successful!');
        console.log('Database version:', result.rows[0].version);
    } catch (error) {
        console.error('\n❌ Connection failed!');
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        
        console.log('\nTroubleshooting steps:');
        console.log('1. Verify your Supabase project is active');
        console.log('2. Check if your IP is allowed in Supabase dashboard:');
        console.log('   - Go to Project Settings > Database');
        console.log('   - Look for "Connection Pooling" or "Database Password" section');
        console.log('   - Add your current IP address');
        console.log('3. Verify the database is not in maintenance mode');
        console.log('4. Check if your network allows outbound connections to port 5432');
        console.log('5. Make sure SUPABASE_DB_PASSWORD is set in your .env file');
    } finally {
        await client.end();
    }
}

testConnection(); 