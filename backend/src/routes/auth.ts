import express from 'express';
import { pool } from '../db';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const router = express.Router();

// Sign up a new user
router.post('/signup', async (req, res) => {
  try {
    const { email, password, full_name, job_title } = req.body;

    if (!email || !password || !full_name || !job_title) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check if user already exists
    const existingUser = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const result = await pool.query(
      'INSERT INTO users (email, password_hash, first_name, last_name) VALUES ($1, $2, $3, $4) RETURNING id, email, first_name, last_name',
      [email, hashedPassword, full_name.split(' ')[0], full_name.split(' ').slice(1).join(' ')]
    );

    const user = result.rows[0];

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    return res.status(201).json({
      user: {
        ...user,
        full_name: `${user.first_name} ${user.last_name}`.trim()
      },
      token,
      message: 'User created successfully',
    });
  } catch (error) {
    console.error('Error in signup:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Sign in a user
router.post('/signin', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Get user from database
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check password
    const validPassword = await bcrypt.compare(password, user.password_hash);

    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    // Remove password from user object
    const { password_hash: _, ...userWithoutPassword } = user;

    return res.status(200).json({
      user: {
        ...userWithoutPassword,
        full_name: `${user.first_name} ${user.last_name}`.trim()
      },
      token,
    });
  } catch (error) {
    console.error('Error in signin:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Get current session
router.get('/session', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as { userId: string };

    // Get user from database
    const result = await pool.query(
      'SELECT id, email, first_name, last_name FROM users WHERE id = $1',
      [decoded.userId]
    );

    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    return res.status(200).json({
      user: {
        ...user,
        full_name: `${user.first_name} ${user.last_name}`.trim()
      }
    });
  } catch (error) {
    console.error('Error in getSession:', error);
    return res.status(401).json({ error: 'Invalid token' });
  }
});

// Sign out a user
router.post('/signout', async (req, res) => {
  // Since we're using JWT, we don't need to do anything on the server side
  // The client should remove the token
  return res.status(200).json({ message: 'Signed out successfully' });
});

export default router; 