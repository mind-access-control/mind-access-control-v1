require('dotenv').config();
const { Client } = require('pg');
const readline = require('readline');

const DB_NAME = process.env.SUPABASE_DB_NAME || 'postgres';
const DB_USER = process.env.SUPABASE_DB_USER || 'postgres';
const DB_HOST = process.env.SUPABASE_URL_POOLER || 'localhost';
const DB_PORT = process.env.SUPABASE_DB_PORT || 5432;
const DB_PASSWORD = process.env.SUPABASE_DB_PASSWORD || ''; // Set in your .env or here

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('⚠️  WARNING: This will DROP ALL TABLES, VIEWS, and DATA in the public schema!');
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
    ssl: { rejectUnauthorized: false } // Needed for Supabase remote
  });

  try {
    await client.connect();

    // Drop all tables, views, sequences, and functions in public schema
    await client.query(`
      DO $$
      DECLARE
        obj RECORD;
      BEGIN
        -- Drop all views
        FOR obj IN (SELECT table_name FROM information_schema.views WHERE table_schema = 'public') LOOP
          EXECUTE 'DROP VIEW IF EXISTS public.' || quote_ident(obj.table_name) || ' CASCADE;';
        END LOOP;
        -- Drop all tables
        FOR obj IN (SELECT table_name FROM information_schema.tables WHERE table_schema = 'public') LOOP
          EXECUTE 'DROP TABLE IF EXISTS public.' || quote_ident(obj.table_name) || ' CASCADE;';
        END LOOP;
        -- Drop all sequences
        FOR obj IN (SELECT sequence_name FROM information_schema.sequences WHERE sequence_schema = 'public') LOOP
          EXECUTE 'DROP SEQUENCE IF EXISTS public.' || quote_ident(obj.sequence_name) || ' CASCADE;';
        END LOOP;
        -- Drop all functions
        FOR obj IN (
          SELECT routine_name
          FROM information_schema.routines
          WHERE routine_schema = 'public'
        ) LOOP
          EXECUTE 'DROP FUNCTION IF EXISTS public.' || quote_ident(obj.routine_name) || ' CASCADE;';
        END LOOP;
      END $$;
    `);

    console.log('✅ All objects in the public schema have been dropped.');
  } catch (err) {
    console.error('❌ Error cleaning public schema:', err);
  } finally {
    await client.end();
  }
});