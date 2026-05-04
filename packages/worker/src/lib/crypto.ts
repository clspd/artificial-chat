import { randomBytes, pbkdf2Sync } from 'crypto'

/**
 * 生成随机盐
 */
export function generateSalt(length: number = 32): string {
  return randomBytes(length).toString('hex')
}

/**
 * 哈希密码（使用PBKDF2）
 */
export function hashPassword(password: string, salt: string, iterations: number = 100000): string {
  // PBKDF2: 100000次迭代, 使用SHA-256, 生成64字节的密钥
  const hash = pbkdf2Sync(password, salt, iterations, 64, 'sha256')
  return hash.toString('hex')
}

/**
 * 验证密码
 */
export function verifyPassword(password: string, salt: string, hash: string): boolean {
  const computedHash = hashPassword(password, salt)
  return computedHash === hash
}

/**
 * 生成用户secret（用于session验证）
 */
export function generateUserSecret(): string {
  return randomBytes(32).toString('hex')
}
