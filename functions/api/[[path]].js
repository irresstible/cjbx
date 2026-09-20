/**
 * Cloudflare Pages Functions - API 路由
 * 将原 Express 后端迁移到 Workers 环境
 * 使用 KV 存储用户数据和验证码
 */

import bcrypt from 'bcryptjs';

// ====== 配置 ======
// JWT 密钥必须通过环境变量注入（Pages 项目后台 → Settings → Environment variables，或本地 .dev.vars）
function getJwtSecret(env) {
  const secret = env && env.JWT_SECRET ? String(env.JWT_SECRET).trim() : '';
  return secret || null;
}

// 密钥未配置时的统一错误返回（本文件处理器返回 {status, body} 形态）
function secretMissingResult() {
  console.error('[config] 缺少 JWT_SECRET 环境变量，鉴权接口不可用');
  return { status: 500, body: { code: 500, msg: '服务器配置错误，请联系管理员' } };
}

// ====== 校验工具 ======
const PHONE_REGEX = /^1[3-9]\d{9}$/;
const isValidPhone = (p) => PHONE_REGEX.test(p);
const isValidUsername = (u) => u && u.length >= 2 && u.length <= 16;
const isValidPassword = (p) => p && p.length >= 6;

// ====== 个人资料字段校验 ======
const ALLOWED_GENDERS = ['male', 'female', 'secret'];
const isOptionalText = (v, max) => typeof v === 'string' && v.trim().length <= max;
const AVATAR_DATA_URL_REGEX = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=\r\n]+$/;
const MAX_AVATAR_LENGTH = 2 * 1024 * 1024;
const isValidAvatar = (v) => AVATAR_DATA_URL_REGEX.test(v) && v.length <= MAX_AVATAR_LENGTH;

// ====== Base64 UTF-8 安全编解码（中文用户名不会抛错） ======
function b64encode(str) {
  const bytes = new TextEncoder().encode(str);
  return btoa(String.fromCharCode(...bytes));
}

function b64decode(b64) {
  const bin = atob(b64);
  const bytes = Uint8Array.from([...bin].map(c => c.charCodeAt(0)));
  return new TextDecoder().decode(bytes);
}

// ====== JWT 工具 (HS256, 使用 Web Crypto API) ======
async function jwtSign(payload, secret, expiresInSec = 7 * 86400) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const body = { ...payload, iat: now, exp: now + expiresInSec };

  const b64url = (obj) => b64encode(JSON.stringify(obj)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
  const signingInput = `${b64url(header)}.${b64url(body)}`;

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sigBuf = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signingInput));
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sigBuf)))
    .replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');

  return `${signingInput}.${sigB64}`;
}

async function jwtVerify(token, secret) {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('invalid token');

  const [h, p, s] = parts;
  const signingInput = `${h}.${p}`;

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify']
  );

  const sigBin = atob(s.replace(/-/g, '+').replace(/_/g, '/'));
  const sigBuf = new Uint8Array([...sigBin].map(c => c.charCodeAt(0)));

  const valid = await crypto.subtle.verify('HMAC', key, sigBuf, new TextEncoder().encode(signingInput));
  if (!valid) throw new Error('invalid signature');

  const payload = JSON.parse(b64decode(p.replace(/-/g, '+').replace(/_/g, '/')));
  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
    throw new Error('token expired');
  }
  return payload;
}

// ====== KV 数据操作 ======
async function getUsers(kv) {
  const raw = await kv.get('users', 'text');
  return raw ? JSON.parse(raw) : [];
}

async function saveUsers(kv, users) {
  await kv.put('users', JSON.stringify(users));
}

// ====== 路由处理 ======

// POST /api/sendCode
async function handleSendCode(request, env) {
  const { phone: rawPhone } = await request.json();
  const phone = (rawPhone || '').trim();
  if (!isValidPhone(phone)) {
    return { code: 400, msg: '手机号格式不正确' };
  }
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  await env.APP_DATA.put(`code:${phone}`, code, { expirationTtl: 300 });
  console.log(`[模拟短信] 手机号 ${phone} 的验证码: ${code}`);
  return { code: 200, msg: '验证码发送成功' };
}

// POST /api/register
async function handleRegister(request, env) {
  const body = await request.json();
  const username = (body.username || '').trim();
  const password = (body.password || '').trim();
  const phone = (body.phone || '').trim();
  const userCode = body.verifyCode;

  if (!isValidUsername(username)) return { code: 400, msg: '用户名必须是2-16位字符' };
  if (!isValidPassword(password)) return { code: 400, msg: '密码长度不能少于6位' };
  if (!isValidPhone(phone)) return { code: 400, msg: '手机号格式不正确' };
  if (!userCode) return { code: 400, msg: '请输入验证码' };

  // 验证验证码
  const storedCode = await env.APP_DATA.get(`code:${phone}`, 'text');
  if (!storedCode) return { code: 400, msg: '请先获取验证码' };
  if (storedCode !== userCode) return { code: 400, msg: '验证码错误' };
  await env.APP_DATA.delete(`code:${phone}`);

  const users = await getUsers(env.APP_DATA);

  if (users.some(u => u.username === username)) {
    return { code: 400, msg: '用户名已被注册' };
  }
  if (users.some(u => u.phone === phone)) {
    return { code: 400, msg: '该手机号已注册' };
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  users.push({
    id: Date.now(),
    username,
    password: hashedPassword,
    phone,
    createdAt: new Date().toLocaleString()
  });
  await saveUsers(env.APP_DATA, users);

  return { code: 200, msg: '注册成功' };
}

// POST /api/login
async function handleLogin(request, env) {
  const body = await request.json();
  const username = (body.username || '').trim();
  const password = (body.password || '').trim();
  if (!username || !password) {
    return { code: 400, msg: '请输入用户名和密码' };
  }

  const users = await getUsers(env.APP_DATA);
  // 支持用户名或手机号登录
  const user = users.find(u => u.username === username || u.phone === username);
  if (!user) return { code: 400, msg: '用户不存在' };

  let valid;
  try {
    valid = bcrypt.compareSync(password, user.password);
  } catch (e) {
    console.error('[bcrypt.compare error]', e);
    return { code: 500, msg: '密码验证失败: ' + e.message };
  }
  if (!valid) return { code: 400, msg: '密码错误' };

  const secret = getJwtSecret(env);
  if (!secret) return secretMissingResult();

  const token = await jwtSign(
    { id: user.id, username: user.username },
    secret,
    7 * 86400
  );

  return { code: 200, msg: '登录成功', token, username: user.username };
}

// POST /api/resetPassword
async function handleResetPassword(request, env) {
  const body = await request.json();
  const phone = (body.phone || '').trim();
  const newPassword = (body.newPassword || '').trim();
  const userCode = body.verifyCode;

  if (!isValidPhone(phone)) return { code: 400, msg: '手机号格式不正确' };
  if (!userCode) return { code: 400, msg: '请输入验证码' };
  if (!isValidPassword(newPassword)) return { code: 400, msg: '新密码不能少于6位' };

  const storedCode = await env.APP_DATA.get(`code:${phone}`, 'text');
  if (!storedCode) return { code: 400, msg: '请先获取验证码' };
  if (storedCode !== userCode) return { code: 400, msg: '验证码错误' };
  await env.APP_DATA.delete(`code:${phone}`);

  const users = await getUsers(env.APP_DATA);
  const user = users.find(u => u.phone === phone);
  if (!user) return { code: 400, msg: '该手机号未注册' };

  user.password = await bcrypt.hash(newPassword, 10);
  await saveUsers(env.APP_DATA, users);

  return { code: 200, msg: '密码重置成功' };
}

// GET /api/profile
async function handleProfile(request, env) {
  const authHeader = request.headers.get('Authorization') || '';
  const token = authHeader.replace('Bearer ', '');
  if (!token) {
    return { status: 401, body: { code: 401, msg: '未登录' } };
  }

  try {
    const secret = getJwtSecret(env);
    if (!secret) return secretMissingResult();
    const decoded = await jwtVerify(token, secret);
    const users = await getUsers(env.APP_DATA);
    const user = users.find(u => u.id === decoded.id);
    if (!user) {
      return { status: 404, body: { code: 404, msg: '用户不存在' } };
    }
    const { password, ...userInfo } = user;
    return { code: 200, data: userInfo };
  } catch {
    return { status: 401, body: { code: 401, msg: 'token 已过期或无效' } };
  }
}

// PUT /api/profile 修改个人资料（昵称 / 性别 / 简介 / 头像）
async function handleUpdateProfile(request, env) {
  const authHeader = request.headers.get('Authorization') || '';
  const token = authHeader.replace('Bearer ', '');
  if (!token) {
    return { status: 401, body: { code: 401, msg: '未登录' } };
  }

  let decoded;
  try {
    const secret = getJwtSecret(env);
    if (!secret) return secretMissingResult();
    decoded = await jwtVerify(token, secret);
  } catch {
    return { status: 401, body: { code: 401, msg: 'token 已过期或无效' } };
  }

  const body = await request.json();
  const { nickname, gender, bio, avatar } = body || {};

  if (nickname !== undefined && !isOptionalText(nickname, 16)) {
    return { code: 400, msg: '昵称不能超过16个字符' };
  }
  if (bio !== undefined && !isOptionalText(bio, 100)) {
    return { code: 400, msg: '个人简介不能超过100个字符' };
  }
  if (gender !== undefined && !ALLOWED_GENDERS.includes(gender)) {
    return { code: 400, msg: '性别参数不合法' };
  }
  if (avatar !== undefined && avatar !== '' && !isValidAvatar(avatar)) {
    return { code: 400, msg: '头像格式不正确或大小超过2MB' };
  }

  const users = await getUsers(env.APP_DATA);
  const user = users.find(u => u.id === decoded.id);
  if (!user) {
    return { status: 404, body: { code: 404, msg: '用户不存在' } };
  }

  if (nickname !== undefined) user.nickname = nickname.trim();
  if (gender !== undefined) user.gender = gender;
  if (bio !== undefined) user.bio = bio.trim();
  if (avatar !== undefined) user.avatar = avatar;

  await saveUsers(env.APP_DATA, users);

  const { password, ...userInfo } = user;
  return { code: 200, msg: '保存成功', data: userInfo };
}

// ====== 主入口 ======
export const onRequest = async ({ request, env, next }) => {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  try {
    let result;

    if (path === '/api/sendCode' && method === 'POST') {
      result = await handleSendCode(request, env);
    } else if (path === '/api/register' && method === 'POST') {
      result = await handleRegister(request, env);
    } else if (path === '/api/login' && method === 'POST') {
      result = await handleLogin(request, env);
    } else if (path === '/api/resetPassword' && method === 'POST') {
      result = await handleResetPassword(request, env);
    } else if (path === '/api/profile' && method === 'GET') {
      result = await handleProfile(request, env);
    } else if (path === '/api/profile' && method === 'PUT') {
      result = await handleUpdateProfile(request, env);
    } else {
      return next();
    }

    // 处理带自定义 status 的返回
    if (result && result.status) {
      return new Response(JSON.stringify(result.body), {
        status: result.status,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.error('[API Error]', err);
    return new Response(JSON.stringify({ code: 500, msg: '服务器内部错误' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
