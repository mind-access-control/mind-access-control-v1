import express from 'express';
import pool from '../db';

const router = express.Router();

// General health check
router.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0'
    });
});

// Database health check
router.get('/db', async (req, res) => {
    try {
        const result = await pool.query('SELECT COUNT(*) FROM users');
        
        res.json({
            status: 'ok',
            userCount: parseInt(result.rows[0].count)
        });
    } catch (error) {
        console.error('Database health check failed:', error);
        res.status(500).json({
            status: 'error',
            message: 'Database health check failed',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});

// Database connection test
router.get('/db-connection', async (req, res) => {
    try {
        const result = await pool.query('SELECT version()');
        
        res.json({
            status: 'ok',
            version: result.rows[0].version,
        });
    } catch (error) {
        console.error('Database connection test failed:', error);
        res.status(500).json({
            status: 'error',
            message: 'Database connection test failed',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});

export default router; 