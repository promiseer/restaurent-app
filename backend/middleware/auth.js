const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Verify JWT token
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ message: 'Access token required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'Invalid token or user not active' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(403).json({ message: 'Invalid or expired token' });
  }
};

// Check if user has required role
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: `Access denied. Required role: ${roles.join(' or ')}` 
      });
    }

    next();
  };
};

// Check if user can access country-specific data
const requireCountryAccess = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  // Admin can access all countries
  if (req.user.role === 'admin') {
    return next();
  }

  // Get target country from query params, body, or params
  const targetCountry = req.query.country || req.body.country || req.params.country;
  
  if (targetCountry && req.user.country !== targetCountry) {
    return res.status(403).json({ 
      message: 'Access denied. You can only access data from your assigned country.' 
    });
  }

  next();
};

// Check payment method access
const requirePaymentAccess = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  // Only admin can update payment methods
  if (req.user.role !== 'admin') {
    return res.status(403).json({ 
      message: 'Access denied. Only admins can update payment methods.' 
    });
  }

  next();
};

// Check order access (place order)
const requireOrderAccess = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  // Members cannot place orders (checkout & pay)
  if (req.user.role === 'member') {
    return res.status(403).json({ 
      message: 'Access denied. Members cannot place orders.' 
    });
  }

  next();
};

// Check cancel order access
const requireCancelAccess = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  // Members cannot cancel orders
  if (req.user.role === 'member') {
    return res.status(403).json({ 
      message: 'Access denied. Members cannot cancel orders.' 
    });
  }

  next();
};

module.exports = {
  authenticateToken,
  requireRole,
  requireCountryAccess,
  requirePaymentAccess,
  requireOrderAccess,
  requireCancelAccess
};
