import type { Conversation } from '@/types'

const BASE = '/api/v1'

export class ApiError extends Error {
  status: number
  body: string
  constructor(status: number, body: string) {
    super(`HTTP ${status}`)
    this.status = status
    this.body = body
  }
}

async function checkResponse(res: Response): Promise<Response> {
  if (!res.ok) {
    const body = await res.text()
    throw new ApiError(res.status, body)
  }
  return res
}

export async function fetchChatSessions(): Promise<Array<{ id: string; name: string }>> {
  const res = await checkResponse(await fetch(`${BASE}/chat/sessions`, { credentials: 'include' }))
  return res.json()
}

export async function createChat(): Promise<{ success: boolean; chat_id: string }> {
  const res = await checkResponse(await fetch(`${BASE}/chat/chat`, { method: 'POST', credentials: 'include' }))
  return res.json()
}

export async function getChat(chatId: string): Promise<{ id: string; name: string; stat: Record<string, number> }> {
  const res = await checkResponse(await fetch(`${BASE}/chat/chat?chat_id=${encodeURIComponent(chatId)}`, { credentials: 'include' }))
  return res.json()
}

export async function updateChat(chatId: string, name: string): Promise<void> {
  await checkResponse(await fetch(`${BASE}/chat/chat?chat_id=${encodeURIComponent(chatId)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ name }),
  }))
}

export async function deleteChat(chatId: string): Promise<void> {
  await checkResponse(await fetch(`${BASE}/chat/chat?chat_id=${encodeURIComponent(chatId)}`, {
    method: 'DELETE',
    credentials: 'include',
  }))
}
