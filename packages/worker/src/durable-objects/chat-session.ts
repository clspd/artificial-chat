import type { DurableObject, DurableObjectState } from '@cloudflare/workers-types'
import type { Conversation, Message, WebSocketMessage, PatchObject } from '../../../web/src/types'
import { MessageRole, MessageStatus, SchemaVersion, MessageFragmentType, MessageContentType } from '../../../web/src/types'

/**
 * ChatSession Durable Object
 * 处理实时聊天、消息存储和AI响应生成
 */
export class ChatSession implements DurableObject {
  private state: DurableObjectState
  private env: any
  private conversationData: Conversation | null = null
  private clients: Set<WebSocket> = new Set()

  constructor(state: DurableObjectState, env: any) {
    this.state = state
    this.env = env
    this.state.blockConcurrencyWhile(async () => {
      this.conversationData = await this.state.storage?.get('conversation')
    })
  }

  /**
   * 初始化对话
   */
  private initializeConversation(appId: string, name: string): Conversation {
    return {
      schemaVersion: SchemaVersion.V1,
      appid: appId,
      name: name || 'Untitled Chat',
      stat: {
        created_at: Date.now(),
        updated_at: Date.now(),
      },
      history: [],
      content: {
        name: 'main',
        content: [],
      },
    }
  }

  /**
   * 处理WebSocket连接
   */
  async webSocketMessage(client: WebSocket, message: string): Promise<void> {
    try {
      const msg = JSON.parse(message) as WebSocketMessage

      switch (msg.type) {
        case 'send':
          await this.handleSendMessage(client, msg.content as Message)
          break
        case 'patch':
          await this.handlePatch(client, msg.content as any)
          break
        default:
          console.warn('Unknown message type:', msg.type)
      }
    } catch (error) {
      console.error('Error processing WebSocket message:', error)
    }
  }

  /**
   * 处理发送消息
   */
  private async handleSendMessage(client: WebSocket, message: Message): Promise<void> {
    if (!this.conversationData) {
      this.conversationData = this.initializeConversation('app1', 'Chat')
    }

    // 添加用户消息到对话
    message.id = this.conversationData.content.content.length + 1
    this.conversationData.content.content.push(message)

    // 广播用户消息给所有客户端
    this.broadcastMessage({
      type: 'patch',
      content: {
        p: `content/content`,
        o: 'PUSH',
        v: message,
      },
    })

    // 生成AI响应
    await this.generateAIResponse()

    // 保存到存储
    this.saveConversation()
  }

  /**
   * 处理patch操作
   */
  private async handlePatch(client: WebSocket, patch: any): Promise<void> {
    // 处理来自客户端的patch操作
    console.log('Received patch:', patch)
  }

  /**
   * 生成AI响应（模拟层）
   */
  private async generateAIResponse(): Promise<void> {
    if (!this.conversationData) return

    // 等待2秒
    await new Promise((resolve) => setTimeout(resolve, 2000))

    const messageIndex = this.conversationData.content.content.length
    const assistantMessage: Message = {
      id: messageIndex + 1,
      parent_id: messageIndex,
      role: MessageRole.Assistant,
      ts: Date.now(),
      status: MessageStatus.WIP,
      files: [],
      fragments: [],
      has_pending_fragment: true,
    }

    // 添加AI消息（WIP状态）
    this.conversationData.content.content.push(assistantMessage)

    // 广播：添加新的assistant消息
    this.broadcastMessage({
      type: 'patch',
      content: {
        p: 'content/content',
        o: 'PUSH',
        v: assistantMessage,
      },
    })

    // 模拟流式输出
    const responseText = 'The server is busy. Please try again later.'
    for (const char of responseText) {
      // 每个字符发送一个patch
      this.broadcastMessage({
        type: 'patch',
        content: {
          p: `content/content/${messageIndex}/fragments/-1/content`,
          o: 'APPEND',
          v: char,
        } as PatchObject,
      })

      await new Promise((resolve) => setTimeout(resolve, 50))
    }

    // 完成消息生成
    assistantMessage.status = MessageStatus.Finished
    assistantMessage.has_pending_fragment = false

    if (assistantMessage.fragments.length === 0) {
      assistantMessage.fragments.push({
        id: 1,
        type: 'text',
        ts: Date.now(),
        contentType: 'text',
        content: responseText,
      })
    }

    // 广播完成状态
    this.broadcastMessage({
      type: 'patch',
      content: {
        p: `content/content/${messageIndex}`,
        o: 'UPDATE',
        v: assistantMessage,
      },
    })
  }

  /**
   * 广播消息给所有客户端
   */
  private broadcastMessage(message: any): void {
    const payload = JSON.stringify(message)
    for (const client of this.clients) {
      try {
        client.send(payload)
      } catch (error) {
        console.error('Failed to send message to client:', error)
        this.clients.delete(client)
      }
    }
  }

  /**
   * 保存对话到存储
   */
  private saveConversation(): void {
    if (this.conversationData) {
      this.state.storage?.put('conversation', this.conversationData)
    }
  }

  /**
   * 处理fetch请求
   */
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)

    // WebSocket升级
    if (request.headers.get('Upgrade') === 'websocket') {
      const pair = new WebSocketPair()
      const client = pair[0]
      const server = pair[1]

      this.clients.add(client)

      // 初始化对话
      if (!this.conversationData) {
        this.conversationData = this.initializeConversation('app1', 'New Chat')
      }

      // 发送历史消息
      server.send(
        JSON.stringify({
          type: 'history_messages',
          content: this.conversationData,
        }),
      )

      // 处理消息
      server.addEventListener('message', (event: MessageEvent) => {
        this.webSocketMessage(server, event.data as string)
      })

      server.addEventListener('close', () => {
        this.clients.delete(server)
      })

      return new Response(null, { status: 101, webSocket: server as any })
    }

    return new Response('Not found', { status: 404 })
  }
}

/**
 * WebSocketPair 类（用于 Cloudflare Workers）
 */
class WebSocketPair {
  [Symbol.iterator](): [WebSocket, WebSocket] {
    // 直接返回占位符，Cloudflare Workers 环境提供实际实现
    throw new Error('WebSocketPair is only available in Cloudflare Workers runtime')
  }
}
