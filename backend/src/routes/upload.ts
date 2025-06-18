import express from 'express';
import multer from 'multer';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import path from 'path';

config();

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase credentials');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const router = express.Router();

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow only image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

// Upload face image for a user
router.post('/face/:userId', upload.single('image'), async (req: express.Request, res: express.Response) => {
  try {
    const { userId } = req.params;
    const file = (req as any).file;

    if (!file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Generate unique filename
    const fileExtension = path.extname(file.originalname);
    const fileName = `faces/${userId}/${Date.now()}-${Math.random().toString(36).substring(7)}${fileExtension}`;

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('face-images')
      .upload(fileName, file.buffer, {
        contentType: file.mimetype,
        upsert: true,
      });

    if (uploadError) {
      console.error('Error uploading face image:', uploadError);
      return res.status(500).json({ error: 'Failed to upload face image' });
    }

    // Get the public URL
    const { data: { publicUrl } } = supabase.storage
      .from('face-images')
      .getPublicUrl(fileName);

    return res.status(200).json({
      success: true,
      imageUrl: publicUrl,
      fileName: fileName,
    });

  } catch (error) {
    console.error('Error in face upload:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Upload user profile image
router.post('/profile/:userId', upload.single('image'), async (req: express.Request, res: express.Response) => {
  try {
    const { userId } = req.params;
    const file = (req as any).file;

    if (!file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Generate unique filename
    const fileExtension = path.extname(file.originalname);
    const fileName = `profiles/${userId}/${Date.now()}-${Math.random().toString(36).substring(7)}${fileExtension}`;

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('user-photos')
      .upload(fileName, file.buffer, {
        contentType: file.mimetype,
        upsert: true,
      });

    if (uploadError) {
      console.error('Error uploading profile image:', uploadError);
      return res.status(500).json({ error: 'Failed to upload profile image' });
    }

    // Get the public URL
    const { data: { publicUrl } } = supabase.storage
      .from('user-photos')
      .getPublicUrl(fileName);

    return res.status(200).json({
      success: true,
      imageUrl: publicUrl,
      fileName: fileName,
    });

  } catch (error) {
    console.error('Error in profile upload:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Upload any file (generic endpoint)
router.post('/file', upload.single('file'), async (req: express.Request, res: express.Response) => {
  try {
    const file = (req as any).file;
    const { bucket = 'general' } = req.body;

    if (!file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    // Generate unique filename
    const fileExtension = path.extname(file.originalname);
    const fileName = `uploads/${Date.now()}-${Math.random().toString(36).substring(7)}${fileExtension}`;

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(fileName, file.buffer, {
        contentType: file.mimetype,
        upsert: true,
      });

    if (uploadError) {
      console.error('Error uploading file:', uploadError);
      return res.status(500).json({ error: 'Failed to upload file' });
    }

    // Get the public URL
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(fileName);

    return res.status(200).json({
      success: true,
      fileUrl: publicUrl,
      fileName: fileName,
      originalName: file.originalname,
      size: file.size,
      mimetype: file.mimetype,
    });

  } catch (error) {
    console.error('Error in file upload:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router; 