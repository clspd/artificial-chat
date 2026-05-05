import type { WebSocketMessage } from '@/types'

type MessageHandler = (message: WebSocketMessage) => void
type StateHandler = (state: ConnectionState) => void

export type ConnectionState = 'connecting' | 'connected' | 'disconnected'

export class ChatWebSocketManager {
  private ws: WebSocket | null = null
  private chatId: string | null = null
  private handlers = new Map<string, Set<MessageHandler>>()
  private stateHandlers = new Set<StateHandler>()
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private reconnectAttempts = 0
  private _state: ConnectionState = 'disconnected'

  get state(): ConnectionState {
    return this._state
  }

  private setState(state: ConnectionState) {
    if (this._state === state) return
    this._state = state
    this.stateHandlers.forEach((h) => h(state))
  }

  onStateChange(handler: StateHandler): () => void {
    this.stateHandlers.add(handler)
    return () => this.stateHandlers.delete(handler)
  }

  async connect(chatId: string): Promise<void> {
    if (this.chatId === chatId && this.isConnected()) return

    this.disconnect()
    this.chatId = chatId
    this.reconnectAttempts = 0

    return this.doConnect()
  }

  private doConnect(): Promise<void> {
    if (!this.chatId) return Promise.reject(new Error('No chat ID'))

    this.setState('connecting')

    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:'
    const url = `${protocol}//${location.host}/api/v1/chat/connect?chat_id=${encodeURIComponent(this.chatId)}`

    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(url)

      this.ws.onopen = () => {
        this.reconnectAttempts = 0
        this.setState('connected')
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
        this.setState('disconnected')
        if (this.chatId !== null && this.reconnectAttempts < 10) {
          this.scheduleReconnect()
        }
      }
    })
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer)
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000)
    this.reconnectAttempts++
    this.reconnectTimer = setTimeout(() => {
      if (this.chatId) this.doConnect().catch(() => {})
    }, delay)
  }

  reconnect(): void {
    if (!this.chatId) return
    this.reconnectAttempts = 0
    this.doConnect().catch(() => {})
  }

  sendMessage(type: string, content: unknown): boolean {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return false
    }
    this.ws.send(JSON.stringify({ type, content }))
    return true
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
    this.chatId = null
    this.reconnectAttempts = 0
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    this.setState('disconnected')
  }

  private dispatch(type: string, message: WebSocketMessage): void {
    this.handlers.get(type)?.forEach((handler) => handler(message))
  }
}

export const chatWebSocketManager = new ChatWebSocketManager()
