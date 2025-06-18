import { Pool } from 'pg'
import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'
import { prompt } from 'prompt-sync'

// Load environment variables
dotenv.config()

// Check for required environment variables
if (!process.env.SUPABASE_URL_POOLER || !process.env.SUPABASE_DB_PASSWORD) {
  throw new Error('Missing required environment variables: SUPABASE_URL_POOLER and SUPABASE_DB_PASSWORD')
}

// Extract connection details from the pooler URL
const host = process.env.SUPABASE_URL_POOLER
const password = process.env.SUPABASE_DB_PASSWORD
const dbName = process.env.SUPABASE_DB_NAME
const dbUser = process.env.SUPABASE_DB_USER
//const dbPort = process.env.SUPABASE_DB_PORT


// Create PostgreSQL connection pool
const pool = new Pool({
  host,
  port: 6543,
  database: dbName,
  user: dbUser,
  password,
  ssl: {
    rejectUnauthorized: false
  },
  max: 20, // Maximum number of clients in the pool
  min: 4,  // Minimum number of clients in the pool
  idleTimeoutMillis: 30000, // How long a client is allowed to remain idle before being closed
  connectionTimeoutMillis: 2000, // How long to wait for a connection
  keepAlive: true, // Enable keep-alive
})

// Debug logging
console.log('Database connection details:')
console.log('Host:', host)
console.log('Database:', dbName)
console.log('User:', dbUser)
console.log('Password length:', password.length)
console.log('SSL:', { rejectUnauthorized: false })

// Test the connection
const connectDB = async () => {
  try {
    const client = await pool.connect()
    console.log('Successfully connected to the database')
    return client
  } catch (error) {
    console.error('Error connecting to database:', error)
    throw error
  }
}

// Handle pool errors
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err)
  process.exit(-1)
})

export { pool, connectDB }

export async function closeDB() {
  try {
    await pool.end()
    console.log('Database connection closed')
  } catch (error) {
    console.error('Error closing database connection:', error)
    throw error
  }
}

// Handle process termination
process.on('SIGINT', async () => {
  await closeDB()
  process.exit(0)
})

process.on('SIGTERM', async () => {
  await closeDB()
  process.exit(0)
})

export default pool

export async function resetDatabase() {
  try {
    // Drop all tables
    const client = await connectDB()
    await client.query(`
      DO $$ 
      DECLARE
        r RECORD;
      BEGIN
        FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
          EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
        END LOOP;
      END $$;
    `)

    // Run all migrations
    await runMigrations()
    
    console.log('Database reset successful')
  } catch (error) {
    console.error('Error resetting database:', error)
    throw error
  }
}

export async function runMigrations() {
  const migrationsDir = path.join(__dirname, '..', '..', 'supabase', 'migrations')
  const migrationFiles = fs.readdirSync(migrationsDir)
    .filter(file => file.endsWith('.sql'))
    .sort()

  const client = await connectDB()

  for (const file of migrationFiles) {
    const migrationPath = path.join(migrationsDir, file)
    const sql = fs.readFileSync(migrationPath, 'utf8')
    
    try {
      await client.query(sql)
      console.log(`Migration ${file} applied successfully`)
    } catch (error) {
      console.error(`Error applying migration ${file}:`, error)
      throw error
    }
  }
}

// Initialize database connection
connectDB().catch(console.error)
