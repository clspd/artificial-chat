import { DurableObject } from 'cloudflare:workers'
import type { Conversation, Message } from './types'
import {
  SchemaVersion,
  MessageRole,
  MessageStatus,
  MessageFragmentType,
  MessageContentType,
} from './types'
import { generateMockResponse } from '../ai/simulator'

interface SessionEntry {
  id: string
  name: string
  conversation: Conversation
  nextMessageId: number
}

export class ChatSession extends DurableObject {
  private sessions: Map<string, SessionEntry> | null = null

  private async loadSessions(): Promise<Map<string, SessionEntry>> {
    if (this.sessions) return this.sessions
    const raw = await this.ctx.storage.get<string>('sessions')
    if (raw) {
      const parsed = JSON.parse(raw) as Record<string, SessionEntry>
      this.sessions = new Map(Object.entries(parsed))
    } else {
      this.sessions = new Map()
    }
    return this.sessions
  }

  private async persistSessions(): Promise<void> {
    if (!this.sessions) return
    await this.ctx.storage.put('sessions', JSON.stringify(Object.fromEntries(this.sessions)))
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)
    const path = url.pathname

    if (path === '/sessions') {
      return this.handleSessions()
    }

    if (path === '/chat/create') {
      return this.handleCreateChat()
    }

    if (path === '/chat') {
      return this.handleChat(request)
    }

    if (path === '/connect' || path === '/api/v1/chat/connect') {
      return this.handleWebSocketConnect(request)
    }

    return new Response('Not found', { status: 404 })
  }

  private async handleSessions(): Promise<Response> {
    const sessions = await this.loadSessions()
    const list = Array.from(sessions.values()).map((s) => ({ id: s.id, name: s.name }))
    return Response.json(list)
  }

  private async handleCreateChat(): Promise<Response> {
    const sessions = await this.loadSessions()
    const chatId = crypto.randomUUID()
    const conversation: Conversation = {
      schemaVersion: SchemaVersion.V1,
      appid: 'artificial-chat',
      name: 'New Chat',
      stat: { created_at: Date.now(), updated_at: Date.now() },
      history: [],
      content: { name: 'Current', content: [] },
    }
    sessions.set(chatId, { id: chatId, name: 'New Chat', conversation, nextMessageId: 1 })
    await this.persistSessions()
    return Response.json({ success: true, chat_id: chatId })
  }

  private async handleChat(request: Request): Promise<Response> {
    const sessions = await this.loadSessions()
    const url = new URL(request.url)
    const chatId = url.searchParams.get('chat_id')
    if (!chatId) return new Response('Missing chat_id', { status: 400 })

    const session = sessions.get(chatId)
    if (!session) return new Response('Not found', { status: 404 })

    switch (request.method) {
      case 'GET':
        return Response.json({ id: session.id, name: session.name, stat: session.conversation.stat })

      case 'PATCH': {
        const body: { name?: string } = await request.json()
        if (body.name) {
          session.name = body.name
          session.conversation.name = body.name
          session.conversation.stat.updated_at = Date.now()
          await this.persistSessions()
        }
        return Response.json({ success: true })
      }

      case 'DELETE':
        sessions.delete(chatId)
        await this.persistSessions()
        return new Response(null, { status: 202 })

      default:
        return new Response('Method not allowed', { status: 405 })
    }
  }

  private async handleWebSocketConnect(request: Request): Promise<Response> {
    const sessions = await this.loadSessions()
    const url = new URL(request.url)
    const chatId = url.searchParams.get('chat_id') || ''

    const session = sessions.get(chatId)
    if (!session) {
      return new Response('Chat not found', { status: 404 })
    }

    const pair = new WebSocketPair()
    const [client, server] = Object.values(pair)

    server.serializeAttachment({ chatId })
    this.ctx.acceptWebSocket(server)

    server.send(JSON.stringify({ type: 'history_messages', content: session.conversation }))

    return new Response(null, { status: 101, webSocket: client })
  }

  async webSocketMessage(ws: WebSocket, message: string): Promise<void> {
    const { chatId } = ws.deserializeAttachment() as { chatId: string }
    const sessions = await this.loadSessions()
    const session = sessions.get(chatId)
    if (!session) return

    let msg: { type: string; content: unknown }
    try {
      msg = JSON.parse(message)
    } catch {
      return
    }

    if (msg.type !== 'send') return

    const messages = session.conversation.content.content
    const lastMsg = messages.length > 0 ? messages[messages.length - 1] : null

    const userId = session.nextMessageId++
    const userMsg: Message = {
      id: userId,
      parent_id: lastMsg ? lastMsg.id : null,
      role: MessageRole.User,
      ts: Date.now(),
      status: MessageStatus.Finished,
      files: [],
      fragments: [{ id: 1, type: MessageFragmentType.TextFragment, ts: Date.now(), contentType: MessageContentType.Text, content: msg.content as string }],
      has_pending_fragment: false,
    }
    messages.push(userMsg)

    ws.send(JSON.stringify({ type: 'patch', content: { p: 'content/content', o: 'PUSH', v: userMsg } }))

    const assistantId = session.nextMessageId++
    const assistantMsg: Message = {
      id: assistantId,
      parent_id: userId,
      role: MessageRole.Assistant,
      ts: Date.now(),
      status: MessageStatus.WIP,
      files: [],
      fragments: [{ id: 1, type: MessageFragmentType.TextFragment, ts: Date.now(), contentType: MessageContentType.Text, content: '' }],
      has_pending_fragment: true,
    }
    messages.push(assistantMsg)

    const assistantIdx = messages.length - 1

    ws.send(JSON.stringify({ type: 'patch', content: { p: 'content/content', o: 'PUSH', v: assistantMsg } }))

    const response = await generateMockResponse()

    assistantMsg.fragments[0].content = response
    assistantMsg.has_pending_fragment = false
    assistantMsg.status = MessageStatus.Finished
    assistantMsg.ts = Date.now()

    ws.send(JSON.stringify({ type: 'patch', content: { p: 'content/content/' + assistantIdx + '/fragments/0/content', o: 'APPEND', v: response } }))
    ws.send(JSON.stringify({ type: 'patch', content: { p: 'content/content/' + assistantIdx, o: 'UPDATE', v: { status: MessageStatus.Finished, has_pending_fragment: false } } }))

    await this.persistSessions()
  }

  async webSocketClose(ws: WebSocket): Promise<void> {
    // No cleanup needed; sessions persist via storage
  }
}
