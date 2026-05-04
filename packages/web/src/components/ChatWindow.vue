<template>
  <div class="chat-window">
    <div
      class="chat-messages"
      ref="messagesContainer"
      role="log"
      aria-label="聊天消息"
      aria-live="polite"
      aria-atomic="false"
    >
      <article
        v-for="message in messages"
        :key="message.id"
        :class="['message', message.role.toLowerCase()]"
      >
        <div class="message-avatar" role="img" :aria-label="`${message.role}消息`">
          <span>
            {{ message.role === MessageRole.User ? '👤' : '🤖' }}
          </span>
        </div>
        <div class="message-content">
          <div
            v-for="fragment in message.fragments"
            :key="fragment.id"
            class="fragment"
            role="textbox"
            :aria-readonly="true"
          >
            {{ fragment.content }}
          </div>
          <div
            v-if="message.has_pending_fragment"
            class="pending-indicator"
            role="status"
            aria-live="polite"
          >
            ⌛ 生成中...
          </div>
        </div>
      </article>
    </div>

    <div class="chat-input-area">
      <div class="input-wrapper">
        <textarea
          v-model="inputMessage"
          class="message-input"
          :placeholder="$t('chat.sendMessage')"
          rows="3"
          @keydown.enter.ctrl="sendMessage"
          @keydown.enter.meta="sendMessage"
          role="textbox"
          aria-label="消息输入框"
          aria-multiline="true"
          :disabled="isLoading"
        />
        <button
          class="send-btn"
          @click="sendMessage"
          :disabled="!inputMessage.trim() || isLoading"
          aria-label="发送消息"
          type="button"
        >
          <span v-if="!isLoading">发送</span>
          <span v-else aria-live="polite">{{ $t('chat.loading') }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, onMounted, onUnmounted, watch } from 'vue'
import { useI18n } from 'i18next-vue'
import type { Conversation, Message, WebSocketMessage } from '@/types'
import { MessageRole, MessageStatus, MessageFragmentType, MessageContentType, SchemaVersion } from '@/types'
import { chatWebSocketManager } from '@/lib/websocket'

interface Props {
  chat?: { id: string; name: string }
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'send-message': [content: string]
}>()

const { t } = useI18n()

const messages = ref<Message[]>([])
const inputMessage = ref('')
const isLoading = ref(false)
const messagesContainer = ref<HTMLElement>()
const currentChatId = ref<string>('')
const unsubscribe = ref<(() => void) | null>(null)

/**
 * 滚动到底部
 */
async function scrollToBottom() {
  await nextTick()
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
}

/**
 * 发送消息
 */
async function sendMessage() {
  if (!inputMessage.value.trim() || isLoading.value || !currentChatId.value) return

  const content = inputMessage.value.trim()
  inputMessage.value = ''
  isLoading.value = true

  try {
    // 创建用户消息
    const userMessage: Message = {
      id: messages.value.length + 1,
      parent_id: null,
      role: MessageRole.User,
      ts: Date.now(),
      status: 'FINISHED' as any,
      files: [],
      fragments: [
        {
          id: 1,
          type: MessageFragmentType.TextFragment,
          ts: Date.now(),
          contentType: MessageContentType.Text,
          content: content,
        },
      ],
      has_pending_fragment: false,
    }
    messages.value.push(userMessage)
    await scrollToBottom()

    // 通过WebSocket发送消息
    chatWebSocketManager.sendMessage('send', userMessage)

    // 发送事件给父组件
    emit('send-message', content)
  } catch (error) {
    console.error('Failed to send message:', error)
  } finally {
    isLoading.value = false
  }
}

/**
 * 处理WebSocket消息
 */
function handleWebSocketMessage(message: WebSocketMessage) {
  switch (message.type) {
    case 'history_messages':
      // 处理历史消息
      const conversation = message.content as Conversation
      if (conversation.content.content) {
        messages.value = conversation.content.content
      }
      scrollToBottom()
      break

    case 'patch':
      // 处理patch操作
      handlePatch(message.content)
      break

    default:
      console.warn('Unknown message type:', message.type)
  }
}

/**
 * 处理patch操作
 */
function handlePatch(patch: any) {
  const { p, o, v } = patch
  const path = String(p).split('/')

  if (path[0] === 'content' && path[1] === 'content') {
    if (o === 'PUSH') {
      // 添加新消息
      messages.value.push(v as Message)
    } else if (o === 'APPEND') {
      // 追加内容到fragment
      const messageIndex = parseInt(path[2])
      const fragmentIndex = parseInt(path[3])

      if (messages.value[messageIndex] && messages.value[messageIndex].fragments[fragmentIndex]) {
        const fragment = messages.value[messageIndex].fragments[fragmentIndex]
        fragment.content += v as string
      }
    } else if (o === 'UPDATE') {
      // 更新消息
      const messageIndex = parseInt(path[2])
      if (messages.value[messageIndex]) {
        Object.assign(messages.value[messageIndex], v)
      }
    }

    scrollToBottom()
  }
}

/**
 * 连接到聊天
 */
async function connectToChat(chatId: string) {
  if (currentChatId.value === chatId && chatWebSocketManager.isConnected()) {
    return
  }

  currentChatId.value = chatId

  try {
    await chatWebSocketManager.connecting(chatId)

    // 订阅WebSocket消息
    if (unsubscribe.value) {
      unsubscribe.value()
    }
    unsubscribe.value = chatWebSocketManager.on('*', handleWebSocketMessage)
  } catch (error) {
    console.error('Failed to connect to chat:', error)
  }
}

/**
 * 监听props变化
 */
watch(
  () => props.chat?.id,
  (chatId) => {
    if (chatId) {
      connectToChat(chatId)
    }
  },
)

// 组件挂载时
onMounted(() => {
  if (props.chat?.id) {
    connectToChat(props.chat.id)
  }
})

// 组件卸载时
onUnmounted(() => {
  chatWebSocketManager.disconnect()
  if (unsubscribe.value) {
    unsubscribe.value()
  }
})
</script>

<style scoped lang="less">
.chat-window {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: white;

  .chat-messages {
    flex: 1;
    overflow-y: auto;
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 12px;

    .message {
      display: flex;
      gap: 12px;
      animation: fadeIn 0.3s ease-in;

      &.user {
        flex-direction: row-reverse;

        .message-content {
          background: #1890ff;
          color: white;
          border-radius: 12px 12px 0 12px;
        }
      }

      &.assistant {
        flex-direction: row;

        .message-content {
          background: #f5f5f5;
          color: #333;
          border-radius: 12px 12px 12px 0;
        }
      }

      .message-avatar {
        flex-shrink: 0;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 20px;
      }

      .message-content {
        max-width: 60%;
        padding: 12px;
        word-wrap: break-word;

        .fragment {
          line-height: 1.6;
          white-space: pre-wrap;
        }

        .pending-indicator {
          opacity: 0.7;
          font-style: italic;
          font-size: 12px;
          margin-top: 8px;
        }
      }
    }
  }

  .chat-input-area {
    padding: 16px;
    border-top: 1px solid #f0f0f0;
    background: white;

    .input-wrapper {
      display: flex;
      gap: 8px;

      .message-input {
        flex: 1;
        padding: 10px 12px;
        border: 1px solid #d9d9d9;
        border-radius: 4px;
        resize: none;
        font-size: 14px;
        font-family: inherit;

        &:focus {
          outline: none;
          border-color: #1890ff;
          box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.1);
        }

        &:disabled {
          background: #f5f5f5;
          cursor: not-allowed;
        }
      }

      .send-btn {
        padding: 8px 16px;
        background: #1890ff;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 500;
        transition: background 0.3s;

        &:hover:not(:disabled) {
          background: #40a9ff;
        }

        &:disabled {
          background: #bfbfbf;
          cursor: not-allowed;
        }
      }
    }
  }
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
