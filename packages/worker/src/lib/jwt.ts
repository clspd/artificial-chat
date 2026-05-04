interface JWTHeader {
  alg: string
  typ: string
}

interface JWTPayload {
  username: string
  iat?: number
  exp?: number
  [key: string]: unknown
}

function base64url(str: string): string {
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function base64urlDecode(str: string): string {
  str = str.replace(/-/g, '+').replace(/_/g, '/')
  while (str.length % 4) str += '='
  return atob(str)
}

function encodeJWT(header: JWTHeader, payload: JWTPayload): string {
  const headerStr = base64url(JSON.stringify(header))
  const payloadStr = base64url(JSON.stringify(payload))
  return `${headerStr}.${payloadStr}`
}

export async function createSessionJWT(
  username: string,
  secret: string,
  maxAgeSeconds?: number,
): Promise<string> {
  const header: JWTHeader = { alg: 'HS256', typ: 'JWT' }
  const now = Math.floor(Date.now() / 1000)
  const payload: JWTPayload = { username, iat: now }
  if (maxAgeSeconds) payload.exp = now + maxAgeSeconds

  const headerStr = base64url(JSON.stringify(header))
  const payloadStr = base64url(JSON.stringify(payload))
  const data = `${headerStr}.${payloadStr}`

  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false, ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(data))
  const sigStr = base64url(String.fromCharCode(...new Uint8Array(sig)))
  return `${data}.${sigStr}`
}

export async function createAuthCodeJWT(
  secret: string,
  expiresInSeconds = 3600,
): Promise<string> {
  const header: JWTHeader = { alg: 'HS256', typ: 'JWT' }
  const now = Math.floor(Date.now() / 1000)
  const payload: JWTPayload = {
    username: '__auth_code__',
    iat: now,
    exp: now + expiresInSeconds,
  }
  return encodeJWT(header, payload)
}

export async function verifyJWT(token: string, secret: string): Promise<JWTPayload | null> {
  const parts = token.split('.')
  if (parts.length !== 3) return null

  const [headerB64, payloadB64, sigB64] = parts
  const data = `${headerB64}.${payloadB64}`

  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false, ['verify'],
  )

  // Decode signature from base64url
  const sigStr = base64urlDecode(sigB64)
  const sigBytes = new Uint8Array(sigStr.length)
  for (let i = 0; i < sigStr.length; i++) sigBytes[i] = sigStr.charCodeAt(i)

  const valid = await crypto.subtle.verify('HMAC', key, sigBytes, encoder.encode(data))
  if (!valid) return null

  const payload: JWTPayload = JSON.parse(base64urlDecode(payloadB64))

  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null

  return payload
}

export function decodeJWT(token: string): JWTPayload | null {
  const parts = token.split('.')
  if (parts.length < 2) return null
  try {
    return JSON.parse(base64urlDecode(parts[1]))
  } catch {
    return null
  }
}
