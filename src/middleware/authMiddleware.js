const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const User = require('../models/User');

/**
 * protect - Verifies JWT token from Authorization header.
 * Looks up the user in Admin collection first, then User collection.
 * Attaches the found user to req.user.
 */
const protect = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ message: 'Not authorized, no token provided' });
  }

  // Accept both "Bearer <token>" and "Bearer<token>" defensively
  const match = authHeader.match(/^Bearer\s*(.+)$/i);
  if (!match) {
    return res.status(401).json({ message: 'Not authorized, malformed Authorization header' });
  }

  const token = match[1];

  if (!process.env.JWT_SECRET) {
    return res.status(500).json({ message: 'Server misconfiguration: JWT_SECRET is missing' });
  }

  try {
    // Verify token signature and expiry
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Look up in Admin collection first (primary admin store)
    let foundUser = await Admin.findById(decoded.id).select('-password');

    // Fallback: look up in User collection (legacy / role-based users)
    if (!foundUser) {
      foundUser = await User.findById(decoded.id).select('-password');
    }

    if (!foundUser) {
      return res.status(401).json({ message: 'Not authorized, user not found' });
    }

    req.user = foundUser;
    return next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(401).json({
      message: 'Not authorized, token failed',
      reason: error.name,
    });
  }
};

/**
 * admin - Checks that the authenticated user has admin role.
 * Admin model defaults role to 'admin', User model can have role 'admin'.
 */
const admin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    return next();
  }
  return res.status(403).json({ message: 'Not authorized as an admin' });
};

module.exports = { protect, admin };

