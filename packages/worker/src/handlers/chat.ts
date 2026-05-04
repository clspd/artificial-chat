import type { Request, Response } from 'itty-router'
import type { DurableObjectStub } from '@cloudflare/workers-types'
import { v4 as uuidv4 } from 'uuid'

/**
 * 获取聊天记录列表
 */
export async function handleGetChatSessions(
  request: Request,
  env: any,
  context: { username: string },
): Promise<Response> {
  // 这个接口从DO中获取用户的所有对话信息
  // 暂时返回空列表
  return new Response(JSON.stringify([]), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

/**
 * 创建新对话
 */
export async function handleCreateChat(
  request: Request,
  env: any,
  context: { username: string },
): Promise<Response> {
  try {
    const chatId = uuidv4()

    return new Response(JSON.stringify({ success: true, chat_id: chatId }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Create chat error:', error)
    return new Response(JSON.stringify({ success: false, error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

/**
 * 获取对话信息
 */
export async function handleGetChat(
  request: Request,
  env: any,
  context: { username: string },
): Promise<Response> {
  const chatId = (request.query as any)?.chat_id

  if (!chatId) {
    return new Response(JSON.stringify({ error: 'Missing chat_id' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // 从DO中获取对话信息
  // 暂时返回示例数据
  return new Response(
    JSON.stringify({
      name: 'Untitled Chat',
      stat: {
        created_at: Date.now(),
        updated_at: Date.now(),
      },
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    },
  )
}

/**
 * 更新对话信息
 */
export async function handleUpdateChat(
  request: Request,
  env: any,
  context: { username: string },
): Promise<Response> {
  const chatId = (request.query as any)?.chat_id

  if (!chatId) {
    return new Response(JSON.stringify({ error: 'Missing chat_id' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const body = await request.json<{ name?: string; stat?: any }>()

    // 只能更新name，不能更新stat
    if (body.stat) {
      delete body.stat
    }

    // 更新到DO中
    // 暂时返回成功
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Update chat error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

/**
 * 删除对话
 */
export async function handleDeleteChat(
  request: Request,
  env: any,
  context: { username: string },
): Promise<Response> {
  const chatId = (request.query as any)?.chat_id

  if (!chatId) {
    return new Response(JSON.stringify({ error: 'Missing chat_id' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    // 从DO中删除对话
    // 检查对话是否存在，如果不存在返回404，否则返回202

    // 暂时返回202
    return new Response(null, {
      status: 202,
    })
  } catch (error) {
    console.error('Delete chat error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

/**
 * 生成UUID
 */
function uuidv4(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}
