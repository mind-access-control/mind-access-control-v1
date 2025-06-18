import express from 'express';
import { pool } from '../db';

const router = express.Router();

// Get all access logs
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM access_logs ORDER BY timestamp DESC'
    );

    return res.status(200).json({ logs: result.rows });
  } catch (error) {
    console.error('Error fetching access logs:', error);
    return res.status(500).json({ error: 'Failed to fetch access logs' });
  }
});

// Create a new access log
router.post('/', async (req, res) => {
  try {
    const { userId, zone, method, status, timestamp } = req.body;

    // Validate required fields
    if (!userId || !zone || !method || !status || !timestamp) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const result = await pool.query(
      `INSERT INTO access_logs (user_id, zone, method, status, timestamp)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [userId, zone, method, status, timestamp]
    );

    return res.status(201).json({ log: result.rows[0] });
  } catch (error) {
    console.error('Error in createAccessLog:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Get access logs by user ID
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const result = await pool.query(
      'SELECT * FROM access_logs WHERE user_id = $1 ORDER BY timestamp DESC',
      [userId]
    );

    return res.status(200).json({ logs: result.rows });
  } catch (error) {
    console.error('Error in getUserAccessLogs:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Get access logs by zone
router.get('/zone/:zone', async (req, res) => {
  try {
    const { zone } = req.params;

    if (!zone) {
      return res.status(400).json({ error: 'Zone is required' });
    }

    const result = await pool.query(
      'SELECT * FROM access_logs WHERE zone = $1 ORDER BY timestamp DESC',
      [zone]
    );

    return res.status(200).json({ logs: result.rows });
  } catch (error) {
    console.error('Error in getZoneAccessLogs:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Get access logs by date range
router.get('/date-range', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'Start date and end date are required' });
    }

    const result = await pool.query(
      'SELECT * FROM access_logs WHERE timestamp >= $1 AND timestamp <= $2 ORDER BY timestamp DESC',
      [startDate, endDate]
    );

    return res.status(200).json({ logs: result.rows });
  } catch (error) {
    console.error('Error in getDateRangeAccessLogs:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router; 