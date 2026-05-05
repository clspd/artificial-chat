<template>
  <div class="chat-view">
    <div class="messages-container" ref="messagesContainer" role="log" aria-label="聊天消息" aria-live="polite">
      <article
        v-for="message in messages"
        :key="message.id"
        :class="['message', message.role === 'USER' ? 'user' : 'assistant']"
      >
        <div class="message-avatar" role="img" :aria-label="`${message.role}消息`">
          <span>{{ message.role === 'USER' ? '👤' : '🤖' }}</span>
        </div>
        <div class="message-body">
          <div
            v-for="fragment in message.fragments"
            :key="fragment.id"
            class="fragment"
          >
            {{ fragment.content }}
          </div>
          <div v-if="message.has_pending_fragment" class="pending-indicator" role="status">
            ⌛ 生成中...
          </div>
        </div>
      </article>
    </div>

    <div class="input-container">
      <div class="input-wrapper">
        <textarea
          v-model="inputMessage"
          :placeholder="t('chat.sendMessage')"
          rows="3"
          @keydown.enter.ctrl="sendMessage"
          @keydown.enter.meta="sendMessage"
          :disabled="isLoading"
          aria-label="消息输入框"
          aria-multiline="true"
        />
        <a-button
          type="primary"
          @click="sendMessage"
          :disabled="!inputMessage.trim() || isLoading"
          :loading="isLoading"
        >
          {{ isLoading ? t('chat.loading') : '发送' }}
        </a-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, onMounted, onUnmounted, watch } from 'vue'
import { useTranslation } from 'i18next-vue'
import type { Message, PatchOperation } from '@/types'
import { MessageRole, MessageStatus, MessageFragmentType, MessageContentType } from '@/types'
import { chatWebSocketManager } from '@/lib/websocket'

const props = defineProps<{ chatId: string }>()
const { t } = useTranslation()

const messages = ref<Message[]>([])
const inputMessage = ref('')
const isLoading = ref(false)
const messagesContainer = ref<HTMLElement>()
const unsubscribe = ref<(() => void) | null>(null)

async function scrollToBottom() {
  await nextTick()
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
}

async function sendMessage() {
  if (!inputMessage.value.trim() || isLoading.value) return

  const content = inputMessage.value.trim()
  inputMessage.value = ''
  isLoading.value = true

  try {
    const userMessage: Message = {
      id: messages.value.length + 1,
      parent_id: null,
      role: MessageRole.User,
      ts: Date.now(),
      status: MessageStatus.Finished,
      files: [],
      fragments: [
        {
          id: 1,
          type: MessageFragmentType.TextFragment,
          ts: Date.now(),
          contentType: MessageContentType.Text,
          content,
        },
      ],
      has_pending_fragment: false,
    }
    messages.value.push(userMessage)
    await scrollToBottom()
    chatWebSocketManager.sendMessage('send', userMessage)
  } catch (error) {
    console.error('Failed to send message:', error)
  } finally {
    isLoading.value = false
  }
}

function handlePatch(patch: PatchOperation) {
  const { p, o, v } = patch
  const path = String(p).split('/')

  if (path[0] === 'content' && path[1] === 'content') {
    if (o === 'PUSH') {
      messages.value.push(v as Message)
    } else if (o === 'APPEND') {
      const msgIdx = parseInt(path[2])
      const fragIdx = parseInt(path[3])
      const msg = messages.value[msgIdx]
      if (msg?.fragments[fragIdx]) {
        msg.fragments[fragIdx].content += v as string
        messages.value[msgIdx] = { ...msg }
      }
    } else if (o === 'UPDATE') {
      const msgIdx = parseInt(path[2])
      if (messages.value[msgIdx]) {
        messages.value[msgIdx] = { ...messages.value[msgIdx], ...(v as Partial<Message>) }
      }
    }
    scrollToBottom()
  }
}

function handleWebSocketMessage(message: { type: string; content: unknown }) {
  switch (message.type) {
    case 'history_messages': {
      const c = message.content as { content: { content: Message[] } } | undefined
      if (c?.content?.content) messages.value = c.content.content
      scrollToBottom()
      break
    }
    case 'patch':
      handlePatch(message.content as PatchOperation)
      break
  }
}

function connect() {
  if (unsubscribe.value) unsubscribe.value()
  chatWebSocketManager.connect(props.chatId).then(() => {
    unsubscribe.value = chatWebSocketManager.on('*', handleWebSocketMessage)
  }).catch((error) => {
    console.error('Failed to connect WebSocket:', error)
  })
}

onMounted(connect)

watch(() => props.chatId, () => {
  messages.value = []
  connect()
})

onUnmounted(() => {
  chatWebSocketManager.disconnect()
  if (unsubscribe.value) unsubscribe.value()
})
</script>

<style scoped>
.chat-view {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 1em;
}

.message {
  display: flex;
  gap: 12px;
  max-width: 50rem;
  margin: 0 auto 12px auto;
}

.message.user {
  justify-content: flex-end;
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

.message-body {
  max-width: 70%;
  padding: 12px;
  border-radius: 12px;
  word-break: break-word;
  line-height: 1.6;
}

.user .message-body {
  background: #1890ff;
  color: #fff;
  border-bottom-right-radius: 0;
}

.assistant .message-body {
  background: #f5f5f5;
  color: #333;
  border-bottom-left-radius: 0;
}

.fragment {
  white-space: pre-wrap;
}

.pending-indicator {
  opacity: 0.7;
  font-style: italic;
  font-size: 12px;
  margin-top: 8px;
}

.input-container {
  padding: 1em 1em 0 1em;
  position: sticky;
  bottom: 0;
  background: var(--background, #fff);
}

.input-wrapper {
  display: flex;
  gap: 8px;
  max-width: 50rem;
  margin: 0 auto;
}

.input-wrapper textarea {
  flex: 1;
  padding: 10px 12px;
  border: 1px solid var(--input-border-color, #d9d9d9);
  border-radius: 4px;
  resize: none;
  font-size: 14px;
  font-family: inherit;
}

.input-wrapper textarea:focus {
  outline: none;
  border-color: #1890ff;
  box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.1);
}
</style>
