<template>
  <div class="chat-view">
    <div class="messages-container" ref="messagesContainer" role="log" aria-label="聊天消息" aria-live="polite">
      <article
        v-for="message in messages"
        :key="message.id"
        :class="['message-item', message.role === 'USER' ? 'user' : 'assistant']"
        :data-role="message.role === 'USER' ? 'user' : 'assistant'"
      >
        <div class="message-avatar" v-if="message.role === 'ASSISTANT'">
          <RobotOutlined />
        </div>
        <div class="message-body-container">
          <div class="message-body" :data-fill="message.role === 'ASSISTANT' ? true : undefined">
            <div
              v-for="fragment in message.fragments"
              :key="fragment.id"
              class="fragment"
            >{{ fragment.content }}</div>
          </div>
          <div v-if="message.role === 'ASSISTANT' && message.has_pending_fragment" class="wip-tip">
            <LoadingOutlined class="spin" />
          </div>
        </div>
        <div class="message-avatar" v-if="message.role === 'USER'">
          <UserOutlined />
        </div>
      </article>
    </div>

    <div class="input-container">
      <div class="input-message">
        <textarea
          v-model="inputMessage"
          :placeholder="t('chat.sendMessage')"
          rows="3"
          @keydown.enter="sendByEnter"
          :disabled="isLoading"
          aria-label="消息输入框"
        />
        <div class="bottom-row">
          <div class="flex-space"></div>
          <a-button
            type="primary"
            shape="circle"
            :disabled="!inputMessage.trim() || isLoading"
            @click="sendMessage"
            :aria-label="isLoading ? '停止生成' : '发送消息'"
          >
            <LoadingOutlined v-if="isLoading" />
            <ArrowUpOutlined v-else />
          </a-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, onMounted, onUnmounted, watch } from 'vue'
import { useTranslation } from 'i18next-vue'
import { UserOutlined, RobotOutlined, LoadingOutlined, ArrowUpOutlined } from '@ant-design/icons-vue'
import type { Message, PatchOperation } from '@/types'
import { MessageStatus } from '@/types'
import { chatWebSocketManager } from '@/lib/websocket'
import { applyPatch } from '@/lib/patch'

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

function sendByEnter(e: KeyboardEvent) {
  if (e.ctrlKey || e.metaKey) sendMessage()
}

async function sendMessage() {
  if (!inputMessage.value.trim() || isLoading.value) return
  const content = inputMessage.value.trim()
  inputMessage.value = ''
  isLoading.value = true
  chatWebSocketManager.sendMessage('send', content)
}

function handlePatch({ p, o, v }: PatchOperation) {
  // Strip "content/content" prefix — operate directly on reactive array
  let rel = ''
  if (p === 'content/content') {
    rel = ''
  } else if (p.startsWith('content/content/')) {
    rel = p.slice('content/content/'.length)
  } else {
    return
  }

  if (o === 'PUSH' && rel === '') {
    messages.value.push(v as Message)
  } else if (rel !== '') {
    applyPatch(messages.value, { p: rel, o, v })
  }

  const last = messages.value[messages.value.length - 1]
  isLoading.value = !!(last?.role === 'ASSISTANT' && last.status !== MessageStatus.Finished)
  scrollToBottom()
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
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.chat-view {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* ---------- messages ---------- */

.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 1em;
}

.message-item {
  display: flex;
  gap: 10px;
  max-width: 50rem;
  margin: 0 auto 12px;
  overflow-wrap: anywhere;
}

.message-item.user {
  justify-content: flex-end;
}

/* avatar */

.message-avatar {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #d9d9d9;
  border-radius: 50%;
  font-size: 18px;
  color: #666;
}

.user .message-avatar {
  color: #1677ff;
  border-color: #91caff;
}

/* body */

.message-body-container {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.message-body[data-fill] {
  flex: 1;
}

.message-body {
  overflow: hidden;
}

.user .message-body {
  background: #e0ebff;
  padding: 0.5em 1em;
  border-radius: 1em;
  border-bottom-right-radius: 0;
}

.assistant .message-body {
  padding: 0.25em 0;
}

.fragment {
  white-space: pre-wrap;
  line-height: 1.6;
  word-break: break-word;
}

.user .fragment {
  color: #000;
}

/* ---------- wip ---------- */

.wip-tip {
  color: #999;
  font-size: 14px;
  margin-top: 2px;
}

.wip-tip .spin {
  animation: spin 1s linear infinite;
}

/* ---------- input ---------- */

.input-container {
  padding: 1em 1em 0 1em;
  background: var(--background, #fff);
}

.input-message {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--input-border-color, #d9d9d9);
  border-radius: 1em;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.06);
  width: 100%;
  max-width: 50rem;
  margin: 0 auto;
  overflow: hidden;
}

.input-message textarea {
  flex: 1;
  border: none;
  outline: none;
  padding: 0.75em 1em;
  resize: none;
  font-size: 14px;
  font-family: inherit;
  line-height: 1.6;
  min-height: 4em;
  max-height: calc(100vh - 20em);
  background: transparent;
}

.bottom-row {
  display: flex;
  align-items: center;
  padding: 0 0.75em 0.75em 0.75em;
}

.flex-space {
  flex: 1;
}
</style>
