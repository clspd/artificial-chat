import { IRequest } from 'itty-router'
import * as cookie from 'cookie'
import { createUser, loginUser, validateSession, getUserByUsername } from '../services/user'
import { verifyJWT, createAuthCodeJWT } from '../lib/jwt'

export async function handleWebLogin(request: IRequest, env: Env): Promise<Response> {
  const cookieHeader = request.headers.get('Cookie') || ''
  const cookies = cookie.parse(cookieHeader)
  const token = cookies.SessionSecret

  if (token) {
    const user = await validateSession(env.DB, token, env.SESSION_JWT_SECRET)
    if (user?.user_enabled) {
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
  if ('disabled' in result) {
    return Response.json({ success: false, error: `Your account status is in an abnormal state. Please contact us if you think this is wrong. Status: ${result.status}` }, { status: 403 })
  }

  const cookieValue = cookie.serialize('SessionSecret', result.token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: result.maxAge,
  })

  return new Response(null, {
    status: 200,
    headers: { 'Set-Cookie': cookieValue },
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

  // SHA256 check
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

function webloginRedirectResponse(): Response {
  const nonce = crypto.randomUUID()
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Redirecting</title></head><body><script nonce="${nonce}">localStorage.setItem('user::isLoggedIn','true');location.href='/'</script></body></html>`
  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Security-Policy': `default-src 'none'; script-src 'nonce-${nonce}';`,
    },
  })
}

interface Env {
  DB: D1Database
  AUTH_CODE_JWT_SECRET: string
  AUTH_CODE_GEN_PASSWORD: string
  SESSION_JWT_SECRET: string
  CHAT_SESSION: DurableObjectNamespace
}
