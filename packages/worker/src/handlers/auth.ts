import type { Request, Response } from 'itty-router'
import type { D1Database } from '@cloudflare/workers-types'
import { createUser, loginUser, validateSessionJWT, getUserByUsername } from './user'
import { verifyAuthCodeJWT } from '../lib/jwt'

/**
 * 登录中间页处理（weblogin endpoint）
 * 验证SessionSecret cookie，如果有效则返回重定向页面
 */
export async function handleWebLogin(request: Request, env: any, db: D1Database): Promise<Response> {
  const cookieHeader = request.headers.get('Cookie') || ''
  const cookies = parseCookies(cookieHeader)
  const sessionSecret = cookies['SessionSecret']

  if (!sessionSecret) {
    // 没有session cookie，返回307到登录页
    return new Response(null, {
      status: 307,
      headers: {
        Location: '/auth/login.html',
      },
    })
  }

  // 验证session JWT
  const validation = await validateSessionJWT(db, sessionSecret)
  if (!validation.valid) {
    // 验证失败，返回307到登录页
    return new Response(null, {
      status: 307,
      headers: {
        Location: '/auth/login.html',
      },
    })
  }

  // 验证成功，返回重定向HTML页面
  const nonce = generateNonce()
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Redirecting</title>
</head>
<body>
  <script nonce="${nonce}">
    localStorage.setItem('user::isLoggedIn','true');
    location.href='/'
  </script>
</body>
</html>`

  return new Response(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html;charset=utf-8',
      'Content-Security-Policy': `default-src 'none'; script-src 'nonce-${nonce}'`,
    },
  })
}

/**
 * 处理登录请求 (POST /api/v1/user/webLoginByPassword)
 */
export async function handleWebLoginByPassword(
  request: Request,
  env: any,
  db: D1Database,
): Promise<Response> {
  try {
    const body = await request.json<{ username: string; password: string; remember?: boolean }>()

    const username = body.username?.trim()
    const passwordHash = body.password?.trim()
    const remember = body.remember ?? false

    if (!username || !passwordHash) {
      return new Response(JSON.stringify({ error: 'Missing username or password' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // 验证用户登录
    const result = await loginUser(db, username, passwordHash, remember)

    if (!result.success || !result.sessionJWT) {
      return new Response(JSON.stringify({ error: 'Invalid username or password' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // 构建cookie头
    const maxAge = remember ? 14 * 24 * 60 * 60 : undefined // 14天（秒）
    const cookieValue = `SessionSecret=${result.sessionJWT}; HttpOnly; Secure; SameSite=Lax${
      maxAge ? `; Max-Age=${maxAge}` : ''
    }`

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': cookieValue,
      },
    })
  } catch (error) {
    console.error('Login error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

/**
 * 处理注册请求 (POST /api/v1/user/addUserWeb)
 */
export async function handleAddUserWeb(
  request: Request,
  env: any,
  db: D1Database,
): Promise<Response> {
  try {
    const body = await request.json<{ username: string; password: string; code: string }>()

    const username = body.username?.trim()
    const passwordHash = body.password?.trim()
    const code = body.code?.trim()

    if (!username || !passwordHash || !code) {
      return new Response(JSON.stringify({ success: false, code: 400, error: 'Missing fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // 1. 验证邀请码
    const codeIsValid = verifyAuthCodeJWT(code, env.AUTH_CODE_JWT_SECRET)
    if (!codeIsValid) {
      return new Response(
        JSON.stringify({ success: false, code: 403, error: 'Invalid auth code' }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        },
      )
    }

    // 2. 检查用户是否已存在
    const existingUser = await getUserByUsername(db, username)
    if (existingUser) {
      return new Response(
        JSON.stringify({ success: false, code: 409, error: 'User already exists' }),
        {
          status: 409,
          headers: { 'Content-Type': 'application/json' },
        },
      )
    }

    // 3. 创建用户
    const newUser = await createUser(db, username, passwordHash)
    if (!newUser) {
      return new Response(
        JSON.stringify({ success: false, code: 500, error: 'Failed to create user' }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        },
      )
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Register error:', error)
    return new Response(
      JSON.stringify({ success: false, code: 500, error: 'Internal server error' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      },
    )
  }
}

/**
 * 解析Cookie字符串
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
 * 生成安全的nonce
 */
function generateNonce(): string {
  const array = new Uint8Array(16)
  crypto.getRandomValues(array)
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('')
}
