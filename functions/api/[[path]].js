/**
 * Cloudflare Pages Functions - API 路由
 * 将原 Express 后端迁移到 Workers 环境
 * 使用 KV 存储用户数据和验证码
 */

import bcrypt from 'bcryptjs';

// ====== 配置 ======
const JWT_SECRET = 'cjbx-secret-key-2025';

// ====== 校验工具 ======
const PHONE_REGEX = /^1[3-9]\d{9}$/;
const isValidPhone = (p) => PHONE_REGEX.test(p);
const isValidUsername = (u) => u && u.length >= 2 && u.length <= 16;
const isValidPassword = (p) => p && p.length >= 6;

// ====== JWT 工具 (HS256, 使用 Web Crypto API) ======
async function jwtSign(payload, secret, expiresInSec = 7 * 86400) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const body = { ...payload, iat: now, exp: now + expiresInSec };

  const b64 = (obj) => btoa(JSON.stringify(obj)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
  const signingInput = `${b64(header)}.${b64(body)}`;

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

  const payload = JSON.parse(atob(p.replace(/-/g, '+').replace(/_/g, '/')));
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
  const { phone } = await request.json();
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
  const { username, password, phone, verifyCode: userCode } = await request.json();

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
  const { username, password } = await request.json();
  if (!username || !password) {
    return { code: 400, msg: '请输入用户名和密码' };
  }

  const users = await getUsers(env.APP_DATA);
  const user = users.find(u => u.username === username);
  if (!user) return { code: 400, msg: '用户不存在' };

  let valid;
  try {
    valid = bcrypt.compareSync(password, user.password);
  } catch (e) {
    console.error('[bcrypt.compare error]', e);
    return { code: 500, msg: '密码验证失败: ' + e.message };
  }
  if (!valid) return { code: 400, msg: '密码错误' };

  const token = await jwtSign(
    { id: user.id, username: user.username },
    JWT_SECRET,
    7 * 86400
  );

  return { code: 200, msg: '登录成功', token, username: user.username };
}

// POST /api/resetPassword
async function handleResetPassword(request, env) {
  const { phone, verifyCode: userCode, newPassword } = await request.json();

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
    const decoded = await jwtVerify(token, JWT_SECRET);
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
