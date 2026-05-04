import { IRequest } from 'itty-router'
import { createUser, loginUser, validateSession, getUserByUsername } from '../services/user'
import { verifyJWT } from '../lib/jwt'

export async function handleWebLogin(request: IRequest, env: Env): Promise<Response> {
  const cookieHeader = request.headers.get('Cookie') || ''
  const cookies = parseCookies(cookieHeader)
  const token = cookies.SessionSecret

  if (token) {
    const user = await validateSession(env.DB, token, env.SESSION_JWT_SECRET)
    if (user) {
      // Valid session - return redirect page that sets localStorage
      return webloginRedirectResponse()
    }
  }

  return Response.redirect('/auth/login.html', 307)
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

  // Verify invite code
  const valid = await verifyJWT(code, env.AUTH_CODE_JWT_SECRET)
  if (!valid) {
    return Response.json({ success: false, code: 403, error: 'Invalid auth code' }, { status: 403 })
  }

  // Check if user exists
  const existing = await getUserByUsername(env.DB, username)
  if (existing) {
    return Response.json({ success: false, code: 409, error: 'User already exists' }, { status: 409 })
  }

  await createUser(env.DB, username, password)

  return Response.json({ success: true }, { status: 201 })
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
  SESSION_JWT_SECRET: string
  CHAT_SESSION: DurableObjectNamespace
}
