const { Client } = require('pg');
const readline = require('readline');
require('dotenv').config();

const DB_NAME = process.env.SUPABASE_DB_NAME || 'postgres';
const DB_USER = process.env.SUPABASE_AUTH_USER || 'postgres';
const DB_HOST = process.env.SUPABASE_URL_POOLER || 'localhost';
const DB_PORT = process.env.SUPABASE_DB_PORT || 5432;
const DB_PASSWORD = process.env.SUPABASE_DB_PASSWORD || ''; // Set in your .env or here

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('⚠️  WARNING: This will DELETE ALL Supabase Auth users and related data!');
rl.question('Are you sure you want to continue? (y/N): ', async (answer) => {
  rl.close();
  if (answer.toLowerCase() !== 'y') {
    console.log('Aborted.');
    process.exit(0);
  }
  // Debug logging
console.log('Database connection details:')
console.log('Host:', DB_HOST)
console.log('Database:', DB_NAME)
console.log('User:', DB_USER)
console.log('Password length:', DB_PASSWORD.length)
console.log('SSL:', { rejectUnauthorized: false })
  const client = new Client({
    user: DB_USER,
    host: DB_HOST,
    database: DB_NAME,
    password: DB_PASSWORD,
    port: DB_PORT,
  });

  try {
    await client.connect();
    await client.query(`
      TRUNCATE TABLE
        auth.refresh_tokens,
        auth.sessions,
        auth.identities,
        auth.mfa_amr_claims,
        auth.mfa_challenges,
        auth.mfa_factors,
        auth.audit_log_entries,
        auth.instances,
        auth.flow_state,
        auth.sso_providers,
        auth.users
      RESTART IDENTITY CASCADE;
    `);
    console.log('✅ All Supabase Auth tables have been cleared.');
  } catch (err) {
    console.error('❌ Error clearing auth tables:', err);
  } finally {
    await client.end();
  }
});