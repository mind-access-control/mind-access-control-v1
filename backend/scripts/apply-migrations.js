const { Client } = require('pg');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

async function applyMigrations() {
    const config = {
        host: process.env.SUPABASE_URL_POOLER,
        port: process.env.SUPABASE_DB_PORT,
        database: process.env.SUPABASE_DB_NAME,
        user: process.env.SUPABASE_DB_USER,
        password: process.env.SUPABASE_DB_PASSWORD,
        ssl: {
            rejectUnauthorized: false
        }
    };

    const client = new Client(config);

    try {
        console.log('Connecting to database...');
        await client.connect();
        console.log('✅ Connected successfully');

        // Create migrations table if it doesn't exist
        await client.query(`
            CREATE TABLE IF NOT EXISTS flyway_schema_history (
                installed_rank INTEGER PRIMARY KEY,
                version VARCHAR(50),
                description VARCHAR(200),
                type VARCHAR(20),
                script VARCHAR(1000),
                checksum INTEGER,
                installed_by VARCHAR(100),
                installed_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                execution_time INTEGER,
                success BOOLEAN
            );
        `);

        // Get all migration files
        const migrationsDir = path.join(__dirname, '..', 'supabase', 'migrations');
        const files = await fs.readdir(migrationsDir);
        const migrationFiles = files
            .filter(f => f.endsWith('.sql'))
            .sort();

        console.log('\nFound migration files:');
        migrationFiles.forEach(f => console.log(`- ${f}`));

        // Get already applied migrations
        const { rows: appliedMigrations } = await client.query(
            'SELECT version FROM flyway_schema_history WHERE success = true'
        );
        const appliedVersions = new Set(appliedMigrations.map(m => m.version));

        // Apply new migrations
        for (const file of migrationFiles) {
            const version = file.split('__')[0];
            
            if (appliedVersions.has(version)) {
                console.log(`\nSkipping ${file} (already applied)`);
                continue;
            }

            console.log(`\nApplying migration: ${file}`);
            const filePath = path.join(migrationsDir, file);
            const sql = await fs.readFile(filePath, 'utf8');

            try {
                await client.query('BEGIN');
                await client.query(sql);
                
                // Record the migration
                await client.query(
                    `INSERT INTO flyway_schema_history 
                    (installed_rank, version, description, type, script, checksum, installed_by, success)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, true)`,
                    [
                        appliedVersions.size + 1,
                        version,
                        file.split('__')[1]?.replace('.sql', '') || '',
                        'SQL',
                        file,
                        0, // Simple checksum
                        'migration-script'
                    ]
                );
                
                await client.query('COMMIT');
                console.log(`✅ Successfully applied ${file}`);
            } catch (error) {
                await client.query('ROLLBACK');
                console.error(`❌ Failed to apply ${file}:`, error.message);
                throw error;
            }
        }

        console.log('\n✅ All migrations completed successfully!');

    } catch (error) {
        console.error('\n❌ Migration failed:', error.message);
        process.exit(1);
    } finally {
        await client.end();
    }
}

applyMigrations(); 