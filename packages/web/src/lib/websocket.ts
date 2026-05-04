import type { WebSocketMessage } from '@/types'

type MessageHandler = (message: WebSocketMessage) => void

export class ChatWebSocketManager {
  private ws: WebSocket | null = null
  private chatId: string | null = null
  private handlers = new Map<string, Set<MessageHandler>>()
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null

  async connect(chatId: string): Promise<void> {
    if (this.chatId === chatId && this.isConnected()) return

    this.disconnect()
    this.chatId = chatId

    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:'
    const url = `${protocol}//${location.host}/api/v1/chat/connect?chat_id=${encodeURIComponent(chatId)}`

    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(url)

      this.ws.onopen = () => {
        resolve()
      }

      this.ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data)
          this.dispatch('*', message)
          this.dispatch(message.type, message)
        } catch (e) {
          console.error('Failed to parse WebSocket message:', e)
        }
      }

      this.ws.onerror = () => {
        reject(new Error('WebSocket connection failed'))
      }

      this.ws.onclose = () => {
        // Don't reconnect on close
      }
    })
  }

  sendMessage(type: string, content: unknown): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('WebSocket not connected')
      return
    }
    this.ws.send(JSON.stringify({ type, content }))
  }

  on(type: string, handler: MessageHandler): () => void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set())
    }
    this.handlers.get(type)!.add(handler)
    return () => {
      this.handlers.get(type)?.delete(handler)
    }
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN
  }

  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    this.chatId = null
  }

  private dispatch(type: string, message: WebSocketMessage): void {
    this.handlers.get(type)?.forEach((handler) => handler(message))
  }
}

export const chatWebSocketManager = new ChatWebSocketManager()
