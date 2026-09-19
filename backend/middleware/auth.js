/**
 * JWT 认证中间件
 */

const jwt = require('jsonwebtoken');
const config = require('../config');

/**
 * 验证 Token 中间件
 * 从 Authorization 头提取并验证 JWT
 * 验证通过后将解码的用户信息挂载到 req.user
 */
function authenticate(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ code: 401, msg: '未登录' });
  }
  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ code: 401, msg: 'token 已过期或无效' });
  }
}

module.exports = { authenticate };
