import jwt from 'jsonwebtoken'

/**
 * Session JWT的payload接口
 */
export interface SessionPayload {
  username: string
  iat?: number
  exp?: number
}

/**
 * 创建Session JWT
 */
export function createSessionJWT(
  username: string,
  secret: string,
  expiresIn: number | string = '14d',
): string {
  return jwt.sign({ username }, secret, {
    expiresIn,
  })
}

/**
 * 验证Session JWT
 */
export function verifySessionJWT(token: string, secret: string): SessionPayload | null {
  try {
    const decoded = jwt.verify(token, secret) as SessionPayload
    return decoded
  } catch (error) {
    return null
  }
}

/**
 * 解码JWT（不验证签名，仅用于调试）
 */
export function decodeJWT(token: string): SessionPayload | null {
  try {
    const decoded = jwt.decode(token) as SessionPayload
    return decoded
  } catch (error) {
    return null
  }
}

/**
 * 验证邀请码JWT
 */
export function verifyAuthCodeJWT(token: string, secret: string): boolean {
  try {
    jwt.verify(token, secret)
    return true
  } catch (error) {
    return false
  }
}
