require('dotenv').config();

module.exports = {
  port: process.env.PORT || 3000,
  jwtSecret: process.env.JWT_SECRET || 'cjbx-secret-key-2025',
  frontendUrl: process.env.FRONTEND_URL || '*',
};
