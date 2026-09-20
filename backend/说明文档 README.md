# 后端服务说明

完整的项目介绍、安装步骤、接口文档与部署指南，请查看项目根目录的 **[README.md](../../README.md)**。

## 速查

```bash
# 在 backend 目录下
npm install      # 安装依赖
npm start        # 启动（http://localhost:3000）
npm run dev      # 开发模式（文件改动自动重启）
```

- 配置：复制/编辑本目录下的 `.env`（`PORT`、`JWT_SECRET`、`FRONTEND_URL`）
- 数据：`data.json`（自动备份为 `data.json.bak`），均不提交 git
- 注册验证码：打印在运行服务的终端窗口（模拟短信，不真正发送）
- 技术栈：Node.js + Express + JWT + bcryptjs，数据存储为本地 JSON 文件（非 SQLite）
