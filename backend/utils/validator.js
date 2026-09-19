/**
 * 通用校验工具
 */

const PHONE_REGEX = /^1[3-9]\d{9}$/;

/**
 * 校验手机号
 */
function isValidPhone(phone) {
  return PHONE_REGEX.test(phone);
}

/**
 * 校验用户名（2-16 位）
 */
function isValidUsername(username) {
  return username && username.length >= 2 && username.length <= 16;
}

/**
 * 校验密码（至少 6 位）
 */
function isValidPassword(password) {
  return password && password.length >= 6;
}

module.exports = { isValidPhone, isValidUsername, isValidPassword };
