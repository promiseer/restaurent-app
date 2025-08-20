const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Verify JWT token
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      console.log('No token provided in authorization header');
      return res.status(401).json({ message: 'Access token required' });
    }

    console.log('Token received, verifying...');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Token decoded successfully, user ID:', decoded.userId);
    
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      console.log('User not found for ID:', decoded.userId);
      return res.status(401).json({ message: 'Invalid token - user not found' });
    }
    
    if (!user.isActive) {
      console.log('User is not active:', user.email);
      return res.status(401).json({ message: 'User account is not active' });
    }

    console.log('User authenticated successfully:', user.email);
    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error.message);
    if (error.name === 'TokenExpiredError') {
      return res.status(403).json({ message: 'Token has expired' });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(403).json({ message: 'Invalid token format' });
    }
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

// Require admin role
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({ 
      message: 'Access denied. Admin access required.' 
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
  requireCancelAccess,
  requireAdmin
};
