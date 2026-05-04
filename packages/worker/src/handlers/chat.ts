import { IRequest } from 'itty-router'

interface Env {
  CHAT_SESSION: DurableObjectNamespace
}

export async function handleGetChatSessions(request: IRequest, env: Env): Promise<Response> {
  const username = (request as any).username as string
  const doId = env.CHAT_SESSION.idFromName(`user:${username}`)
  const stub = env.CHAT_SESSION.get(doId)

  const result = await stub.fetch('http://do/sessions', {
    headers: { 'X-Username': username },
  })
  return new Response(await result.text(), { status: result.status })
}

export async function handleChat(request: IRequest, env: Env): Promise<Response> {
  const username = (request as any).username as string
  const chatId = (request.query as Record<string, string>).chat_id

  const doId = env.CHAT_SESSION.idFromName(`user:${username}`)
  const stub = env.CHAT_SESSION.get(doId)

  let proxyUrl: string
  switch (request.method) {
    case 'POST':
      proxyUrl = 'http://do/chat/create'
      break
    case 'GET':
      proxyUrl = `http://do/chat?chat_id=${encodeURIComponent(chatId || '')}`
      break
    case 'PATCH':
      proxyUrl = `http://do/chat?chat_id=${encodeURIComponent(chatId || '')}`
      break
    case 'DELETE':
      proxyUrl = `http://do/chat?chat_id=${encodeURIComponent(chatId || '')}`
      break
    default:
      return new Response('Method not allowed', { status: 405 })
  }

  const result = await stub.fetch(proxyUrl, {
    method: request.method,
    headers: { 'X-Username': username },
    body: request.method !== 'GET' ? await request.text() : undefined,
  })
  return new Response(await result.text(), { status: result.status })
}
