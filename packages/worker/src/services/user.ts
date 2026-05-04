import type { D1Database } from '@cloudflare/workers-types'
import { generateSalt, hashPassword, generateUserSecret, verifyPassword } from '../lib/crypto'
import { createSessionJWT, verifyAuthCodeJWT, decodeJWT } from '../lib/jwt'

/**
 * 用户接口
 */
export interface User {
  id: number
  username: string
  salt: string
  password: string
  user_secret: string
  created_at: number
  updated_at: number
}

/**
 * 获取用户信息
 */
export async function getUserByUsername(db: D1Database, username: string): Promise<User | null> {
  try {
    const result = await db.prepare('SELECT * FROM users WHERE username = ?').bind(username).first()
    return result as User | null
  } catch (error) {
    console.error('Failed to get user:', error)
    return null
  }
}

/**
 * 创建用户
 */
export async function createUser(
  db: D1Database,
  username: string,
  passwordHash: string, // 这是前端SHA256后的哈希
): Promise<User | null> {
  try {
    // 生成盐
    const salt = generateSalt()
    // 二次哈希
    const finalHash = hashPassword(passwordHash, salt)
    // 生成user_secret
    const userSecret = generateUserSecret()

    const result = await db
      .prepare(
        'INSERT INTO users (username, salt, password, user_secret) VALUES (?, ?, ?, ?) RETURNING *',
      )
      .bind(username, salt, finalHash, userSecret)
      .first()

    return result as User | null
  } catch (error) {
    console.error('Failed to create user:', error)
    return null
  }
}

/**
 * 验证用户登录
 */
export async function verifyUserLogin(
  db: D1Database,
  username: string,
  passwordHash: string, // 这是前端SHA256后的哈希
): Promise<User | null> {
  const user = await getUserByUsername(db, username)
  if (!user) {
    return null
  }

  // 使用存储的盐进行二次哈希
  const computedHash = hashPassword(passwordHash, user.salt)
  if (computedHash === user.password) {
    return user
  }

  return null
}

/**
 * 登录-生成Session JWT
 */
export async function loginUser(
  db: D1Database,
  username: string,
  passwordHash: string,
  remember: boolean = false,
): Promise<{
  success: boolean
  sessionJWT?: string
  expiresIn?: string | number
}> {
  const user = await verifyUserLogin(db, username, passwordHash)
  if (!user) {
    return { success: false }
  }

  // 生成Session JWT
  const expiresIn = remember ? '14d' : undefined // 如果记住密码，则设置14天过期；否则为会话级别（不设置过期时间）
  const sessionJWT = createSessionJWT(username, user.user_secret, expiresIn || '1y')

  return {
    success: true,
    sessionJWT,
    expiresIn: expiresIn || 'session',
  }
}

/**
 * 验证Session JWT
 */
export async function validateSessionJWT(
  db: D1Database,
  token: string,
): Promise<{
  valid: boolean
  username?: string
}> {
  try {
    // 首先解码token获取username
    const decoded = decodeJWT(token)
    if (!decoded || !decoded.username) {
      return { valid: false }
    }

    // 获取用户信息
    const user = await getUserByUsername(db, decoded.username)
    if (!user) {
      return { valid: false }
    }

    // 使用用户的secret验证JWT
    const isValid = verifySessionJWT(token, user.user_secret)
    if (!isValid) {
      return { valid: false }
    }

    return { valid: true, username: decoded.username }
  } catch (error) {
    console.error('Failed to validate session JWT:', error)
    return { valid: false }
  }
}

/**
 * 辅助函数：验证Session JWT
 */
function verifySessionJWT(token: string, secret: string): boolean {
  try {
    const jwt = require('jsonwebtoken')
    jwt.verify(token, secret)
    return true
  } catch (error) {
    return false
  }
}
