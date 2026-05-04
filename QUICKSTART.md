# 快速开始指南

欢迎使用 **Artificial Chat**！本指南将帮助你快速上手项目。

## 5 分钟快速开始

### 1. 克隆和安装

```bash
# 克隆项目
git clone https://github.com/yourusername/artificial-chat.git
cd artificial-chat

# 安装依赖
pnpm install
```

### 2. 配置环境

```bash
# 复制环境变量模板
cp .env.example .env.local

# 编辑 .env.local，设置你的密钥
# 或使用默认值进行开发测试
```

### 3. 启动开发服务器

```bash
# 两个终端中分别启动前端和后端
# 终端 1: 前端
pnpm web:dev

# 终端 2: 后端
pnpm worker:dev

# 或同时启动两个
pnpm dev
```

### 4. 生成测试邀请码

```bash
# 使用以下命令生成有效的邀请码
node -e "
const jwt = require('jsonwebtoken');
const token = jwt.sign({}, 'your-auth-code-jwt-secret', { expiresIn: '30d' });
console.log('邀请码:', token);
"
```

### 5. 测试应用

1. 打开浏览器访问 `http://localhost:5173`（或构建好后的 Worker URL）
2. 进入注册页面 `/auth/register.html`
3. 使用上面生成的邀请码创建账户
4. 登录后即可开始使用聊天功能

## 项目命令

### 开发命令

```bash
# 启动前端开发服务器
pnpm web:dev

# 启动后端本地测试
pnpm worker:dev

# 同时启动前后端
pnpm dev

# 进行类型检查
pnpm type-check
```

### 构建命令

```bash
# 构建整个项目
pnpm build

# 只构建前端
pnpm web:build

# 只检查构建是否正确
pnpm web:build --mode preview
```

### 部署命令

```bash
# 部署到 Cloudflare Workers
pnpm worker:deploy

# 部署到 Cloudflare Pages（前端）
wrangler pages deploy packages/web/dist --project-name=artificial-chat-web
```

## 文件结构速览

```
packages/
├── web/                     # 前端应用（Vue 3 + Vite）
│   ├── src/               # 源代码
│   ├── auth/              # 登录/注册页面
│   └── index.html         # 主HTML入口
└── worker/                # 后端应用（Cloudflare Workers）
    └── src/              # Worker源代码
        ├── handlers/     # 请求处理器
        ├── services/     # 业务逻辑
        ├── lib/          # 工具函数
        └── durable-objects/ # 实时通信
```

## 常见问题

### Q: 如何改变密钥？

编辑 `wrangler.toml` 中的 `[vars]` 部分，或使用：

```bash
wrangler secret put AUTH_CODE_JWT_SECRET
```

### Q: WebSocket 连接失败怎么办？

1. 检查 Worker 是否在运行：`pnpm worker:dev`
2. 确认 URL 正确：`ws://localhost:8787/api/v1/chat/connect`
3. 查看浏览器控制台（F12）中的具体错误信息

### Q: 如何调试数据库？

```bash
# 连接到D1数据库
wrangler d1 execute artificial-chat --command="SELECT * FROM users"

# 查看所有表
wrangler d1 execute artificial-chat --command=".tables"
```

### Q: 如何在 VS Code 中调试？

创建 `.vscode/launch.json`：

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Worker Debug",
      "runtimeArgs": ["run", "worker:dev"],
      "runtimeExecutable": "pnpm",
      "console": "integratedTerminal"
    }
  ]
}
```

## 代码示例

### 登录

```typescript
// 前端
const passwordHash = await sha256(password)
const response = await fetch('/api/v1/user/webLoginByPassword', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username, password: passwordHash, remember })
})

// 后端自动验证并设置 SessionSecret Cookie
```

### 发送消息

```typescript
// 通过 WebSocket 发送消息
const ws = new WebSocket(`ws://localhost:8787/api/v1/chat/connect?chat_id=${chatId}`)
ws.send(JSON.stringify({
  type: 'send',
  content: { role: 'USER', text: '你好' }
}))
```

### 调用 API

```typescript
// 前端
import { fetchChatSessions, createChat } from '@/api/chat'

const sessions = await fetchChatSessions()
const newChat = await createChat()
```

## 扩展应用

### 添加新的 API 端点

1. 在 `packages/worker/src/handlers/` 中创建处理器
2. 在 `packages/worker/src/index.ts` 中注册路由
3. 在前端 `packages/web/src/api/` 中创建调用函数

### 添加新的 Vue 组件

1. 在 `packages/web/src/components/` 中创建 `.vue` 文件
2. 在需要的地方导入和使用
3. 确保添加必要的分类注释和类型定义

### 修改数据库架构

1. 编辑 `packages/worker/src/db/schema.ts`
2. 创建迁移脚本
3. 使用 `wrangler d1 execute` 执行迁移

## 检查清单

### 开发前检查
- [ ] Node.js 18+ 已安装
- [ ] pnpm 已安装
- [ ] 项目依赖已安装 (`pnpm install`)
- [ ] 环境变量已配置
- [ ] 邀请码已生成

### 开发中检查
- [ ] 前端服务正在运行
- [ ] Worker 服务正在运行
- [ ] 代码通过 TypeScript 检查
- [ ] 没有 console 错误
- [ ] 网络请求成功

### 部署前检查
- [ ] 代码已构建 (`pnpm build`)
- [ ] 测试已通过
- [ ] 环境变量已设置
- [ ] D1 数据库已初始化
- [ ] 域名已配置（如使用自定义域名）

## 获取帮助

- 📖 [完整文档](./README.md)
- 🚀 [部署指南](./DEPLOYMENT.md)
- 🔧 [开发指南](./SETUP.md)
- ♿ [可访问性指南](./A11Y.md)
- ✅ [项目总结](./PROJECT_SUMMARY.md)

## 反馈和贡献

发现问题？有改进建议？
- 提交 Issue: [GitHub Issues](https://github.com/yourusername/artificial-chat/issues)
- 提交 PR: [GitHub PRs](https://github.com/yourusername/artificial-chat/pulls)

---

**现在开始开发吧! 🚀**
