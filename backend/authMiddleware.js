const AuthService = require('./authService');

// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization;

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'No token provided',
      error: 'UNAUTHORIZED'
    });
  }

  // Remove "Bearer " prefix if present
  const actualToken = token.replace('Bearer ', '');

  const decoded = AuthService.verifyToken(actualToken);

  if (!decoded) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token',
      error: 'UNAUTHORIZED'
    });
  }

  // Attach user info to request
  req.user = decoded;
  next();
};

module.exports = {
  verifyToken
};