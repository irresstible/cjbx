# 一起过新年（cjbx-full）

一个以"新年分享"为主题的前后端全栈示例项目：原生 HTML/CSS/JS 前端 + Node.js 后端，实现了注册、登录、重置密码、个人资料编辑、头像上传裁剪等完整账号体系，并提供 Cloudflare Worker / Pages Functions 两套 Serverless 部署版本。

---

## 一、功能清单

- **首页**：翻转背景图（点击空白处暂停/继续）、点击姓名弹出图片灯箱、登录态导航（头像 + 昵称、退出登录）
- **账号**：手机号 + 短信验证码注册（验证码在后端控制台打印，模拟短信）、登录（**支持用户名或手机号**）、忘记密码重置
- **用户中心**：
  - 个人资料：头像、昵称、账号、手机号、性别、注册时间、个人简介
  - 编辑资料：毛玻璃弹窗修改昵称 / 性别 / 简介；头像支持点击与拖拽上传，前端 Canvas 自动居中裁剪 256×256、JPEG 压缩
  - 账号设置：重置密码入口、帮助中心
- **帮助中心**：原生折叠 FAQ + 联系方式页
- **安全**：密码 bcrypt 加密存储、JWT 鉴权、接口字段白名单更新、头像格式与大小校验、CORS 来源白名单

---

## 二、技术栈

| 层 | 技术 |
|---|---|
| 前端 | 原生 HTML5 / CSS3 / ES Modules（无框架、无构建工具） |
| 后端（本地） | Node.js + Express 4 |
| 鉴权 | jsonwebtoken（JWT，7 天有效期）、bcryptjs 密码加密 |
| 数据存储 | 本地 JSON 文件（`backend/data.json`），写入前自动备份 |
| 验证码 | 内存存储（5 分钟有效，重启失效） |
| Serverless | Cloudflare Worker（KV 存储）/ Cloudflare Pages Functions |
| 部署工具 | Wrangler v4 |

**运行环境要求**：Node.js ≥ 18（开发机实测 Node 24 正常）、npm。

---

## 三、目录结构

```
cjbx-full/
├── frontend/                  # 前端（纯静态，零构建）
│   ├── index.html             # 首页
│   ├── denlu.html             # 登录页
│   ├── zhuce.html             # 注册页
│   ├── wangji.html            # 忘记密码 / 重置密码页
│   ├── user.html              # 用户中心
│   ├── help.html              # 帮助中心
│   ├── css/                   # reset → common(tokens) → forms → 各页样式
│   ├── img/                   # 背景图、头像、灯箱图片
│   └── js/
│       ├── config.js          # API_BASE 等常量
│       ├── storage.js         # localStorage 唯一入口（token/用户名）
│       ├── api.js             # fetch 封装（apiGet/apiPost/apiPut，自动带 Token）
│       ├── ui/                # toast、按钮、表单、弹窗、翻转、头像上传
│       └── pages/             # 每个 page-*.js 对应一个 HTML 页面入口
├── backend/                   # Express 后端
│   ├── server.js              # 入口：CORS、静态托管、路由、错误处理
│   ├── config.js              # 读取 .env（端口 / JWT 密钥 / CORS 白名单）
│   ├── db.js                  # JSON 文件读写（含 .bak 备份与原子写入）
│   ├── routes/auth.js         # 认证与资料全部接口
│   ├── middleware/auth.js     # JWT 校验中间件
│   ├── store/codeStore.js     # 验证码内存存储
│   ├── utils/validator.js     # 手机号/用户名/密码/性别/头像校验
│   ├── .env.example           # 环境变量模板（复制为 .env 后使用）
│   └── data.json              # 运行时生成的用户数据（已被 gitignore）
├── worker/index.js            # Cloudflare Worker 版本（API + 静态资源，KV 存储）
├── functions/api/[[path]].js  # Cloudflare Pages Functions 版本
├── wrangler.toml              # Worker / KV / 路由配置
├── .dev.vars.example          # Wrangler 本地密钥模板（复制为 .dev.vars）
└── package.json               # 根目录仅含 wrangler 依赖（用于部署）
```

---

## 四、本地快速开始

### 方式 A：只用后端 Express（推荐，前后端同源，无跨域问题）

```bash
# 1. 安装后端依赖
cd backend
npm install

# 2. 启动服务（普通模式）
npm start
# 或开发模式（修改代码自动重启）
npm run dev
```

启动后直接访问 **http://localhost:3000** ：Express 会同时托管 `frontend/` 下的页面和 `/api` 接口，页面与接口同源。

> 注册时需要输入短信验证码。验证码不会真正发短信，而是打印在**运行 `npm start` 的终端窗口**里，形如：
> `[模拟短信] 手机号 138xxxx 的验证码: 123456`

### 方式 B：VS Code Live Server 开发前端（5500 端口）

用 Live Server 打开（地址形如 `http://127.0.0.1:5500/frontend/index.html`）时，前端会把接口请求转发到 `http://localhost:3000`，属于跨域，需要：

1. 后端同样在 3000 端口运行；
2. 后端 `.env` 的 `FRONTEND_URL` 已放行 Live Server 地址（默认已配置好，见下文）。

前端 [config.js](frontend/js/config.js) 的规则：`file://`、`localhost`、`127.0.0.1` 打开页面时 API 指向 `http://localhost:3000`；其它域名（线上）则走同源相对路径。

### 环境变量（backend/.env）

后端启动时读取 `backend/.env`。可直接复制仓库中的模板 [backend/.env.example](backend/.env.example) 为 `.env` 再修改：

```bash
cp .env.example .env   # Windows PowerShell: Copy-Item .env.example .env
```

模板内容：

```ini
# 服务端口
PORT=3000

# JWT 密钥：必填的随机强密码（切勿使用示例值）
# 生成方法：node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
JWT_SECRET=请替换为随机字符串

# 前端地址（CORS 白名单，多个用英文逗号分隔；* 表示全部放行）
FRONTEND_URL=http://localhost:5500,http://127.0.0.1:5500
```

> 生产环境（`NODE_ENV=production`）若未设置 `JWT_SECRET`，服务会**直接拒绝启动**；开发环境未设置时使用临时密钥并在控制台打印安全警告。

注意：`localhost` 与 `127.0.0.1` 在浏览器中是**两个不同来源**，用 Live Server 时两种写法都要加进白名单。

---

## 五、接口文档

统一返回 JSON。业务失败 HTTP 状态码多为 200/400，未登录为 401，资源不存在为 404。

| 接口 | 方法 | 鉴权 | 请求体 / 头 | 说明 |
|---|---|---|---|---|
| `/api/sendCode` | POST | 否 | `{ phone }` | 发送验证码（控制台输出） |
| `/api/register` | POST | 否 | `{ username, password, phone, verifyCode }` | 注册 |
| `/api/login` | POST | 否 | `{ username, password }` | 登录，`username` 可填**用户名或手机号**，返回 token |
| `/api/resetPassword` | POST | 否 | `{ phone, verifyCode, newPassword }` | 通过验证码重置密码 |
| `/api/profile` | GET | 是 | 头 `Authorization: Bearer <token>` | 获取当前用户资料（不含密码） |
| `/api/profile` | PUT | 是 | 头同上 + `{ nickname?, gender?, bio?, avatar? }` | 修改资料，字段均可选；`avatar:""` 表示移除头像 |

**字段规则**

- 用户名：2–16 位字符；密码：≥ 6 位；手机号：`1[3-9]` 开头的 11 位
- 昵称：≤ 16 字；个人简介：≤ 100 字；性别枚举：`male` / `female` / `secret`
- 头像：仅接受 `data:image/(jpeg|png|webp);base64,...`，base64 后 ≤ 2MB

**返回示例**

```json
// 成功
{ "code": 200, "msg": "登录成功", "token": "xxx", "username": "modtest" }
// 失败
{ "code": 400, "msg": "用户不存在" }
// 鉴权失败（HTTP 401）
{ "code": 401, "msg": "未登录" }
```

---

## 六、数据存储与备份（重要）

- 用户数据保存在 `backend/data.json`，首次启动自动创建为空库。
- 自当前版本起，[db.js](backend/db.js) 每次写入前会把旧文件复制为 **`data.json.bak`**，并采用"临时文件 + 重命名"原子写入；主文件损坏时读取会自动尝试从 `.bak` 恢复。
- `data.json`、`data.json.bak`、`.env` 均已在 `.gitignore` 中，**不会被提交**。
- 注意：删除 `data.json` 或在其中清空 `users` 数组会导致已有账号无法登录（提示"用户不存在"）。本地演示数据建议定期手动另存备份。
- 该方案仅适合单机演示；多人/生产环境请改用数据库或 Cloudflare KV。

---

## 七、部署到 Cloudflare

仓库提供两套不依赖 Express 的 Serverless 实现，接口逻辑与 Express 版保持一致。

### 1) Cloudflare Worker（worker/index.js，使用 KV）

```bash
# 根目录已含 wrangler 依赖
npm install

# 创建 KV 命名空间（首次），把输出的 id 填入 wrangler.toml
npx wrangler kv namespace create APP_DATA

# 设置 JWT 密钥（加密存储，不会出现在代码/配置文件中；只需设置一次）
npx wrangler secret put JWT_SECRET

# 本地调试（复制 .dev.vars.example 为 .dev.vars，wrangler 会自动读取；格式：JWT_SECRET=xxx）
npx wrangler dev

# 发布
npx wrangler deploy
```

[wrangler.toml](wrangler.toml) 已配置：入口 `worker/index.js`、静态资源目录 `./frontend`、KV 绑定名 `APP_DATA` 及自定义路由。**JWT 密钥不再硬编码在代码中**：线上必须通过 `wrangler secret put JWT_SECRET` 注入，未配置时登录等鉴权接口会返回 500；本地 `wrangler dev` 从根目录 `.dev.vars` 读取。

### 2) Cloudflare Pages Functions（functions/api/[[path]].js）

将 `frontend/` 作为静态站点输出目录、`functions/` 作为 Pages Functions 目录进行构建发布，然后：

1. 在 Pages 项目 **Settings → Functions → KV namespace bindings** 绑定名为 `APP_DATA` 的 KV；
2. 在 **Settings → Environment variables** 添加 `JWT_SECRET`（建议设为加密变量/Secret）；
3. 本地调试同样在根目录放置 `.dev.vars`（`JWT_SECRET=xxx`）。

发布后前端与接口同源，无需 CORS 配置。

---

## 八、常见问题

**Q：启动报 `Error: listen EADDRINUSE :::3000`？**
A：3000 端口已被占用（多半是之前启动的后端还在跑）。
- Windows 查占用：`Get-NetTCPConnection -LocalPort 3000 -State Listen`
- 结束占用进程后重新 `npm start`，或在 `.env` 改 `PORT`。

**Q：页面提示"网络错误"，控制台报 CORS？**
A：页面来源没在后端白名单里。把当前来源（含 `http://` 和端口，注意 localhost 与 127.0.0.1 都要）加入 `backend/.env` 的 `FRONTEND_URL`，重启后端。直接用 http://localhost:3000 访问则天然无跨域。

**Q：登录提示"用户不存在"？**
A：该账号记录不在当前 `data.json` 中（换过目录、文件被清空或重装过依赖都可能）。可尝试从 `data.json.bak` 恢复，或重新注册。也可确认是否误填成了手机号以外的错误账号名——本系统已支持手机号登录。

**Q：改了前端代码浏览器没变化？**
A：静态资源引用带 `?v=日期` 版本号，正常会自动更新；必要时 `Ctrl + F5` 强制刷新。

**Q：验证码收不到？**
A：本项目不接真实短信，验证码只打印在后端终端，5 分钟内有效，且验证成功后立即失效。

---

## 九、生产环境检查清单

- [x] ~~`JWT_SECRET` 硬编码~~ 已修复：三套后端统一从环境变量读取；Express 生产环境缺失即拒绝启动，Worker/Pages 缺失时鉴权接口返回 500；本地随机密钥已写入 `.env` / `.dev.vars`（均不提交）
- [ ] 注意：更换密钥后历史 token 会全部失效，用户重新登录即可
- [ ] 接入真实短信服务商，验证码改用 Redis 等带过期策略的共享存储
- [ ] 登录、发送验证码接口增加频率限制，防止刷接口与暴力破解
- [ ] 用户数据迁移到正式数据库或 KV，并制定备份策略
- [ ] 头像等用户上传文件迁移到对象存储（如 R2 / OSS），不要长期以 base64 入库
- [ ] Token 存储可评估从 localStorage 迁移到 HttpOnly Cookie 以降低 XSS 风险
- [ ] CORS 白名单收敛为正式域名，不要在生产使用 `*`
