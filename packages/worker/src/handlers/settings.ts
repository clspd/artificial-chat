import { IRequest } from 'itty-router'
import { getUserByUsername } from '../services/user'
import { hashPassword, generateSalt, generateUserSecret } from '../lib/crypto'

export async function handleGetUserInfo(request: IRequest, env: Env): Promise<Response> {
  const username = (request as any).username as string
  const user = await getUserByUsername(env.DB, username)
  if (!user) {
    return Response.json({ success: false, error: 'User not found' }, { status: 404 })
  }

  return Response.json({
    username: user.username,
    user_source: user.user_source,
    created_at: user.created_at,
  })
}

export async function handleChangePassword(request: IRequest, env: Env): Promise<Response> {
  const username = (request as any).username as string

  let body: { oldPasswordHash?: string; newPasswordHash?: string }
  try {
    body = await request.json()
  } catch {
    return Response.json({ success: false, error: 'Invalid JSON' }, { status: 400 })
  }

  const { oldPasswordHash, newPasswordHash } = body
  if (!oldPasswordHash || !newPasswordHash) {
    return Response.json({ success: false, error: 'Missing fields' }, { status: 400 })
  }

  const user = await getUserByUsername(env.DB, username)
  if (!user) {
    return Response.json({ success: false, error: 'User not found' }, { status: 404 })
  }

  const computedOldHash = await hashPassword(oldPasswordHash, user.salt)
  if (computedOldHash !== user.password) {
    return Response.json({ success: false, error: 'Incorrect old password' }, { status: 401 })
  }

  const newSalt = generateSalt()
  const newPassword = await hashPassword(newPasswordHash, newSalt)

  await env.DB.prepare('UPDATE users SET salt = ?, password = ?, updated_at = (strftime(\'%s\', \'now\')) WHERE id = ?')
    .bind(newSalt, newPassword, user.id)
    .run()

  return Response.json({ success: true })
}

export async function handleLogoutAll(request: IRequest, env: Env): Promise<Response> {
  const username = (request as any).username as string

  const user = await getUserByUsername(env.DB, username)
  if (!user) {
    return Response.json({ success: false, error: 'User not found' }, { status: 404 })
  }

  const newSecret = generateUserSecret()
  await env.DB.prepare('UPDATE users SET user_secret = ?, updated_at = (strftime(\'%s\', \'now\')) WHERE id = ?')
    .bind(newSecret, user.id)
    .run()

  return Response.json({ success: true })
}

interface Env {
  DB: D1Database
  AUTH_CODE_JWT_SECRET: string
  AUTH_CODE_GEN_PASSWORD: string
  SESSION_JWT_SECRET: string
  CHAT_SESSION: DurableObjectNamespace
}
