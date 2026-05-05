const BASE = '/api/v1'

async function checkResponse(res: Response): Promise<Response> {
  if (!res.ok) {
    const body = await res.text()
    throw new ApiError(res.status, body)
  }
  return res
}

export class ApiError extends Error {
  status: number
  body: string
  constructor(status: number, body: string) {
    super(`HTTP ${status}`)
    this.status = status
    this.body = body
  }
}

export interface UserInfo {
  username: string
  user_source: string
  created_at: number
}

export async function fetchUserInfo(): Promise<UserInfo> {
  const res = await checkResponse(await fetch(`${BASE}/user/me`, { credentials: 'include' }))
  return res.json()
}

export async function changePassword(oldPasswordHash: string, newPasswordHash: string): Promise<void> {
  await checkResponse(await fetch(`${BASE}/user/change-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ oldPasswordHash, newPasswordHash }),
  }))
}

export async function logoutAllDevices(): Promise<void> {
  await checkResponse(await fetch(`${BASE}/user/logout-all`, {
    method: 'POST',
    credentials: 'include',
  }))
}
