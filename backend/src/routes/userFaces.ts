import express from 'express';
import { pool } from '../db';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

// Initialize Supabase client for storage only
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase credentials');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const router = express.Router();

// Get all user faces
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM user_faces ORDER BY created_at DESC'
    );

    return res.status(200).json({ faces: result.rows });
  } catch (error) {
    console.error('Error fetching user faces:', error);
    return res.status(500).json({ error: 'Failed to fetch user faces' });
  }
});

// Get faces for a specific user
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const result = await pool.query(
      'SELECT * FROM user_faces WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );

    return res.status(200).json({ faces: result.rows });
  } catch (error) {
    console.error('Error fetching user faces:', error);
    return res.status(500).json({ error: 'Failed to fetch user faces' });
  }
});

// Add a new face for a user
router.post('/', async (req, res) => {
  try {
    const { userId, faceData, metadata } = req.body;

    if (!userId || !faceData) {
      return res.status(400).json({ error: 'User ID and face data are required' });
    }

    // Upload face data to Supabase Storage
    const fileName = `faces/${userId}/${Date.now()}.json`;
    const { error: uploadError } = await supabase.storage
      .from('user-faces')
      .upload(fileName, JSON.stringify(faceData), {
        contentType: 'application/json',
        upsert: true,
      });

    if (uploadError) {
      console.error('Error uploading face data:', uploadError);
      return res.status(500).json({ error: 'Failed to upload face data' });
    }

    // Get the public URL for the uploaded file
    const { data: { publicUrl } } = supabase.storage
      .from('user-faces')
      .getPublicUrl(fileName);

    // Store face metadata in the database
    const result = await pool.query(
      `INSERT INTO user_faces (user_id, face_data_url, metadata)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [userId, publicUrl, metadata]
    );

    return res.status(201).json({ face: result.rows[0] });
  } catch (error) {
    console.error('Error adding user face:', error);
    return res.status(500).json({ error: 'Failed to add user face' });
  }
});

// Delete a face
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Get the face data URL before deleting
    const result = await pool.query(
      'SELECT face_data_url FROM user_faces WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Face not found' });
    }

    const faceDataUrl = result.rows[0].face_data_url;

    // Delete from storage if URL exists
    if (faceDataUrl) {
      const fileName = faceDataUrl.split('/').pop();
      if (fileName) {
        const { error: deleteError } = await supabase.storage
          .from('user-faces')
          .remove([`faces/${fileName}`]);

        if (deleteError) {
          console.error('Error deleting face data from storage:', deleteError);
          // Continue with database deletion even if storage deletion fails
        }
      }
    }

    // Delete from database
    await pool.query('DELETE FROM user_faces WHERE id = $1', [id]);

    return res.status(200).json({ message: 'Face deleted successfully' });
  } catch (error) {
    console.error('Error deleting user face:', error);
    return res.status(500).json({ error: 'Failed to delete user face' });
  }
});

export default router; 