# 一起过新年 - 后端服务

## 技术栈
Node.js + Express + SQLite + JWT + bcrypt

## 快速启动

### 1. 安装依赖
```bash
cd backend
npm install
```

### 2. 启动服务
```bash
# 普通启动
npm start

# 开发模式（自动重启）
npm run dev
```

### 3. 访问
服务运行在 http://localhost:3000

## 接口列表

| 接口 | 方法 | 请求参数 | 说明 |
|------|------|---------|------|
| /api/sendCode | POST | `{ phone }` | 发送验证码（控制台打印） |
| /api/register | POST | `{ username, password, phone, verifyCode }` | 注册 |
| /api/login | POST | `{ username, password }` | 登录，返回 token |
| /api/resetPassword | POST | `{ phone, verifyCode, newPassword }` | 重置密码 |
| /api/profile | GET | Header: `Authorization: Bearer <token>` | 获取用户信息 |

## 返回格式
```json
{ "code": 200, "msg": "成功", "data": {} }
```
- code: 200 成功，400 失败，401 未登录

## 前端对接
把前端 JS 里的 `http://localhost:3000` 改成你的后端地址即可。

## 注意事项
- 验证码存在内存里，重启服务后失效（演示用）
- 生产环境请用 Redis 存储验证码，接入真实短信服务商
- JWT_SECRET 请改成随机字符串，放环境变量
