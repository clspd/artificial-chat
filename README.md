# Artificial Chat

一个基于 Vue 3 和 Cloudflare Workers 的 AI 聊天应用程序。

## 项目技术栈

### 前端
- **框架**: Vue 3 最新稳定版本
- **构建工具**: Vite 8
- **组件库**: Ant Design Vue
- **路由**: Vue Router (Hash 模式)
- **语言**: TypeScript
- **国际化**: i18next + i18next-vue
- **包管理**: Node.js + pnpm

### 后端
- **Serverless**: Cloudflare Workers & Pages
- **数据库**: Cloudflare D1
- **实时聊天**: Durable Objects
- **API**: RESTful 架构 + WebSocket

### 项目结构

```
artificial-chat/
├── packages/
│   ├── web/                    # 前端应用
│   │   ├── src/
│   │   │   ├── components/     # Vue组件
│   │   │   ├── pages/          # 页面脚本
│   │   │   ├── api/            # API调用
│   │   │   ├── router/         # 路由配置
│   │   │   ├── i18n/           # 国际化
│   │   │   ├── types/          # TypeScript类型
│   │   │   └── main.ts         # 入口文件
│   │   ├── auth/               # 认证页面
│   │   │   ├── login.html      # 登录页
│   │   │   └── register.html   # 注册页
│   │   ├── index.html          # 主页面
│   │   ├── vite.config.ts      # Vite配置
│   │   └── package.json
│   │
│   └── worker/                 # Cloudflare Worker
│       ├── src/
│       │   ├── handlers/       # 请求处理器
│       │   │   ├── auth.ts     # 认证处理
│       │   │   └── chat.ts     # 聊天处理
│       │   ├── services/       # 业务逻辑
│       │   ├── lib/            # 工具函数
│       │   ├── db/             # 数据库相关
│       │   ├── durable-objects/ # DO实现
│       │   └── index.ts        # Worker入口
│       ├── tsconfig.json
│       └── package.json
│
├── wrangler.toml               # Cloudflare配置
├── pnpm-workspace.yaml         # pnpm工作区配置
├── package.json                # 根package.json
└── tsconfig.json               # 根TypeScript配置
```

## 功能特性

### 用户认证
- 用户注册和登录
- 基于JWT的会话管理
- 密码加盐和PBKDF2加密
- 邀请码验证

### 聊天功能
- 创建和管理聊天会话
- 实时消息传输(WebSocket)
- 流式AI响应生成
- 聊天历史记录

### 访问性和国际化
- ARIA标签和角色支持
- i18next国际化支持
- 表单可访问性(name, autocomplete)
- 响应式设计

## 快速开始

### 安装依赖
```bash
pnpm install
```

### 开发模式
```bash
# 启动前端开发服务器
pnpm web:dev

# 启动Worker开发服务器
pnpm worker:dev

# 或同时启动两者
pnpm dev
```

### 构建项目
```bash
pnpm build
```

### 部署
```bash
pnpm worker:deploy
```

## 环境变量配置

### Worker环境变量 (wrangler.toml)
```toml
[vars]
AUTH_CODE_JWT_SECRET = "your-auth-code-jwt-secret"
SESSION_JWT_SECRET = "your-session-jwt-secret"
Password_SALT_PREFIX = "your-password-salt-prefix"
```

## API 端点

### 认证相关
- `GET /api/v1/user/weblogin` - 登录中间页
- `POST /api/v1/user/webLoginByPassword` - 处理登录
- `POST /api/v1/user/addUserWeb` - 处理注册

### 聊天相关
- `GET /api/v1/chat/sessions` - 获取聊天记录
- `POST /api/v1/chat/chat` - 创建新聊天
- `GET /api/v1/chat/chat?chat_id={}` - 获取聊天详情
- `PATCH /api/v1/chat/chat?chat_id={}` - 更新聊天
- `DELETE /api/v1/chat/chat?chat_id={}` - 删除聊天
- `WS /api/v1/chat/connect?chat_id={}` - WebSocket连接

## 数据库架构

### users 表
```sql
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    salt TEXT NOT NULL,
    password TEXT NOT NULL,
    user_secret TEXT NOT NULL,
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER DEFAULT (strftime('%s', 'now'))
);
```

## 安全实践

1. **密码处理**
   - 前端: SHA256哈希
   - 后端: 生成盐 + PBKDF2二次哈希

2. **Session管理**
   - HttpOnly Cookie存储Session JWT
   - Secure标志(HTTPS)
   - SameSite=Lax防护

3. **邀请码**
   - JWT格式
   - 使用环境变量密钥验证

## 许可证

MIT
