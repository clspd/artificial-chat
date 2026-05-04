import type { Conversation } from '@/types'

const BASE = '/api/v1'

export async function fetchChatSessions(): Promise<Array<{ id: string; name: string }>> {
  const res = await fetch(`${BASE}/chat/sessions`, { credentials: 'include' })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export async function createChat(): Promise<{ success: boolean; chat_id: string }> {
  const res = await fetch(`${BASE}/chat/chat`, {
    method: 'POST',
    credentials: 'include',
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export async function getChat(chatId: string): Promise<{ id: string; name: string; stat: Record<string, number> }> {
  const res = await fetch(`${BASE}/chat/chat?chat_id=${encodeURIComponent(chatId)}`, {
    credentials: 'include',
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export async function updateChat(chatId: string, name: string): Promise<void> {
  const res = await fetch(`${BASE}/chat/chat?chat_id=${encodeURIComponent(chatId)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ name }),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
}

export async function deleteChat(chatId: string): Promise<void> {
  const res = await fetch(`${BASE}/chat/chat?chat_id=${encodeURIComponent(chatId)}`, {
    method: 'DELETE',
    credentials: 'include',
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
}
