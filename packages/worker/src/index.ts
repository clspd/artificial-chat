import { AutoRouter, IRequest } from 'itty-router'
import { handleWebLogin, handleWebLoginByPassword, handleAddUserWeb } from './handlers/auth'
import { handleGetChatSessions, handleChat } from './handlers/chat'
import { validateSession } from './services/user'
import { ChatSession } from './durable-objects/chat-session'
import { SCHEMA_SQL } from './db/schema'

export { ChatSession }

let schemaInitialized = false

async function ensureSchema(db: D1Database) {
  if (schemaInitialized) return
  await db.exec(SCHEMA_SQL)
  schemaInitialized = true
}

interface Env {
  DB: D1Database
  ASSETS: { fetch: (request: Request) => Promise<Response> }
  AUTH_CODE_JWT_SECRET: string
  SESSION_JWT_SECRET: string
  CHAT_SESSION: DurableObjectNamespace
}

async function authMiddleware(request: IRequest, env: Env) {
  const cookieHeader = request.headers.get('Cookie') || ''
  const cookies = parseCookies(cookieHeader)
  const token = cookies.SessionSecret

  if (!token) {
    return new Response('Unauthorized', { status: 401 })
  }

  const user = await validateSession(env.DB, token, env.SESSION_JWT_SECRET)
  if (!user) {
    return new Response('Unauthorized', { status: 401 })
  }

  ;(request as any).username = user.username
}

function parseCookies(header: string): Record<string, string> {
  const result: Record<string, string> = {}
  for (const pair of header.split(';')) {
    const idx = pair.indexOf('=')
    if (idx > 0) {
      result[pair.slice(0, idx).trim()] = pair.slice(idx + 1).trim()
    }
  }
  return result
}

const router = AutoRouter()

// Auth routes
router.get('/api/v1/user/weblogin', handleWebLogin)
router.post('/api/v1/user/webLoginByPassword', handleWebLoginByPassword)
router.post('/api/v1/user/addUserWeb', handleAddUserWeb)

// Chat REST routes (auth required)
router.get('/api/v1/chat/sessions', authMiddleware, handleGetChatSessions)
router.post('/api/v1/chat/chat', authMiddleware, handleChat)
router.get('/api/v1/chat/chat', authMiddleware, handleChat)
router.patch('/api/v1/chat/chat', authMiddleware, handleChat)
router.delete('/api/v1/chat/chat', authMiddleware, handleChat)

// WebSocket
router.get('/api/v1/chat/connect', authMiddleware, (request: IRequest, env: Env) => {
  const username = (request as any).username as string
  const chatId = (request.query as Record<string, string>).chat_id
  if (!chatId) return new Response('Missing chat_id', { status: 400 })

  const doId = env.CHAT_SESSION.idFromName(`user:${username}`)
  const stub = env.CHAT_SESSION.get(doId)
  const url = new URL(request.url)
  url.pathname = '/connect'
  url.hostname = 'do'
  return stub.fetch(url.toString(), { headers: request.headers })
})

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)

    // API routes
    if (url.pathname.startsWith('/api/')) {
      await ensureSchema(env.DB)
      return router.fetch(request, env)
    }

    // Serve static assets
    return env.ASSETS.fetch(request)
  },
}
