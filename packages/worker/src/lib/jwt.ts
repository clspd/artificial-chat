import jwt from 'jsonwebtoken'

interface AuthCodePayload {
  username: string
  source: string
  iat?: number
  exp?: number
}

export async function createSessionJWT(
  username: string,
  secret: string,
  maxAgeSeconds?: number,
): Promise<string> {
  const options: jwt.SignOptions = {}
  if (maxAgeSeconds) options.expiresIn = maxAgeSeconds
  return jwt.sign({ username }, secret, options)
}

export async function createAuthCodeJWT(
  secret: string,
  source: string,
  expiresInSeconds?: number,
): Promise<string> {
  const options: jwt.SignOptions = {}
  if (expiresInSeconds) options.expiresIn = expiresInSeconds
  return jwt.sign({ username: '__auth_code__', source }, secret, options)
}

export async function verifyJWT(
  token: string,
  secret: string,
): Promise<AuthCodePayload | null> {
  try {
    return jwt.verify(token, secret) as AuthCodePayload
  } catch {
    return null
  }
}

export function decodeJWT(token: string): Record<string, unknown> | null {
  try {
    return jwt.decode(token) as Record<string, unknown>
  } catch {
    return null
  }
}
