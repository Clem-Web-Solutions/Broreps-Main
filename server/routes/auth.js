import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../config/database.js';

const router = express.Router();

// Register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role = 'user' } = req.body;

    console.log('📝 Register attempt for:', email);

    if (!email || !password || !name) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        code: 'MISSING_FIELDS'
      });
    }

    // Check if user exists
    const [existing] = await db.query(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (existing.length > 0) {
      console.log('❌ Email already registered:', email);
      return res.status(409).json({ 
        error: 'Email already registered',
        code: 'EMAIL_EXISTS'
      });
    }

    // Hash password
    console.log('🔐 Hashing password for:', email);
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log('    Hash created:', hashedPassword.substring(0, 20) + '...');

    // Create user with pending status (requires admin approval)
    const status = role === 'admin' ? 'approved' : 'pending';
    const [result] = await db.query(
      'INSERT INTO users (name, email, password, role, status) VALUES (?, ?, ?, ?, ?)',
      [name, email, hashedPassword, role, status]
    );

    console.log('✅ User created successfully:', email, 'Status:', status);

    const [user] = await db.query(
      'SELECT id, name, email, role, status, created_at FROM users WHERE id = ?',
      [result.insertId]
    );

    // Generate token
    const token = jwt.sign(
      { id: user[0].id, email: user[0].email, role: user[0].role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: user[0]
    });
  } catch (err) {
    console.error('❌ Register error:', err);
    res.status(500).json({ 
      error: 'Registration failed',
      code: 'SERVER_ERROR'
    });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log('🔐 Login attempt for:', email);

    if (!email || !password) {
      return res.status(400).json({ 
        error: 'Email and password required',
        code: 'MISSING_FIELDS'
      });
    }

    // Find user
    const [users] = await db.query(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );

    if (users.length === 0) {
      console.log('❌ No account found for:', email);
      return res.status(401).json({ 
        error: 'Invalid credentials',
        code: 'NO_ACCOUNT'
      });
    }

    const user = users[0];
    console.log('✅ User found:', user.email, 'Status:', user.status);

    // Check if user is approved
    if (user.status === 'pending') {
      console.log('⏳ Account pending approval:', user.email);
      return res.status(403).json({ 
        error: 'Account pending approval',
        code: 'PENDING_VALIDATION'
      });
    }

    if (user.status === 'rejected') {
      console.log('🚫 Account rejected:', user.email);
      return res.status(403).json({ 
        error: 'Account access denied',
        code: 'ACCOUNT_REJECTED'
      });
    }

    // Verify password
    console.log('🔑 Verifying password for:', user.email);
    console.log('    Password hash in DB:', user.password.substring(0, 20) + '...');
    const isValidPassword = await bcrypt.compare(password, user.password);
    console.log('    Password valid:', isValidPassword);

    if (!isValidPassword) {
      console.log('❌ Invalid password for:', user.email);
      return res.status(401).json({ 
        error: 'Invalid credentials',
        code: 'INVALID_PASSWORD'
      });
    }

    console.log('✅ Login successful for:', user.email);

    // Generate token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    console.error('❌ Login error:', err);
    res.status(500).json({ 
      error: 'Login failed',
      code: 'SERVER_ERROR'
    });
  }
});

// Get users by status (admin only)
router.get('/users/:status', async (req, res) => {
  try {
    const status = req.params.status;
    const validStatuses = ['pending', 'approved', 'rejected'];
    
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const [users] = await db.query(
      'SELECT id, name, email, role, status, created_at FROM users WHERE status = ? ORDER BY created_at DESC',
      [status]
    );

    res.json({ users });
  } catch (err) {
    console.error('Get users error:', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Approve user (admin only)
router.post('/approve-user/:userId', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    // Update user status to approved
    await db.query(
      "UPDATE users SET status = 'approved' WHERE id = ?",
      [userId]
    );

    // Get updated user
    const [users] = await db.query(
      'SELECT id, name, email, role, status, created_at FROM users WHERE id = ?',
      [userId]
    );

    res.json({ success: true, message: 'User approved', user: users[0] });
  } catch (err) {
    console.error('Approve user error:', err);
    res.status(500).json({ error: 'Failed to approve user' });
  }
});

// Reject user (admin only)
router.post('/reject-user/:userId', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    // Update user status to rejected
    await db.query(
      "UPDATE users SET status = 'rejected' WHERE id = ?",
      [userId]
    );

    // Get updated user
    const [users] = await db.query(
      'SELECT id, name, email, role, status, created_at FROM users WHERE id = ?',
      [userId]
    );

    res.json({ success: true, message: 'User rejected', user: users[0] });
  } catch (err) {
    console.error('Reject user error:', err);
    res.status(500).json({ error: 'Failed to reject user' });
  }
});

export default router;
