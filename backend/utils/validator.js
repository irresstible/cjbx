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

// ====== 个人资料字段校验 ======

const ALLOWED_GENDERS = ['male', 'female', 'secret'];

/**
 * 校验性别枚举
 */
function isValidGender(gender) {
  return ALLOWED_GENDERS.includes(gender);
}

/**
 * 校验可选字符串（允许为空，超长非法）
 * 以 trim 后的实际内容长度为准：纯空格按空内容处理，首尾空格不计入长度
 * @param {string} value - 字段值
 * @param {number} max - 最大长度
 */
function isOptionalText(value, max) {
  return typeof value === 'string' && value.trim().length <= max;
}

// 头像仅允许 jpeg/png/webp 的 data URL（前端压缩后上传）
const AVATAR_DATA_URL_REGEX = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=\r\n]+$/;
const MAX_AVATAR_LENGTH = 2 * 1024 * 1024; // base64 后不超过 2MB

/**
 * 校验头像 data URL
 * @param {string} avatar - data:image/...;base64,xxxx
 */
function isValidAvatar(avatar) {
  return AVATAR_DATA_URL_REGEX.test(avatar) && avatar.length <= MAX_AVATAR_LENGTH;
}

module.exports = {
  isValidPhone,
  isValidUsername,
  isValidPassword,
  isValidGender,
  isOptionalText,
  isValidAvatar
};
