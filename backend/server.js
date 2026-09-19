const path = require('path');
const express = require('express');
const cors = require('cors');
const config = require('./config');
const authRouter = require('./routes/auth');

const app = express();

// ====== 中间件 ======
app.use(cors({ origin: config.frontendUrl }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// 托管前端静态文件（生产部署时，将 frontend 目录放到后端同级或直接合并）
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// ====== API 路由 ======
app.use('/api', authRouter);

// ====== 所有非 API 路由回退到 index.html（支持前端路由） ======
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

// ====== 404 处理 ======
app.use((req, res) => {
  res.status(404).json({ code: 404, msg: '接口不存在' });
});

// ====== 全局错误处理 ======
app.use((err, req, res, next) => {
  console.error('[服务器错误]', err.message);
  res.status(500).json({ code: 500, msg: '服务器内部错误' });
});

// ====== 启动服务 ======
app.listen(config.port, () => {
  console.log('=================================');
  console.log(`  后端服务启动成功！端口: ${config.port}`);
  console.log(`  前端静态文件: ${path.join(__dirname, '..', 'frontend')}`);
  console.log('  接口:');
  console.log('    POST /api/sendCode     发送验证码');
  console.log('    POST /api/register     注册');
  console.log('    POST /api/login        登录');
  console.log('    POST /api/resetPassword 重置密码');
  console.log('    GET  /api/profile      获取用户信息（需登录）');
  console.log('=================================');
});
