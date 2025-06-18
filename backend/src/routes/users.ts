import express from 'express';
import { pool } from '../db';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import bcrypt from 'bcrypt';

config();

// Initialize Supabase client for auth and storage only
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase credentials for auth and storage');
}

const supabase = createClient(supabaseUrl, supabaseKey);

const router = express.Router();

// Get all users
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
        u.id,
        u.email,
        u.first_name,
        u.last_name,
        u.created_at,
        u.updated_at,
        array_agg(r.name) as roles
       FROM users u
       LEFT JOIN user_roles ur ON u.id = ur.user_id
       LEFT JOIN roles r ON ur.role_id = r.id
       GROUP BY u.id, u.email, u.first_name, u.last_name, u.created_at, u.updated_at
       ORDER BY u.created_at DESC`
    );

    // Transform the data to include full_name for frontend compatibility
    const users = result.rows.map(user => ({
      ...user,
      full_name: `${user.first_name || ''} ${user.last_name || ''}`.trim(),
      roles: user.roles.filter(role => role !== null) // Remove null values from LEFT JOIN
    }));

    return res.status(200).json({ users });
  } catch (error) {
    console.error('Error fetching users:', error);
    return res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Get a single user by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT 
        u.id,
        u.email,
        u.first_name,
        u.last_name,
        u.created_at,
        u.updated_at,
        array_agg(r.name) as roles
       FROM users u
       LEFT JOIN user_roles ur ON u.id = ur.user_id
       LEFT JOIN roles r ON ur.role_id = r.id
       WHERE u.id = $1
       GROUP BY u.id, u.email, u.first_name, u.last_name, u.created_at, u.updated_at`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];
    const responseUser = {
      ...user,
      full_name: `${user.first_name || ''} ${user.last_name || ''}`.trim(),
      roles: user.roles.filter(role => role !== null)
    };

    return res.status(200).json({ user: responseUser });
  } catch (error) {
    console.error('Error fetching user:', error);
    return res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Create a new user
router.post('/', async (req, res) => {
  try {
    const { email, password, fullName, role, jobTitle, accessZones, image } = req.body;

    // Validate required fields
    if (!email || !password || !fullName) {
      return res.status(400).json({ error: 'Email, password, and full name are required' });
    }

    // Split full name into first and last name
    const nameParts = fullName.trim().split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    // Hash the password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        role: role || 'user',
        job_title: jobTitle || '',
        access_zones: accessZones || [],
      },
    });

    if (authError) {
      console.error('Error creating user in Supabase Auth:', authError);
      return res.status(500).json({ error: 'Failed to create user in authentication system' });
    }

    // Insert user into database
    const result = await pool.query(
      `INSERT INTO users (id, email, password_hash, first_name, last_name)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [authData.user.id, email, passwordHash, firstName, lastName]
    );

    // Assign role if provided
    if (role) {
      const roleResult = await pool.query('SELECT id FROM roles WHERE name = $1', [role]);
      if (roleResult.rows.length > 0) {
        await pool.query(
          'INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [authData.user.id, roleResult.rows[0].id]
        );
      }
    }

    // Handle face image if provided
    let faceImageUrl = null;
    if (image) {
      try {
        // Convert base64 image to buffer
        const base64Data = image.split(',')[1];
        const imageBuffer = Buffer.from(base64Data, 'base64');
        const fileExt = 'jpg';
        const fileName = `${authData.user.id}.${fileExt}`;

        // Upload to Supabase Storage
        const { error: uploadError } = await supabase.storage
          .from('user-photos')
          .upload(fileName, imageBuffer, {
            contentType: 'image/jpeg',
            upsert: true
          });

        if (uploadError) {
          console.error('Error uploading image:', uploadError);
        } else {
          // Get the public URL
          const { data: { publicUrl } } = supabase.storage
            .from('user-photos')
            .getPublicUrl(fileName);
          
          faceImageUrl = publicUrl;

          // Store face image reference in user_faces table
          await pool.query(
            'INSERT INTO user_faces (user_id, image_url, embedding) VALUES ($1, $2, $3)',
            [authData.user.id, faceImageUrl, []] // Empty embedding array for now
          );
        }
      } catch (imageError) {
        console.error('Error handling face image:', imageError);
        // Continue without image if there's an error
      }
    }

    // Get the created user with roles
    const userResult = await pool.query(
      `SELECT 
        u.id,
        u.email,
        u.first_name,
        u.last_name,
        u.created_at,
        u.updated_at,
        array_agg(r.name) as roles
       FROM users u
       LEFT JOIN user_roles ur ON u.id = ur.user_id
       LEFT JOIN roles r ON ur.role_id = r.id
       WHERE u.id = $1
       GROUP BY u.id, u.email, u.first_name, u.last_name, u.created_at, u.updated_at`,
      [authData.user.id]
    );

    const user = userResult.rows[0];
    const responseUser = {
      ...user,
      full_name: `${user.first_name || ''} ${user.last_name || ''}`.trim(),
      roles: user.roles.filter(role => role !== null),
      avatar_url: faceImageUrl
    };

    return res.status(201).json({ user: responseUser });
  } catch (error) {
    console.error('Error in createUser:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Update a user
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { email, fullName, role, jobTitle, accessZones, image } = req.body;

    if (!id) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Check if user exists
    const userCheck = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Split full name into first and last name
    let firstName = userCheck.rows[0].first_name;
    let lastName = userCheck.rows[0].last_name;
    
    if (fullName) {
      const nameParts = fullName.trim().split(' ');
      firstName = nameParts[0] || '';
      lastName = nameParts.slice(1).join(' ') || '';
    }

    // Update user in Supabase Auth
    const { error: authError } = await supabase.auth.admin.updateUserById(
      id,
      {
        email: email || userCheck.rows[0].email,
        user_metadata: {
          full_name: fullName || `${firstName} ${lastName}`.trim(),
          role: role || 'user',
          job_title: jobTitle || '',
          access_zones: accessZones || [],
        },
      }
    );

    if (authError) {
      console.error('Error updating user in Supabase Auth:', authError);
      return res.status(500).json({ error: 'Failed to update user in authentication system' });
    }

    // Update user in database
    const result = await pool.query(
      `UPDATE users 
       SET email = COALESCE($1, email),
           first_name = $2,
           last_name = $3
       WHERE id = $4
       RETURNING *`,
      [email, firstName, lastName, id]
    );

    // Update role if provided
    if (role) {
      // Remove existing roles
      await pool.query('DELETE FROM user_roles WHERE user_id = $1', [id]);
      
      // Add new role
      const roleResult = await pool.query('SELECT id FROM roles WHERE name = $1', [role]);
      if (roleResult.rows.length > 0) {
        await pool.query(
          'INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)',
          [id, roleResult.rows[0].id]
        );
      }
    }

    // Handle face image if provided
    let faceImageUrl = null;
    if (image) {
      try {
        const base64Data = image.split(',')[1];
        const imageBuffer = Buffer.from(base64Data, 'base64');
        const fileExt = 'jpg';
        const fileName = `${id}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('user-photos')
          .upload(fileName, imageBuffer, {
            contentType: 'image/jpeg',
            upsert: true
          });

        if (uploadError) {
          console.error('Error uploading image:', uploadError);
        } else {
          const { data: { publicUrl } } = supabase.storage
            .from('user-photos')
            .getPublicUrl(fileName);
          
          faceImageUrl = publicUrl;

          // Update or insert face image reference
          await pool.query(
            `INSERT INTO user_faces (user_id, image_url, embedding) 
             VALUES ($1, $2, $3)
             ON CONFLICT (user_id) 
             DO UPDATE SET image_url = $2, updated_at = CURRENT_TIMESTAMP`,
            [id, faceImageUrl, []]
          );
        }
      } catch (imageError) {
        console.error('Error handling face image:', imageError);
      }
    }

    // Get the updated user with roles
    const userResult = await pool.query(
      `SELECT 
        u.id,
        u.email,
        u.first_name,
        u.last_name,
        u.created_at,
        u.updated_at,
        array_agg(r.name) as roles
       FROM users u
       LEFT JOIN user_roles ur ON u.id = ur.user_id
       LEFT JOIN roles r ON ur.role_id = r.id
       WHERE u.id = $1
       GROUP BY u.id, u.email, u.first_name, u.last_name, u.created_at, u.updated_at`,
      [id]
    );

    const user = userResult.rows[0];
    const responseUser = {
      ...user,
      full_name: `${user.first_name || ''} ${user.last_name || ''}`.trim(),
      roles: user.roles.filter(role => role !== null),
      avatar_url: faceImageUrl
    };

    return res.status(200).json({ user: responseUser });
  } catch (error) {
    console.error('Error in updateUser:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete a user
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Check if user exists
    const userCheck = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Delete user from Supabase Auth
    const { error: authError } = await supabase.auth.admin.deleteUser(id);

    if (authError) {
      console.error('Error deleting user from Supabase Auth:', authError);
      return res.status(500).json({ error: 'Failed to delete user from authentication system' });
    }

    // Delete user's photo from storage
    try {
      const { error: storageError } = await supabase.storage
        .from('user-photos')
        .remove([`${id}.jpg`]);

      if (storageError) {
        console.error('Error deleting user photo:', storageError);
      }
    } catch (storageError) {
      console.error('Error deleting user photo:', storageError);
    }

    // Delete user from database (this will cascade to user_roles and user_faces)
    const result = await pool.query(
      'DELETE FROM users WHERE id = $1 RETURNING *',
      [id]
    );

    return res.status(200).json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error in deleteUser:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;