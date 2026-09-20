/**
 * Cloudflare Worker - 一起过新年
 * API 路由 + 静态资源托管
 */

import bcrypt from 'bcryptjs';

// ====== 配置 ======
// JWT 密钥必须通过环境变量注入（线上：wrangler secret put JWT_SECRET；本地：.dev.vars）
function getJwtSecret(env) {
  const secret = env && env.JWT_SECRET ? String(env.JWT_SECRET).trim() : '';
  return secret || null;
}

// 密钥未配置时的统一错误响应（避免用空字符串/默认值签发可伪造的 token）
function secretMissingResponse() {
  console.error('[config] 缺少 JWT_SECRET 环境变量，鉴权接口不可用');
  return jsonResponse({ code: 500, msg: '服务器配置错误，请联系管理员' }, 500);
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

// ====== Base64 UTF-8 安全编解码 ======
function b64encode(str) {
  // 先将 UTF-8 字节转为二进制字符串，再用 btoa
  const bytes = new TextEncoder().encode(str);
  return btoa(String.fromCharCode(...bytes));
}

function b64decode(b64) {
  // atob 得到二进制字节，再用 TextDecoder 解码 UTF-8
  const bin = atob(b64);
  const bytes = Uint8Array.from([...bin].map(c => c.charCodeAt(0)));
  return new TextDecoder().decode(bytes);
}

function b64url(obj) {
  return b64encode(JSON.stringify(obj)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
}

// ====== JWT 工具 (HS256, 使用 Web Crypto API) ======
async function jwtSign(payload, secret, expiresInSec = 7 * 86400) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const body = { ...payload, iat: now, exp: now + expiresInSec };

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

// ====== JSON 响应 ======
function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

// ====== 路由处理 ======

async function handleSendCode(request, env) {
  const { phone: rawPhone } = await request.json();
  const phone = (rawPhone || '').trim();
  if (!isValidPhone(phone)) {
    return jsonResponse({ code: 400, msg: '手机号格式不正确' });
  }
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  await env.APP_DATA.put(`code:${phone}`, code, { expirationTtl: 300 });
  console.log(`[模拟短信] 手机号 ${phone} 的验证码: ${code}`);
  return jsonResponse({ code: 200, msg: '验证码发送成功' });
}

async function handleRegister(request, env) {
  const body = await request.json();
  const username = (body.username || '').trim();
  const password = (body.password || '').trim();
  const phone = (body.phone || '').trim();
  const userCode = body.verifyCode;

  if (!isValidUsername(username)) return jsonResponse({ code: 400, msg: '用户名必须是2-16位字符' });
  if (!isValidPassword(password)) return jsonResponse({ code: 400, msg: '密码长度不能少于6位' });
  if (!isValidPhone(phone)) return jsonResponse({ code: 400, msg: '手机号格式不正确' });
  if (!userCode) return jsonResponse({ code: 400, msg: '请输入验证码' });

  const storedCode = await env.APP_DATA.get(`code:${phone}`, 'text');
  if (!storedCode) return jsonResponse({ code: 400, msg: '请先获取验证码' });
  if (storedCode !== userCode) return jsonResponse({ code: 400, msg: '验证码错误' });
  await env.APP_DATA.delete(`code:${phone}`);

  const users = await getUsers(env.APP_DATA);
  if (users.some(u => u.username === username)) return jsonResponse({ code: 400, msg: '用户名已被注册' });
  if (users.some(u => u.phone === phone)) return jsonResponse({ code: 400, msg: '该手机号已注册' });

  const hashedPassword = await bcrypt.hash(password, 10);
  users.push({
    id: Date.now(),
    username,
    password: hashedPassword,
    phone,
    createdAt: new Date().toLocaleString()
  });
  await saveUsers(env.APP_DATA, users);

  return jsonResponse({ code: 200, msg: '注册成功' });
}

async function handleLogin(request, env) {
  const body = await request.json();
  const username = (body.username || '').trim();
  const password = (body.password || '').trim();
  if (!username || !password) {
    return jsonResponse({ code: 400, msg: '请输入用户名和密码' });
  }

  const users = await getUsers(env.APP_DATA);
  // 支持用户名或手机号登录
  const user = users.find(u => u.username === username || u.phone === username);
  if (!user) return jsonResponse({ code: 400, msg: '用户不存在' });

  let valid;
  try {
    valid = bcrypt.compareSync(password, user.password);
  } catch (e) {
    console.error('[bcrypt error]', e.message);
    return jsonResponse({ code: 500, msg: '密码验证出错: ' + e.message }, 500);
  }
  if (!valid) return jsonResponse({ code: 400, msg: '密码错误' });

  const secret = getJwtSecret(env);
  if (!secret) return secretMissingResponse();

  const token = await jwtSign(
    { id: user.id, username: user.username },
    secret,
    7 * 86400
  );

  return jsonResponse({ code: 200, msg: '登录成功', token, username: user.username });
}

async function handleResetPassword(request, env) {
  const body = await request.json();
  const phone = (body.phone || '').trim();
  const newPassword = (body.newPassword || '').trim();
  const userCode = body.verifyCode;

  if (!isValidPhone(phone)) return jsonResponse({ code: 400, msg: '手机号格式不正确' });
  if (!userCode) return jsonResponse({ code: 400, msg: '请输入验证码' });
  if (!isValidPassword(newPassword)) return jsonResponse({ code: 400, msg: '新密码不能少于6位' });

  const storedCode = await env.APP_DATA.get(`code:${phone}`, 'text');
  if (!storedCode) return jsonResponse({ code: 400, msg: '请先获取验证码' });
  if (storedCode !== userCode) return jsonResponse({ code: 400, msg: '验证码错误' });
  await env.APP_DATA.delete(`code:${phone}`);

  const users = await getUsers(env.APP_DATA);
  const user = users.find(u => u.phone === phone);
  if (!user) return jsonResponse({ code: 400, msg: '该手机号未注册' });

  user.password = await bcrypt.hash(newPassword, 10);
  await saveUsers(env.APP_DATA, users);

  return jsonResponse({ code: 200, msg: '密码重置成功' });
}

async function handleProfile(request, env) {
  const authHeader = request.headers.get('Authorization') || '';
  const token = authHeader.replace('Bearer ', '');
  if (!token) {
    return jsonResponse({ code: 401, msg: '未登录' }, 401);
  }

  try {
    const secret = getJwtSecret(env);
    if (!secret) return secretMissingResponse();
    const decoded = await jwtVerify(token, secret);
    const users = await getUsers(env.APP_DATA);
    const user = users.find(u => u.id === decoded.id);
    if (!user) return jsonResponse({ code: 404, msg: '用户不存在' }, 404);

    const { password, ...userInfo } = user;
    return jsonResponse({ code: 200, data: userInfo });
  } catch {
    return jsonResponse({ code: 401, msg: 'token 已过期或无效' }, 401);
  }
}

// PUT /api/profile 修改个人资料（昵称 / 性别 / 简介 / 头像）
async function handleUpdateProfile(request, env) {
  const authHeader = request.headers.get('Authorization') || '';
  const token = authHeader.replace('Bearer ', '');
  if (!token) {
    return jsonResponse({ code: 401, msg: '未登录' }, 401);
  }

  let decoded;
  try {
    const secret = getJwtSecret(env);
    if (!secret) return secretMissingResponse();
    decoded = await jwtVerify(token, secret);
  } catch {
    return jsonResponse({ code: 401, msg: 'token 已过期或无效' }, 401);
  }

  const body = await request.json();
  const { nickname, gender, bio, avatar } = body || {};

  if (nickname !== undefined && !isOptionalText(nickname, 16)) {
    return jsonResponse({ code: 400, msg: '昵称不能超过16个字符' });
  }
  if (bio !== undefined && !isOptionalText(bio, 100)) {
    return jsonResponse({ code: 400, msg: '个人简介不能超过100个字符' });
  }
  if (gender !== undefined && !ALLOWED_GENDERS.includes(gender)) {
    return jsonResponse({ code: 400, msg: '性别参数不合法' });
  }
  if (avatar !== undefined && avatar !== '' && !isValidAvatar(avatar)) {
    return jsonResponse({ code: 400, msg: '头像格式不正确或大小超过2MB' });
  }

  const users = await getUsers(env.APP_DATA);
  const user = users.find(u => u.id === decoded.id);
  if (!user) return jsonResponse({ code: 404, msg: '用户不存在' }, 404);

  if (nickname !== undefined) user.nickname = nickname.trim();
  if (gender !== undefined) user.gender = gender;
  if (bio !== undefined) user.bio = bio.trim();
  if (avatar !== undefined) user.avatar = avatar;

  await saveUsers(env.APP_DATA, users);

  const { password, ...userInfo } = user;
  return jsonResponse({ code: 200, msg: '保存成功', data: userInfo });
}

// ====== 主入口 ======
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // API 路由
    if (path.startsWith('/api/')) {
      try {
        if (path === '/api/sendCode' && method === 'POST') return await handleSendCode(request, env);
        if (path === '/api/register' && method === 'POST') return await handleRegister(request, env);
        if (path === '/api/login' && method === 'POST') return await handleLogin(request, env);
        if (path === '/api/resetPassword' && method === 'POST') return await handleResetPassword(request, env);
        if (path === '/api/profile' && method === 'GET') return await handleProfile(request, env);
        if (path === '/api/profile' && method === 'PUT') return await handleUpdateProfile(request, env);

        return jsonResponse({ code: 404, msg: '接口不存在' }, 404);
      } catch (err) {
        console.error('[API Error]', err);
        return jsonResponse({ code: 500, msg: '服务器内部错误: ' + err.message }, 500);
      }
    }

    // 非 API 路由交给静态资源处理
    return env.ASSETS.fetch(request);
  }
};
