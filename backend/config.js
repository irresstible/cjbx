require('dotenv').config();

// JWT 密钥：生产环境必须由环境变量注入；开发环境允许临时兜底并给出警告
const DEV_FALLBACK_SECRET = 'cjbx-dev-only-secret';
let jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret || !jwtSecret.trim()) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('生产环境必须设置 JWT_SECRET 环境变量（随机强密码），拒绝启动');
  }
  console.warn('[安全警告] 未设置 JWT_SECRET 环境变量，正在使用仅适用于本地开发的临时密钥。上线前请在 .env 中配置随机强密码。');
  jwtSecret = DEV_FALLBACK_SECRET;
}

module.exports = {
  port: process.env.PORT || 3000,
  jwtSecret: jwtSecret.trim(),
  frontendUrl: process.env.FRONTEND_URL || '*',
};
