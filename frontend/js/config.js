/**
 * 全局常量
 */

// API 基础地址：本地开发指向 3000 端口；线上部署时同源（空字符串走相对路径）
export const API_BASE =
    location.protocol === 'file:' ||
    location.hostname === 'localhost' ||
    location.hostname === '127.0.0.1'
        ? 'http://localhost:3000'
        : '';

// 手机号正则（前后端统一）
export const PHONE_REGEX = /^1[3-9]\d{9}$/;
