// middleware/auth.js
const jwt = require('jsonwebtoken');
const { jwt: jwtConfig } = require('../../config/index');
const VALID_ROLES = ['job_seeker', 'recruiter', 'admin'];

module.exports = (req, res, next) => {
  const authHeader = req.headers['authorization'];

  if (!authHeader) {
    return res.status(401).json({ message: 'No token provided' });
  }

  if (typeof authHeader !== 'string' || !authHeader.trim()) {
    return res.status(401).json({ message: 'Invalid token' });
  }

  try {
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer' || !parts[1].trim()) {
      return res.status(401).json({ message: 'Invalid token' });
    }

    const token   = parts[1];
    const decoded = jwt.verify(token, jwtConfig.secret);

    if (!decoded || typeof decoded !== 'object' || Array.isArray(decoded)) {
      return res.status(401).json({ message: 'Invalid token' });
    }

    if (!decoded.id || typeof decoded.id !== 'number' || decoded.id <= 0) {
      return res.status(401).json({ message: 'Invalid token' });
    }

    if (!decoded.role || typeof decoded.role !== 'string' || !VALID_ROLES.includes(decoded.role)) {
      return res.status(401).json({ message: 'Invalid token' });
    }

    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Invalid token' });
  }
};