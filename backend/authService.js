const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./database');

class AuthService {
  // Hash password
  static hashPassword(password) {
    return bcrypt.hashSync(password, 10);
  }

  // Verify password
  static verifyPassword(password, hash) {
    return bcrypt.compareSync(password, hash);
  }

  // Generate JWT token
  static generateToken(userId, username) {
    const secret = process.env.JWT_SECRET || 'your-secret-key-change-this';
    const expiry = process.env.JWT_EXPIRY || '30d';

    const token = jwt.sign(
      { id: userId, username: username },
      secret,
      { expiresIn: expiry }
    );

    return token;
  }

  // Verify JWT token
  static verifyToken(token) {
    try {
      const secret = process.env.JWT_SECRET || 'your-secret-key-change-this';
      const decoded = jwt.verify(token, secret);
      return decoded;
    } catch (err) {
      return null;
    }
  }

  // Login user
  static loginUser(username, password, callback) {
    db.get(
      'SELECT id, username, password_hash FROM users WHERE username = ?',
      [username],
      (err, user) => {
        if (err) {
          return callback(err, null);
        }

        if (!user) {
          return callback(new Error('User not found'), null);
        }

        // Verify password
        const isPasswordValid = this.verifyPassword(password, user.password_hash);

        if (!isPasswordValid) {
          return callback(new Error('Invalid password'), null);
        }

        // Generate token
        const token = this.generateToken(user.id, user.username);

        callback(null, {
          success: true,
          token: token,
          user: {
            id: user.id,
            username: user.username
          }
        });
      }
    );
  }

  // Create new user
  static createUser(username, password, email, callback) {
    // Check if user exists
    db.get(
      'SELECT id FROM users WHERE username = ?',
      [username],
      (err, user) => {
        if (user) {
          return callback(new Error('Username already exists'), null);
        }

        // Hash password
        const hashedPassword = this.hashPassword(password);

        // Insert user
        db.run(
          'INSERT INTO users (username, password_hash, email) VALUES (?, ?, ?)',
          [username, hashedPassword, email],
          function(err) {
            if (err) {
              return callback(err, null);
            }

            const token = AuthService.generateToken(this.lastID, username);

            callback(null, {
              success: true,
              token: token,
              user: {
                id: this.lastID,
                username: username
              }
            });
          }
        );
      }
    );
  }
}

module.exports = AuthService;