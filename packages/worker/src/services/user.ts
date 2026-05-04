import { hashPassword, generateSalt, generateUserSecret } from '../lib/crypto'
import { createSessionJWT, verifyJWT } from '../lib/jwt'

export interface UserRecord {
  id: number
  username: string
  salt: string
  password: string
  user_secret: string
  created_at: number
  updated_at: number
}

export async function getUserByUsername(
  db: D1Database,
  username: string,
): Promise<UserRecord | null> {
  const result = await db
    .prepare('SELECT * FROM users WHERE username = ?')
    .bind(username)
    .first<UserRecord>()
  return result ?? null
}

export async function createUser(
  db: D1Database,
  username: string,
  passwordHashFromClient: string,
): Promise<UserRecord> {
  const salt = generateSalt()
  const password = await hashPassword(passwordHashFromClient, salt)
  const userSecret = generateUserSecret()

  const result = await db
    .prepare(
      'INSERT INTO users (username, salt, password, user_secret) VALUES (?, ?, ?, ?) RETURNING *',
    )
    .bind(username, salt, password, userSecret)
    .first<UserRecord>()

  if (!result) throw new Error('Failed to create user')
  return result
}

export async function loginUser(
  db: D1Database,
  username: string,
  passwordHashFromClient: string,
  remember: boolean,
  sessionJWTSecret: string,
): Promise<{ token: string; maxAge?: number } | null> {
  const user = await getUserByUsername(db, username)
  if (!user) return null

  const { salt, password } = user
  const computedHash = await hashPassword(passwordHashFromClient, salt)
  if (computedHash !== password) return null

  const maxAge = remember ? 14 * 24 * 60 * 60 : undefined
  const token = await createSessionJWT(username, user.user_secret + sessionJWTSecret, maxAge)
  return { token, maxAge }
}

export async function validateSession(
  db: D1Database,
  token: string,
  sessionJWTSecret: string,
): Promise<UserRecord | null> {
  // Decode first to get username without verifying
  const payload = decodeJWT(token)
  if (!payload?.username) return null

  const user = await getUserByUsername(db, payload.username)
  if (!user) return null

  // Verify with user's own secret + server secret
  const valid = await verifyJWT(token, user.user_secret + sessionJWTSecret)
  if (!valid) return null

  return user
}

function decodeJWT(token: string): { username?: string } | null {
  try {
    const parts = token.split('.')
    if (parts.length < 2) return null
    return JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')))
  } catch {
    return null
  }
}
