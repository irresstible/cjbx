/**
 * 认证相关路由
 */

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config');
const { readData, writeData } = require('../db');
const { setCode, verifyCode } = require('../store/codeStore');
const { isValidPhone, isValidUsername, isValidPassword } = require('../utils/validator');
const { authenticate } = require('../middleware/auth');

// 发送验证码
router.post('/sendCode', (req, res) => {
  const { phone } = req.body;
  if (!isValidPhone(phone)) {
    return res.json({ code: 400, msg: '手机号格式不正确' });
  }
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  setCode(phone, code);
  console.log(`[模拟短信] 手机号 ${phone} 的验证码: ${code}`);
  res.json({ code: 200, msg: '验证码发送成功' });
});

// 注册
router.post('/register', (req, res) => {
  const { username, password, phone, verifyCode: userCode } = req.body;

  if (!isValidUsername(username)) return res.json({ code: 400, msg: '用户名必须是2-16位字符' });
  if (!isValidPassword(password)) return res.json({ code: 400, msg: '密码长度不能少于6位' });
  if (!isValidPhone(phone)) return res.json({ code: 400, msg: '手机号格式不正确' });
  if (!userCode) return res.json({ code: 400, msg: '请输入验证码' });

  // 校验验证码
  const codeResult = verifyCode(phone, userCode);
  if (!codeResult.valid) return res.json({ code: 400, msg: codeResult.msg });

  const data = readData();

  if (data.users.some(u => u.username === username)) {
    return res.json({ code: 400, msg: '用户名已被注册' });
  }
  if (data.users.some(u => u.phone === phone)) {
    return res.json({ code: 400, msg: '该手机号已注册' });
  }

  // 加密密码并保存
  data.users.push({
    id: Date.now(),
    username,
    password: bcrypt.hashSync(password, 10),
    phone,
    createdAt: new Date().toLocaleString()
  });
  writeData(data);

  res.json({ code: 200, msg: '注册成功' });
});

// 登录
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.json({ code: 400, msg: '请输入用户名和密码' });
  }

  const data = readData();
  const user = data.users.find(u => u.username === username);
  if (!user) return res.json({ code: 400, msg: '用户不存在' });

  if (!bcrypt.compareSync(password, user.password)) {
    return res.json({ code: 400, msg: '密码错误' });
  }

  const token = jwt.sign(
    { id: user.id, username: user.username },
    config.jwtSecret,
    { expiresIn: '7d' }
  );
  res.json({ code: 200, msg: '登录成功', token, username: user.username });
});

// 重置密码
router.post('/resetPassword', (req, res) => {
  const { phone, verifyCode: userCode, newPassword } = req.body;

  if (!isValidPhone(phone)) return res.json({ code: 400, msg: '手机号格式不正确' });
  if (!userCode) return res.json({ code: 400, msg: '请输入验证码' });
  if (!isValidPassword(newPassword)) return res.json({ code: 400, msg: '新密码不能少于6位' });

  const codeResult = verifyCode(phone, userCode);
  if (!codeResult.valid) return res.json({ code: 400, msg: codeResult.msg });

  const data = readData();
  const user = data.users.find(u => u.phone === phone);
  if (!user) return res.json({ code: 400, msg: '该手机号未注册' });

  user.password = bcrypt.hashSync(newPassword, 10);
  writeData(data);

  res.json({ code: 200, msg: '密码重置成功' });
});

// 获取用户信息（需登录）
router.get('/profile', authenticate, (req, res) => {
  const data = readData();
  const user = data.users.find(u => u.id === req.user.id);
  if (!user) return res.status(404).json({ code: 404, msg: '用户不存在' });

  const { password, ...userInfo } = user;
  res.json({ code: 200, data: userInfo });
});

module.exports = router;
