<template>
  <div class="sidebar-root">
    <div class="sidebar-header">
      <h1>{{ t('app.title') }}</h1>
      <div class="flexible-space" />
      <a-button type="text" shape="circle" @click="$emit('collapse')">
        <CaretLeftFilled />
      </a-button>
    </div>

    <div class="sidebar-body">
      <a-button type="primary" block @click="$emit('create')" class="new-chat-btn">
        {{ t('chat.newChat') }}
      </a-button>

      <nav class="chat-history" role="region" aria-label="对话历史列表">
        <div v-if="chatSessions.length === 0" class="empty-state">
          {{ t('chat.noChatHistory') }}
        </div>
        <div
          v-for="session in chatSessions"
          :key="session.id"
          :class="['session-item', { active: currentChatId === session.id }]"
          role="button"
          :aria-current="currentChatId === session.id ? 'page' : undefined"
          :aria-label="`选择对话: ${session.name}`"
          tabindex="0"
          @click="$emit('select', session.id)"
          @keydown.enter="$emit('select', session.id)"
        >
          {{ session.name }}
        </div>
      </nav>
    </div>

    <div class="sidebar-footer">
      <a-button type="text" @click="$emit('logout')" aria-label="登出账户">
        {{ t('auth.logout') }}
      </a-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { CaretLeftFilled } from '@ant-design/icons-vue'
import { useTranslation } from 'i18next-vue'

defineProps<{
  chatSessions: Array<{ id: string; name: string }>
  currentChatId: string | null
}>()

defineEmits<{
  create: []
  select: [id: string]
  collapse: []
  logout: []
}>()

const { t } = useTranslation()
</script>

<style scoped>
.sidebar-root {
  display: flex;
  flex-direction: column;
  height: 100%;
  user-select: none;
}

.sidebar-header {
  display: flex;
  align-items: center;
  padding: 0.5em 1em;
}

.sidebar-header h1 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.flexible-space {
  flex: 1;
}

.sidebar-body {
  flex: 1;
  overflow-y: auto;
  padding: 0.5em;
}

.new-chat-btn {
  margin-bottom: 0.5em;
}

.chat-history {
  .empty-state {
    text-align: center;
    color: #999;
    font-size: 12px;
    padding: 20px 10px;
  }

  .session-item {
    padding: 8px 12px;
    border-radius: 4px;
    cursor: pointer;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;

    &:hover {
      background: #f5f5f5;
    }

    &.active {
      background: #f0f7ff;
      color: #1890ff;
    }
  }
}

.sidebar-footer {
  border-top: 1px solid var(--split-border-color, #f0f0f0);
  padding: 0.5em;
}
</style>
