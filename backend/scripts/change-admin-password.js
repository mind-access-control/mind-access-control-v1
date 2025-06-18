const { Client } = require('pg');
require('dotenv').config();

async function changeAdminPassword(newPassword) {
    if (!newPassword) {
        console.error('Please provide a new password');
        process.exit(1);
    }

    const config = {
        host: 'aws-0-us-east-2.pooler.supabase.com',
        port: 5432,
        database: 'postgres',
        user: 'postgres.qadqvssrgduxzklxolsn',
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

        // Update admin password
        const result = await client.query(
            `UPDATE auth.users 
             SET encrypted_password = crypt($1, gen_salt('bf'))
             WHERE email = 'admin@example.com'
             RETURNING id`,
            [newPassword]
        );

        if (result.rowCount === 0) {
            console.error('❌ Admin user not found');
            process.exit(1);
        }

        console.log('✅ Admin password updated successfully');
        console.log('\nAdmin credentials:');
        console.log('Email: admin@example.com');
        console.log('Password: ' + newPassword);
        console.log('\n⚠️  Please change this password after first login');

    } catch (error) {
        console.error('❌ Failed to update password:', error.message);
        process.exit(1);
    } finally {
        await client.end();
    }
}

// Get new password from command line argument
const newPassword = process.argv[2];
changeAdminPassword(newPassword); 