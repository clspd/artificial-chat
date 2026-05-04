# 项目设置指南

## 1. 前置条件

- Node.js 18+ 和 pnpm
- Cloudflare 账户（用于Worker和D1部署）
- wrangler CLI（`npm install -g wrangler`）

## 2. 本地开发设置

### 2.1 安装依赖

```bash
cd /workspaces/artificial-chat
pnpm install
```

### 2.2 创建本地环境变量

复制 `.env.example` 到 `.env.local` 并填入你的密钥：

```bash
cp .env.example .env.local
```

编辑 `.env.local`：
```
AUTH_CODE_JWT_SECRET=your-secret-key-here
SESSION_JWT_SECRET=your-session-secret-here
Password_SALT_PREFIX=your-salt-prefix-here
```

### 2.3 配置 Cloudflare

编辑 `wrangler.toml`：

```toml
account_id = "YOUR_ACCOUNT_ID"

[[d1_databases]]
database_name = "artificial-chat"
database_id = "YOUR_DATABASE_ID"
```

获取这些值：

1. 登录 Cloudflare 控制面板
2. 在 Workers & Pages 中查看你的账户ID
3. 创建D1数据库并获取其ID

### 2.4 初始化数据库

```bash
# 使用 wrangler 初始化数据库
pnpm worker:dev

# 在另一个终端中运行迁移
wrangler d1 execute artificial-chat --file=packages/worker/src/db/schema.ts
```

## 3. 开发流程

### 3.1 启动开发服务器

```bash
# 启动前端和Worker
pnpm dev
```

或分开启动：

```bash
# 终端1：前端
pnpm web:dev

# 终端2：Worker
pnpm worker:dev
```

### 3.2 生成测试邀请码

```bash
# 生成一个有效的邀请码JWT（在本地使用）
node -e "
const jwt = require('jsonwebtoken');
const token = jwt.sign({}, 'your-auth-code-jwt-secret', { expiresIn: '30d' });
console.log(token);
"
```

### 3.3 测试登录流程

1. 访问 `http://localhost:8787/auth/register.html`
2. 使用上面生成的邀请码创建账户
3. 访问 `http://localhost:8787/auth/login.html` 登录

## 4. 构建和部署

### 4.1 本地构建

```bash
pnpm build
```

### 4.2 部署到 Cloudflare

```bash
pnpm worker:deploy
```

## 5. 项目结构详解

### 前端 (`packages/web`)

- **src/main.ts** - Vue应用入口
- **src/App.vue** - 主应用组件
- **src/components/** - Vue组件
- **src/api/** - API调用模块
- **src/lib/** - 工具函数（WebSocket等）
- **src/types/** - TypeScript类型定义
- **auth/** - 登录/注册页面
- **vite.config.ts** - Vite配置

### 后端 (`packages/worker`)

- **src/index.ts** - Worker入口，路由定义
- **src/handlers/** - 请求处理器
- **src/services/** - 业务逻辑
- **src/lib/** - 工具函数（加密、JWT等）
- **src/durable-objects/** - Durable Objects实现
- **src/db/** - 数据库相关

## 6. 环境变量说明

| 变量 | 用途 | 示例 |
|------|------|------|
| AUTH_CODE_JWT_SECRET | 邀请码JWT密钥 | `your-secret-123` |
| SESSION_JWT_SECRET | Session JWT密钥 | `session-secret-456` |
| Password_SALT_PREFIX | 密码盐前缀 | `salt-prefix-789` |

## 7. 常见问题

### Q: WebSocket连接失败
A: 确保Worker正在运行，且URL正确。检查浏览器控制台输出获取详细错误信息。

### Q: 数据库连接错误
A: 检查 `wrangler.toml` 中的 `database_id` 和 `account_id` 是否正确。

### Q: 邀请码验证失败
A: 确保生成邀请码时使用的 `AUTH_CODE_JWT_SECRET` 与 `wrangler.toml` 中的值一致。

## 8. 性能优化建议

1. **前端**
   - 启用Vite的代码分割
   - 使用WebSocket代替长轮询
   - 实现消息虚拟化（对大量消息）

2. **后端**
   - 使用Durable Objects缓存热数据
   - 实现API速率限制
   - 优化D1查询

## 9. 安全检查清单

- [ ] 更新所有环境变量密钥
- [ ] 启用HTTPS
- [ ] 配置CORS策略
- [ ] 实现请求验证和错误处理
- [ ] 定期更新依赖
- [ ] 监控日志和错误
