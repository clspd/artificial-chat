import { DurableObject } from 'cloudflare:workers'
import type {
  Conversation,
  Message,
  MessageFragment,
  MessageContainer,
} from './types'
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
}

export class ChatSession extends DurableObject {
  private sessions: Map<string, SessionEntry> = new Map()

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

    if (path === '/connect') {
      return this.handleWebSocket(request)
    }

    return new Response('Not found', { status: 404 })
  }

  private handleSessions(): Response {
    const list = Array.from(this.sessions.values()).map((s) => ({
      id: s.id,
      name: s.name,
    }))
    return Response.json(list)
  }

  private handleCreateChat(): Response {
    const chatId = crypto.randomUUID()
    const conversation: Conversation = {
      schemaVersion: SchemaVersion.V1,
      appid: 'artificial-chat',
      name: 'New Chat',
      stat: { created_at: Date.now(), updated_at: Date.now() },
      history: [],
      content: { name: 'Current', content: [] },
    }

    this.sessions.set(chatId, { id: chatId, name: 'New Chat', conversation })
    return Response.json({ success: true, chat_id: chatId })
  }

  private async handleChat(request: Request): Promise<Response> {
    const url = new URL(request.url)
    const chatId = url.searchParams.get('chat_id')
    if (!chatId) return new Response('Missing chat_id', { status: 400 })

    const session = this.sessions.get(chatId)
    if (!session) return new Response('Not found', { status: 404 })

    switch (request.method) {
      case 'GET':
        return Response.json({
          id: session.id,
          name: session.name,
          stat: session.conversation.stat,
        })

      case 'PATCH': {
        const body: { name?: string } = await request.json()
        if (body.name) {
          session.name = body.name
          session.conversation.name = body.name
          session.conversation.stat.updated_at = Date.now()
        }
        return Response.json({ success: true })
      }

      case 'DELETE':
        this.sessions.delete(chatId)
        return new Response(null, { status: 202 })

      default:
        return new Response('Method not allowed', { status: 405 })
    }
  }

  private handleWebSocket(request: Request): Response {
    const pair = new WebSocketPair()
    const [client, server] = Object.values(pair)

    const url = new URL(request.url)
    const chatId = url.searchParams.get('chat_id') || ''

    const session = this.sessions.get(chatId)
    if (!session) {
      return new Response('Chat not found', { status: 404 })
    }

    server.accept()

    // Send history on connect
    server.send(
      JSON.stringify({
        type: 'history_messages',
        content: session.conversation,
      }),
    )

    // Handle messages from client
    server.addEventListener('message', async (event: MessageEvent) => {
      let msg: { type: string; content: unknown }
      try {
        msg = JSON.parse(event.data as string)
      } catch {
        return
      }

      if (msg.type === 'send') {
        const userMsg = msg.content as Message
        session.conversation.content.content.push(userMsg)

        // Create assistant message (WIP)
        const assistantMsgId = session.conversation.content.content.length
        const assistantMsg: Message = {
          id: assistantMsgId,
          parent_id: userMsg.id,
          role: MessageRole.Assistant,
          ts: Date.now(),
          status: MessageStatus.WIP,
          files: [],
          fragments: [
            {
              id: 1,
              type: MessageFragmentType.TextFragment,
              ts: Date.now(),
              contentType: MessageContentType.Text,
              content: '',
            },
          ],
          has_pending_fragment: true,
        }
        session.conversation.content.content.push(assistantMsg)

        // Send push notification
        server.send(
          JSON.stringify({
            type: 'patch',
            content: {
              p: 'content/content',
              o: 'PUSH',
              v: assistantMsg,
            },
          }),
        )

        // Simulate AI response
        const response = await generateMockResponse()

        // Update fragment content and status
        assistantMsg.fragments[0].content = response
        assistantMsg.has_pending_fragment = false
        assistantMsg.status = MessageStatus.Finished
        assistantMsg.ts = Date.now()

        // Send APPEND with full content
        server.send(
          JSON.stringify({
            type: 'patch',
            content: {
              p: `content/content/${assistantMsgId}/fragments/0/content`,
              o: 'APPEND',
              v: response,
            },
          }),
        )

        // Send UPDATE for status
        server.send(
          JSON.stringify({
            type: 'patch',
            content: {
              p: `content/content/${assistantMsgId}`,
              o: 'UPDATE',
              v: { status: MessageStatus.Finished, has_pending_fragment: false },
            },
          }),
        )
      }
    })

    return new Response(null, { status: 101, webSocket: client })
  }
}
