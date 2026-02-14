import jwt from 'jsonwebtoken';

export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

export const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

/**
 * Middleware for CRON jobs authentication
 * Checks for CRON_SECRET in Authorization header
 */
export const authenticateCron = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'CRON token required' });
  }

  const CRON_SECRET = process.env.CRON_SECRET || 'your-cron-secret-key';

  if (token !== CRON_SECRET) {
    return res.status(403).json({ error: 'Invalid CRON token' });
  }

  // Set a system user for logging purposes
  req.user = { id: 0, role: 'system', name: 'CRON' };
  next();
};
