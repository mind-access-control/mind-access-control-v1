import express from 'express';
import { pool } from '../db';

const router = express.Router();

// Get all zones
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM zones ORDER BY name');

    return res.status(200).json({ zones: result.rows });
  } catch (error) {
    console.error('Error fetching zones:', error);
    return res.status(500).json({ error: 'Failed to fetch zones' });
  }
});

// Create a new zone
router.post('/', async (req, res) => {
  try {
    const { name, description, access_level } = req.body;

    // Validate required fields
    if (!name || !access_level) {
      return res.status(400).json({ error: 'Name and access level are required' });
    }

    const result = await pool.query(
      `INSERT INTO zones (name, description, access_level)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [name, description, access_level]
    );

    return res.status(201).json({ zone: result.rows[0] });
  } catch (error) {
    console.error('Error creating zone:', error);
    return res.status(500).json({ error: 'Failed to create zone' });
  }
});

// Update a zone
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, access_level } = req.body;

    // Validate required fields
    if (!name || !access_level) {
      return res.status(400).json({ error: 'Name and access level are required' });
    }

    const result = await pool.query(
      `UPDATE zones
       SET name = $1, description = $2, access_level = $3
       WHERE id = $4
       RETURNING *`,
      [name, description, access_level, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Zone not found' });
    }

    return res.status(200).json({ zone: result.rows[0] });
  } catch (error) {
    console.error('Error updating zone:', error);
    return res.status(500).json({ error: 'Failed to update zone' });
  }
});

// Delete a zone
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM zones WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Zone not found' });
    }

    return res.status(200).json({ message: 'Zone deleted successfully' });
  } catch (error) {
    console.error('Error deleting zone:', error);
    return res.status(500).json({ error: 'Failed to delete zone' });
  }
});

// Get zone access logs
router.get('/:id/logs', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT al.*, u.full_name, u.job_title
       FROM access_logs al
       JOIN users u ON al.user_id = u.id
       WHERE al.zone = (SELECT name FROM zones WHERE id = $1)
       ORDER BY al.timestamp DESC`,
      [id]
    );

    return res.status(200).json({ logs: result.rows });
  } catch (error) {
    console.error('Error fetching zone logs:', error);
    return res.status(500).json({ error: 'Failed to fetch zone logs' });
  }
});

export default router; 