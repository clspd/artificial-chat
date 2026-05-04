# 部署指南

本文档指导如何将 Artificial Chat 应用部署到 Cloudflare。

## 前置准备

1. **Cloudflare 账户**
   - 注册: https://dash.cloudflare.com/sign-up
   - 设置域名（或使用workers.dev子域）

2. **wrangler CLI**
   ```bash
   npm install -g wrangler
   wrangler login
   ```

3. **获取账户信息**
   ```bash
   wrangler whoami
   ```

## 步骤 1: 配置 wrangler.toml

编辑 `wrangler.toml` 文件：

```toml
name = "artificial-chat"
main = "packages/worker/src/index.ts"
compatibility_date = "2024-05-04"

# 填入你的账户ID（从 wrangler whoami 获取）
account_id = "YOUR_ACCOUNT_ID"

# Workers 开发域名
workers_dev = true

# 生产环境路由（可选，需要付费）
[env.production]
routes = [
  { pattern = "yourdomain.com/api/*", zone_id = "YOUR_ZONE_ID" }
]

# D1 数据库配置
[[d1_databases]]
binding = "DB"
database_name = "artificial-chat"
database_id = "YOUR_DATABASE_ID"
preview_database_id = "YOUR_PREVIEW_DATABASE_ID"

# Durable Objects 配置
[[durable_objects.bindings]]
name = "CHAT_SESSION"
class_name = "ChatSession"

# 环境变量
[vars]
AUTH_CODE_JWT_SECRET = "your-secret-key"
SESSION_JWT_SECRET = "your-session-secret"
Password_SALT_PREFIX = "your-salt-prefix"
```

## 步骤 2: 创建 D1 数据库

### 2.1 创建数据库

```bash
wrangler d1 create artificial-chat
```

命令会返回数据库ID，复制到 `wrangler.toml` 中的 `database_id`。

### 2.2 初始化数据库表

```bash
# 创建 sqlite 文件
cat > migration.sql << 'EOF'
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    salt TEXT NOT NULL,
    password TEXT NOT NULL,
    user_secret TEXT NOT NULL,
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER DEFAULT (strftime('%s', 'now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users(username);
EOF

# 执行迁移
wrangler d1 execute artificial-chat --file=migration.sql
```

### 2.3 验证表创建

```bash
wrangler d1 execute artificial-chat --command="SELECT * FROM users"
```

## 步骤 3: Durable Objects 配置

### 3.1 创建 Durable Object

在 `wrangler.toml` 中已经配置了，现在需要迁移脚本：

```bash
# 创建迁移文件
cat > durable-objects-migration.mjs << 'EOF'
export default {
  async up(migration) {
    migration.add("ChatSession", {
      className: "ChatSession",
    });
  },

  async down(migration) {
    migration.delete("ChatSession");
  },
};
EOF

# 执行迁移（可选，某些版本不需要）
```

## 步骤 4: 部署前端

### 4.1 构建前端

```bash
pnpm web:build
```

构建输出会放在 `packages/web/dist/` 目录。

### 4.2 配置 Pages

前端可以通过 Cloudflare Pages 部署：

```bash
# 安装 Pages CLI（可选）
npm install -g wrangler

# 使用 wrangler 部署
wrangler pages deploy packages/web/dist --project-name=artificial-chat-web
```

或在 Cloudflare 控制面板手动关联 GitHub 仓库。

## 步骤 5: 部署 Worker

### 5.1 构建 Worker

```bash
pnpm build
```

### 5.2 部署

```bash
# 部署开发环境
pnpm worker:deploy

# 或指定环境
wrangler deploy --env production
```

### 5.3 验证部署

```bash
# 使用 workers.dev 域名测试
curl https://artificial-chat.YOUR_ACCOUNT.workers.dev/api/v1/user/weblogin
```

## 步骤 6: 环境变量管理

### 6.1 设置生产环境变量

```bash
# 通过命令行
wrangler secret put AUTH_CODE_JWT_SECRET
wrangler secret put SESSION_JWT_SECRET
wrangler secret put Password_SALT_PREFIX

# 或编辑 wrangler.toml
[env.production.vars]
AUTH_CODE_JWT_SECRET = "production-secret"
SESSION_JWT_SECRET = "production-session-secret"
Password_SALT_PREFIX = "production-salt"
```

### 6.2 验证变量

```bash
wrangler secret list
```

## 步骤 7: 域名关联（可选）

### 7.1 关联自定义域名

```bash
# 使用 wrangler 关联域名
wrangler route add yourdomain.com/api '*' --zone-id YOUR_ZONE_ID

# 或在 Cloudflare 控制面板 → Workers Routes 中添加
```

### 7.2 SSL/TLS 配置

在 Cloudflare 控制面板中自动处理，确保 SSL 模式设置为"完全"或"完全（严格）"。

## 步骤 8: 监控和日志

### 8.1 查看日志

```bash
# 实时日志
wrangler tail artificial-chat

# 或查看所有日志
wrangler logs
```

### 8.2 设置告警（可选）

在 Cloudflare 控制面板中配置告警规则。

## 故障排查

### 问题 1: 数据库连接错误

```
Error: D1_ERROR: database binding not found
```

**解决方案**: 检查 `wrangler.toml` 中的数据库配置。

### 问题 2: Durable Objects 错误

```
Error: Unable to find Durable Object binding
```

**解决方案**: 确保在 `wrangler.toml` 中正确配置了 Durable Objects 绑定。

### 问题 3: CORS 错误

**解决方案**: 在 Worker 中添加 CORS 头：

```typescript
const response = new Response(body, { status })
response.headers.set('Access-Control-Allow-Origin', '*')
response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH')
response.headers.set('Access-Control-Allow-Headers', 'Content-Type')
return response
```

### 问题 4: 邀请码失效

**解决方案**: 确保生成邀请码时使用的密钥与 `AUTH_CODE_JWT_SECRET` 一致。

## 性能优化

### 1. 启用缓存

```typescript
response.headers.set('Cache-Control', 'public, max-age=3600')
```

### 2. 启用 Gzip 压缩

由 Cloudflare 自动处理。

### 3. 使用 KV 存储（可选）

```bash
# 创建 KV 命名空间
wrangler kv:namespace create "CACHE"
```

### 4. 监控性能指标

在 Cloudflare 控制面板中查看：
- 请求速率
- 错误率
- 响应时间

## 回滚部署

```bash
# 查看部署历史
wrangler rollback

# 回滚到上一个版本
wrangler rollback --version <VERSION_ID>
```

## 文章参考

- [Cloudflare Workers 文档](https://developers.cloudflare.com/workers/)
- [D1 数据库文档](https://developers.cloudflare.com/d1/)
- [Durable Objects 文档](https://developers.cloudflare.com/workers/platform/durable-objects/)
- [Pages 部署文档](https://developers.cloudflare.com/pages/)

## 安全最佳实践

1. **保护密钥**
   - 使用 `wrangler secret` 存储敏感数据
   - 不要在代码中硬编码密钥

2. **启用 WAF**
   - 在 Cloudflare 控制面板启用 Web 应用防火墙

3. **速率限制**
   - 实现 API 速率限制防止滥用

4. **监控日志**
   - 定期检查访问日志
   - 设置告警规则

## 持续集成/持续部署 (CI/CD)

### GitHub Actions 示例

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - uses: pnpm/action-setup@v2
        with:
          version: 8

      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'pnpm'

      - run: pnpm install

      - run: pnpm build

      - run: pnpm worker:deploy
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
```
