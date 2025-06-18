const axios = require('axios');
require('dotenv').config();

const API_URL = process.env.API_URL || 'http://localhost:3001';

async function testApiConnection() {
    console.log('Testing backend API connection...');
    console.log('API URL:', API_URL);
    console.log('\nEnvironment variables:');
    console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? '✅ Set' : '❌ Missing');
    console.log('SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing');
    console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Set' : '❌ Missing');

    try {
        // Test health check endpoint
        console.log('\nTesting health check endpoint...');
        const healthResponse = await axios.get(`${API_URL}/health`);
        console.log('✅ Health check successful!');
        console.log('Response:', healthResponse.data);

        // Test database connection through API
        console.log('\nTesting database connection through API...');
        const dbResponse = await axios.get(`${API_URL}/api/health/db`);
        console.log('✅ Database connection successful!');
        console.log('Response:', dbResponse.data);

        // Test Supabase connection through API
        console.log('\nTesting Supabase connection through API...');
        const supabaseResponse = await axios.get(`${API_URL}/api/health/supabase`);
        console.log('✅ Supabase connection successful!');
        console.log('Response:', supabaseResponse.data);

    } catch (error) {
        console.error('\n❌ Connection test failed!');
        
        if (error.response) {
            // The request was made and the server responded with a status code
            // that falls out of the range of 2xx
            console.error('Error status:', error.response.status);
            console.error('Error data:', error.response.data);
        } else if (error.request) {
            // The request was made but no response was received
            console.error('No response received from server');
            console.error('Error request:', error.request);
        } else {
            // Something happened in setting up the request that triggered an Error
            console.error('Error message:', error.message);
        }

        console.log('\nTroubleshooting steps:');
        console.log('1. Make sure the backend server is running (pnpm run dev in backend directory)');
        console.log('2. Check if the port 3001 is available and not blocked');
        console.log('3. Verify all required environment variables are set in .env:');
        console.log('   - SUPABASE_URL');
        console.log('   - SUPABASE_ANON_KEY');
        console.log('   - SUPABASE_SERVICE_ROLE_KEY');
        console.log('4. Check if your Supabase project is active');
        console.log('5. Verify your network allows connections to the API URL');
    }
}

// Run the test
testApiConnection(); 