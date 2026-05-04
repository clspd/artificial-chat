import type { WebSocketMessage, PatchObject } from '@/types'

/**
 * WebSocket连接管理器
 */
export class ChatWebSocketManager {
  private ws: WebSocket | null = null
  private messageHandlers: Map<string, Set<(message: WebSocketMessage) => void>> = new Map()
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 3000

  /**
   * 连接到聊天服务
   */
  connecting(chatId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
        const url = `${protocol}://${window.location.host}/api/v1/chat/connect?chat_id=${chatId}`

        this.ws = new WebSocket(url)

        this.ws.onopen = () => {
          console.log('WebSocket connected')
          this.reconnectAttempts = 0
          resolve()
        }

        this.ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data) as WebSocketMessage
            this.handleMessage(message)
          } catch (error) {
            console.error('Failed to parse message:', error)
          }
        }

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error)
          this.handleError(error)
          reject(error)
        }

        this.ws.onclose = () => {
          console.log('WebSocket disconnected')
          this.attemptReconnect(chatId)
        }
      } catch (error) {
        reject(error)
      }
    })
  }

  /**
   * 断开连接
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
  }

  /**
   * 发送消息
   */
  sendMessage(type: string, content: unknown): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('WebSocket is not connected')
      return
    }

    const message: WebSocketMessage = {
      type,
      content,
    }

    this.ws.send(JSON.stringify(message))
  }

  /**
   * 监听特定类型的消息
   */
  on(messageType: string, handler: (message: WebSocketMessage) => void): () => void {
    if (!this.messageHandlers.has(messageType)) {
      this.messageHandlers.set(messageType, new Set())
    }

    this.messageHandlers.get(messageType)!.add(handler)

    // 返回取消监听函数
    return () => {
      this.messageHandlers.get(messageType)?.delete(handler)
    }
  }

  /**
   * 处理消息
   */
  private handleMessage(message: WebSocketMessage): void {
    const handlers = this.messageHandlers.get(message.type)
    if (handlers) {
      for (const handler of handlers) {
        try {
          handler(message)
        } catch (error) {
          console.error('Error in message handler:', error)
        }
      }
    }

    // 广播到所有监听器
    const allHandlers = this.messageHandlers.get('*')
    if (allHandlers) {
      for (const handler of allHandlers) {
        try {
          handler(message)
        } catch (error) {
          console.error('Error in global message handler:', error)
        }
      }
    }
  }

  /**
   * 处理错误
   */
  private handleError(error: Event | Error): void {
    const errorHandlers = this.messageHandlers.get('error')
    if (errorHandlers) {
      for (const handler of errorHandlers) {
        try {
          const message: WebSocketMessage = {
            type: 'error',
            content: error instanceof Error ? error.message : String(error),
          }
          handler(message)
        } catch (err) {
          console.error('Error in error handler:', err)
        }
      }
    }
  }

  /**
   * 重新连接
   */
  private attemptReconnect(chatId: string): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++
      console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`)
      setTimeout(() => {
        this.connecting(chatId).catch((error) => {
          console.error('Reconnection failed:', error)
        })
      }, this.reconnectDelay)
    } else {
      console.error('Max reconnection attempts reached')
    }
  }

  /**
   * 检查连接状态
   */
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN
  }
}

// 创建全局实例
export const chatWebSocketManager = new ChatWebSocketManager()
