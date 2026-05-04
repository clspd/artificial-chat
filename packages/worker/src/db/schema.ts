/**
 * D1 数据库初始化脚本
 */

export const INIT_SQL = `
-- 创建users表
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    
    -- 后端单独生成的随机盐
    salt TEXT NOT NULL,
    -- 流程：前端SHA256 → 后端拿salt二次哈希 → 存在这里
    password TEXT NOT NULL,
    
    -- 该用户专属密钥：用来校验自己的 Session JWT；用户做"登出所有设备"的时候其实就是刷新这个字段
    user_secret TEXT NOT NULL,
    
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER DEFAULT (strftime('%s', 'now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users(username);
`
