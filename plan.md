实现一个这样的项目。

## 项目技术栈：
前端： Vue 3 最新稳定版本 + Vite 8 + ant design vue 组件库 + Hash 模式的路由，typescript
后端： Cloudflare Workers & Pages ，使用 D1 存储用户数据，使用 Durable Objects 实现实时聊天，“/api/”下所有的路径都由worker处理，合理规划项目结构
包管理：使用 Node.js + pnpm 而不是 Bun
分发和发布：使用 cloudflare wrangler CLI
用户数据：包括用户名，密码（加盐、哈希化），用户的关联session的secret
语言：网站使用 i18next + i18next-vue 实现国际化；需要合适的 a11y 可访问性。表单需要设置合适的name和autocomplete；辅助性元素需要设置合适的role和aria-属性。

## 项目概述：
artificial chat，
是一个网站。

访问首页：先检查 localStorage 中是否有 "user::isLoggedIn" ，如果没有则直接跳转登录中间页（/api/v1/user/weblogin）。有的话就正常加载应用程序。

登录中间页（worker处理）：检查cookie“SessionSecret”（Httponly,Secure,Samesite=Lax,MaxAge=(14天 if 记住密码 else 不设置maxage(会话级别cookie))），这个jwt是用户的session凭据，包含用户名数据，验证方法：先 decode 看 decoded.payload.username ，然后查 D1 的 users 数据库看对应的用户信息中关联 SECRET ，最后使用这个secret验证，如果不存在指定用户那么视为失败。如果jwt验证失败或者不存在这个cookie那么返回 307 到 /auth/login.html ；如果jwt验证成功（这是一个有效的jwt）那么返回一个非常简单的HTML页面：header中设置CSP：default-src 'none'; script- 使用随机nonce；页面内容：`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Redirecting</title></head><body><script nonce="安全nonce">localStorage.setItem('user::isLoggedIn','true');location.href='/'</script></body></html>`

登录页：位于 /auth/login.html ，是一个使用 vite 的多入口点模式创建的单独入口点页面。这个页面有一个用户名、密码输入框，一个“记住密码”输入框（控制'SessionSecret'的MaxAge是否设置）。然后一个“登录”按钮。还有一个“注册”链接指向注册页面（/auth/register.html）。登录页面是一个JavaScript表单。它使用JavaScript处理逻辑（而不是纯HTML表单）。逻辑是：表单submit事件，preventDefault,然后把密码先在客户端进行一次 SHA256 处理（这次不加盐），接着 fetch('/api/v1/user/webLoginByPassword', 数据)。请求方法：POST，body：{"username":"用户名","password":"SHA256后的用户输入"}。然后进入服务器处理流程。如果返回 200 那么 location.href='/'；否则前端使用antdesign的message组件显示错误信息。

访问注册页面 ：页面显示输入框“用户名”、“密码”、“请输入邀请码”和一个“继续”按钮，点击继续，JavaScript拦截并处理表单（和登录差不多），JavaScript中 POST 到 /api/v1/user/addUserWeb ，body：{"username":"用户名","password":"SHA256后的用户输入","code":"用户输入的邀请码"}，worker拿到这个邀请码使用 env.AUTH_CODE_JWT_SECRET 进行检查。检查失败：直接返回 403 {"success":false,"code":403,"error":"Invalid auth code"}。检查成功：继续检查 username 是不是已经存在；如果存在那么返回409 {"success":false,"code":409,"error":"User already exists"}：否则完成注册流程，写入数据库，返回201 Created ，body：{"success":true}。前端拿到结果判断是否成功，失败则使用Modal显示错误弹窗（而不是message）；成功则显示“注册成功！”并转到登录页面

登录之后主页的流程：主页是一个标准的 AI 聊天应用程序的布局，结构：<vue-app></vue-app> 是 HTML 页面中的占位符，然后 src/main.ts 把应用程序挂载到 “vue-app” 自定义元素上。Vue 的 App 组件：包含 <div class="app-main-app"> 作为所有内容的根；然后这下面放更多内容，比如section、main等。左边有侧边栏（在小屏幕设备上抽屉），可以展开或收起；右边是主要的聊天区域。侧边栏中flex布局，上面是“新对话”按钮，下面是历史对话。

需要设计这样的 API ：

- /api/v1/chat/sessions ：获取历史聊天记录。我们先简化处理，这个接口直接返回用户的所有历史对话；
- /api/v1/chat/chat?chat_id={}：这是一个 RESTful 接口。直接 POST 这个接口（不带 chat_id），效果是创建新的对话，返回 {"success":true,"chat_id":"一个UUID"}；GET 这个接口，返回对话的基本信息，包含name和stat；patch它可以更新对话信息，比如更新name；stat不可以更新，即使传入了也忽略；DELETE 这个接口则删除对应的对话，根据对话是否存在返回404 Not Found或202 Accepted。

websocket接口：
- /api/v1/chat/connect?chat_id={} ：这是一个 websocket 接口，使用 Durable Objects 构建，在连接上的时候返回 {"type":"history_messages","content":符合Conversation接口的对象}；然后用户发送消息表现为 {"type":"send","content":一个role:MessageRole.User的Message}，AI生成内容表现为 {"type":"patch","v":{一个自定义patch语法}}，我们在下面详细说明

AI生成内容：
首先，创建一个新的message，role为assistant。然后，把这个message添加到conversation的content中。此时给客户端发{type:patch,v:{p/*path*/:'content/content',o/*operation*/:'PUSH','v':一个Message}}
然后因为AI是流式生成响应嘛，我们每生成一个新的token就返回一个{type:patch,v:{p:`content/content/${新的message在content数组中的index}/fragments/-1/content`,o:'APPEND'/*字符串用append*/,v:'生成内容'}}
生成完成之后同样通过PATCH，完成这条消息并更新相关状态

我们目前先不实现接入实际的AI/LLM，先创建一个模拟层模拟生成响应。模拟层这样做：等待2秒，然后输出“The server is busy. Please try again later.”

**邀请码**是个JWT，它使用环境变量中的值进行签名，服务器只需要验证code使用环境变量中预留的值verify是否通过，通过就认为有效

登录流程，密码到后端之后直接使用预留的SALT进行PBKDF2。注册流程或者改密码也就是随机生成一个SALT并PBKDF2，保存hash到D1中。必须符合安全实践。


## 数据结构示例：

```typescript
// ============================================================
// Schema
// ============================================================

export enum SchemaVersion {
    V1 = 1,
}

// ============================================================
// Message roles & statuses
// ============================================================

export enum MessageRole {
    User = 'USER',
    Assistant = 'ASSISTANT',
    System = 'SYSTEM',
    Tool = 'TOOL',
    ToolResult = 'TOOL_RESULT',
}

export enum MessageStatus {
    Finished = 'FINISHED',
    WIP = 'WIP',
    Error = 'ERROR',
    Interrupted = 'INTERRUPTED',
}

export enum MessageFeedback {
    NotProvided = '',
    Positive = '+',
    Negative = '-',
}

// ============================================================
// Message fragments
// ============================================================

export enum MessageFragmentType {
    TextFragment = 'text',
}

export enum MessageContentType {
    Text = 'text',
}

export type MessageContent<T extends MessageContentType> = T extends MessageContentType.Text
    ? string
    : never;

export interface MessageFragment {
    id: number;
    type: MessageFragmentType;
    ts: number;
    elapsed?: number;
    first_token_latency?: number;
    contentType: MessageContentType;
    content: MessageContent<this['contentType']>;
}

// ============================================================
// Message features
// ============================================================

export enum MessageFeatureType {
    Thinking = 'thinking',
    MaxTokensLimit = 'max_tokens_limit',
    BanEdit = 'ban_edit',
    BanRegenerate = 'ban_regenerate',
}

export type MessageFeatureValue = boolean | string | number;

export interface MessageFeatureItem {
    type: MessageFeatureType;
    value: MessageFeatureValue;
}

// ============================================================
// Attachments & usage
// ============================================================

export interface FileAttachmentInfo {
    id: string;
    name: string;
    type: string;
    size: number;
    hash: string;
    path: string;
}

export interface MessageUsage {
    total_tokens: number;
}

// ============================================================
// Message
// ============================================================

export interface Message {
    id: number;
    parent_id: number | null;
    role: MessageRole;
    ts: number;

    features?: MessageFeatureItem[];
    feedback?: MessageFeedback;
    usage?: MessageUsage;

    status: MessageStatus;
    files: FileAttachmentInfo[];
    fragments: MessageFragment[];
    has_pending_fragment: boolean;
}

// ============================================================
// MessageContainer
// ============================================================

export interface MessageContainer {
    name: string;
    content: Message[];
}

// ============================================================
// Conversation
// ============================================================

export interface ConversationStatus {
    created_at: number;
    updated_at: number;
}

export interface Conversation {
    schemaVersion: SchemaVersion;
    appid: string;
    name: string;
    stat: ConversationStatus;
    history: MessageContainer[];
    content: MessageContainer;
}

```

## D1 表结构

1. 登录/注册前端逻辑
​
- 前端输入原始密码 → 前端先做一次 SHA256
​
- 网络请求只传 SHA256 摘要，杜绝明文密码在网络传输
​
2. 后端入库逻辑
​
- 收到前端发来的 SHA256 结果 不能直接存
​
- 后端必须单独生成随机盐 + 再哈希一次 再入库
​
- 数据库存的是： salt + 加盐后的最终哈希 
​
3. 邀请码
​
- 就是一个 JWT
​
- 只用  env.AUTH_CODE_JWT_SECRET  verify 合法性
​
- 不需要任何 D1 表存邀请码、不记录使用、不做任何库存
​
4. 聊天会话/Conversation/消息
​
- 全部放 Durable Objects 托管
​
- D1 完全不存任何聊天相关数据
​
5. D1 只保留唯一一张 users 表
​
- 存用户名、随机盐、加盐最终哈希、用户独立 session_secret

CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,

    -- 后端单独生成的随机盐
    salt TEXT NOT NULL,
    -- 流程：前端SHA256 → 后端拿salt二次哈希 → 存在这里
    password TEXT NOT NULL,

    -- 该用户专属密钥：用来校验自己的 Session JWT；用户做“登出所有设备”的时候其实就是刷新这个字段
    user_secret TEXT NOT NULL,

    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER DEFAULT (strftime('%s', 'now'))
);

CREATE UNIQUE INDEX idx_users_username ON users(username);



