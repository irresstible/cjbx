/**
 * 验证码存储模块
 * 管理验证码的生成、验证和过期清理
 */

const codeStore = {};

// 定期清理过期的验证码（每 10 分钟一次）
setInterval(() => {
  const now = Date.now();
  for (const phone in codeStore) {
    if (now > codeStore[phone].expire) {
      delete codeStore[phone];
    }
  }
}, 10 * 60 * 1000);

/**
 * 存储验证码
 * @param {string} phone - 手机号
 * @param {string} code - 验证码
 * @param {number} ttl - 过期时间（毫秒），默认 5 分钟
 */
function setCode(phone, code, ttl = 5 * 60 * 1000) {
  codeStore[phone] = { code, expire: Date.now() + ttl };
}

/**
 * 验证并消费验证码（验证成功后自动删除）
 * @param {string} phone - 手机号
 * @param {string} code - 用户输入的验证码
 * @returns {{ valid: boolean, msg: string }}
 */
function verifyCode(phone, code) {
  const stored = codeStore[phone];
  if (!stored) return { valid: false, msg: '请先获取验证码' };
  if (Date.now() > stored.expire) {
    delete codeStore[phone];
    return { valid: false, msg: '验证码已过期' };
  }
  if (stored.code !== code) return { valid: false, msg: '验证码错误' };
  // 验证成功，消费掉
  delete codeStore[phone];
  return { valid: true };
}

module.exports = { setCode, verifyCode };
