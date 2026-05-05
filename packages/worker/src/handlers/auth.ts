import { IRequest } from 'itty-router'
import { createUser, loginUser, validateSession, getUserByUsername } from '../services/user'
import { verifyJWT, createAuthCodeJWT } from '../lib/jwt'

export async function handleWebLogin(request: IRequest, env: Env): Promise<Response> {
  const cookieHeader = request.headers.get('Cookie') || ''
  const cookies = parseCookies(cookieHeader)
  const token = cookies.SessionSecret

  if (token) {
    const user = await validateSession(env.DB, token, env.SESSION_JWT_SECRET)
    if (user) {
      return webloginRedirectResponse()
    }
  }

  return Response.redirect(new URL('/auth/login.html', request.url).href, 307)
}

export async function handleWebLoginByPassword(
  request: IRequest,
  env: Env,
): Promise<Response> {
  let body: { username?: string; password?: string; remember?: boolean }
  try {
    body = await request.json()
  } catch {
    return Response.json({ success: false, error: 'Invalid JSON' }, { status: 400 })
  }

  const { username, password, remember = false } = body
  if (!username || !password) {
    return Response.json({ success: false, error: 'Missing fields' }, { status: 400 })
  }

  const result = await loginUser(env.DB, username, password, remember, env.SESSION_JWT_SECRET)
  if (!result) {
    return Response.json({ success: false, error: '用户名或密码错误' }, { status: 401 })
  }

  const cookieAttrs = [
    'HttpOnly',
    'Secure',
    'SameSite=Lax',
    'Path=/',
  ]
  if (result.maxAge) {
    cookieAttrs.push(`Max-Age=${result.maxAge}`)
  }

  return new Response(null, {
    status: 200,
    headers: {
      'Set-Cookie': `SessionSecret=${result.token}; ${cookieAttrs.join('; ')}`,
    },
  })
}

export async function handleAddUserWeb(request: IRequest, env: Env): Promise<Response> {
  let body: { username?: string; password?: string; code?: string }
  try {
    body = await request.json()
  } catch {
    return Response.json({ success: false, error: 'Invalid JSON' }, { status: 400 })
  }

  const { username, password, code } = body
  if (!username || !password || !code) {
    return Response.json({ success: false, error: 'Missing fields' }, { status: 400 })
  }

  // Verify invite code JWT
  const payload = await verifyJWT(code, env.AUTH_CODE_JWT_SECRET)
  if (!payload) {
    return Response.json({ success: false, code: 403, error: 'Invalid auth code' }, { status: 403 })
  }

  const existing = await getUserByUsername(env.DB, username)
  if (existing) {
    return Response.json({ success: false, code: 409, error: 'User already exists' }, { status: 409 })
  }

  const source = (payload.source as string) || 'unknown'
  await createUser(env.DB, username, password, source)

  return Response.json({ success: true }, { status: 201 })
}

export async function handleGenCode(request: IRequest, env: Env): Promise<Response> {
  let body: { password?: string; source?: string; expiry?: number }
  try {
    body = await request.json()
  } catch {
    return Response.json({ success: false, error: 'Invalid JSON' }, { status: 400 })
  }

  const { password, source = '', expiry } = body
  if (!password) {
    return Response.json({ success: false, error: 'Missing password' }, { status: 400 })
  }
  if (!expiry) {
    return Response.json({ success: false, error: 'Missing expiry' }, { status: 400 })
  }

  // Double SHA256 check
  const encoder = new TextEncoder()
  const firstHash = await crypto.subtle.digest('SHA-256', encoder.encode(password))
  const finalHash = Array.from(new Uint8Array(firstHash), (b) =>
    b.toString(16).padStart(2, '0'),
  ).join('')

  if (finalHash !== env.AUTH_CODE_GEN_PASSWORD) {
    return Response.json({ success: false, error: 'Invalid password' }, { status: 401 })
  }

  const now = Date.now()
  const expiresInSeconds = Math.max(1, Math.floor((expiry - now) / 1000))

  const token = await createAuthCodeJWT(env.AUTH_CODE_JWT_SECRET, source, expiresInSeconds)
  return Response.json({ success: true, value: token })
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

function webloginRedirectResponse(): Response {
  const nonce = crypto.randomUUID()
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Redirecting</title><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'nonce-${nonce}';"></head><body><script nonce="${nonce}">localStorage.setItem('user::isLoggedIn','true');location.href='/'</script></body></html>`
  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}

interface Env {
  DB: D1Database
  AUTH_CODE_JWT_SECRET: string
  AUTH_CODE_GEN_PASSWORD: string
  SESSION_JWT_SECRET: string
  CHAT_SESSION: DurableObjectNamespace
}
