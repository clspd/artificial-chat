import { Router } from 'itty-router'
import type { Request, Response } from 'itty-router'
import { handleWebLogin, handleWebLoginByPassword, handleAddUserWeb } from './handlers/auth'
import {
  handleGetChatSessions,
  handleCreateChat,
  handleGetChat,
  handleUpdateChat,
  handleDeleteChat,
} from './handlers/chat'

/**
 * 创建路由器
 */
const router = Router()

/**
 * 中间件：验证用户session
 */
async function authMiddleware(request: Request, env: any) {
  // 如果是登录或注册端点，跳过认证
  if (
    request.url.includes('/weblogin') ||
    request.url.includes('/webLoginByPassword') ||
    request.url.includes('/addUserWeb')
  ) {
    return
  }

  const cookieHeader = request.headers.get('Cookie') || ''
  const cookies = parseCookies(cookieHeader)
  const sessionSecret = cookies['SessionSecret']

  if (!sessionSecret) {
    throw new Error('Unauthorized')
  }

  // 验证session（实现在auth handler中）
  // @ts-ignore
  request.user = { sessionSecret }
}

/**
 * 解析Cookie
 */
function parseCookies(cookieString: string): Record<string, string> {
  const cookies: Record<string, string> = {}
  if (!cookieString) return cookies

  cookieString.split(';').forEach((cookie) => {
    const [name, value] = cookie.trim().split('=')
    if (name && value) {
      cookies[name] = decodeURIComponent(value)
    }
  })

  return cookies
}

/**
 * 路由定义
 */

// 登录相关
router.get('/api/v1/user/weblogin', (request: Request, env: any) =>
  handleWebLogin(request, env, env.DB),
)

router.post('/api/v1/user/webLoginByPassword', (request: Request, env: any) =>
  handleWebLoginByPassword(request, env, env.DB),
)

router.post('/api/v1/user/addUserWeb', (request: Request, env: any) =>
  handleAddUserWeb(request, env, env.DB),
)

// 聊天相关
router.get('/api/v1/chat/sessions', (request: Request, env: any) =>
  handleGetChatSessions(request, env, { username: 'test' }),
)

router.post('/api/v1/chat/chat', (request: Request, env: any) =>
  handleCreateChat(request, env, { username: 'test' }),
)

router.get('/api/v1/chat/chat', (request: Request, env: any) =>
  handleGetChat(request, env, { username: 'test' }),
)

router.patch('/api/v1/chat/chat', (request: Request, env: any) =>
  handleUpdateChat(request, env, { username: 'test' }),
)

router.delete('/api/v1/chat/chat', (request: Request, env: any) =>
  handleDeleteChat(request, env, { username: 'test' }),
)

// 默认404处理
router.all('*', () =>
  new Response('Not found', {
    status: 404,
  }),
)

/**
 * 导出 Worker 处理程序
 */
export default {
  async fetch(request: Request, env: any, ctx: any): Promise<Response> {
    try {
      return await router.handle(request, env, ctx)
    } catch (error: any) {
      console.error('Worker error:', error)

      if (error.message === 'Unauthorized') {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: {
            'Content-Type': 'application/json',
          },
        })
      }

      return new Response(JSON.stringify({ error: 'Internal server error' }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      })
    }
  },
}
