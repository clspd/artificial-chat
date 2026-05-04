<template>
  <div class="app-main-app" role="main">
    <a-layout>
      <a-layout-sider
        v-model:collapsed="collapsed"
        :collapsed-width="0"
        :width="250"
        class="sidebar"
        theme="light"
        role="navigation"
        aria-label="侧边栏导航"
      >
        <div class="sidebar-header">
          <h1>{{ t('app.title') }}</h1>
        </div>

        <div class="sidebar-content">
          <a-button
            type="primary"
            block
            @click="createNewChat"
            class="new-chat-btn"
            aria-label="创建新对话"
          >
            {{ t('chat.newChat') }}
          </a-button>

          <nav class="chat-history" role="region" aria-label="对话历史列表">
            <div v-if="chatSessions.length === 0" class="empty-state">
              {{ t('chat.noChatHistory') }}
            </div>
            <ul v-else class="session-list">
              <li v-for="session in chatSessions" :key="session.id">
                <a-button
                  type="text"
                  size="small"
                  :class="['session-btn', { active: currentChatId === session.id }]"
                  @click="selectChat(session.id)"
                  :aria-current="currentChatId === session.id ? 'page' : undefined"
                  :aria-label="`选择对话: ${session.name}`"
                >
                  {{ session.name }}
                </a-button>
              </li>
            </ul>
          </nav>
        </div>

        <div class="sidebar-footer">
          <a-button
            type="text"
            @click="logout"
            aria-label="登出账户"
          >
            {{ t('auth.logout') }}
          </a-button>
        </div>
      </a-layout-sider>

      <a-layout>
        <a-layout-header class="header">
          <a-button
            type="text"
            @click="collapsed = !collapsed"
            class="toggle-button"
            :aria-label="collapsed ? '展开侧边栏' : '收起侧边栏'"
            aria-expanded="true"
          >
            <MenuFoldOutlined />
          </a-button>
        </a-layout-header>

        <a-layout-content class="content" role="main">
          <div v-if="!currentChat" class="empty-chat">
            <p role="status">{{ t('chat.selectOrCreateChat') }}</p>
          </div>
          <ChatWindow
            v-else
            :chat="currentChat"
          />
        </a-layout-content>
      </a-layout>
    </a-layout>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { MenuFoldOutlined } from '@ant-design/icons-vue'
import { useTranslation } from 'i18next-vue'
import ChatWindow from './components/ChatWindow.vue'
import { fetchChatSessions, createChat } from './api/chat'

const { t } = useTranslation()

const collapsed = ref(false)
const chatSessions = ref<Array<{ id: string; name: string }>>([])
const currentChatId = ref<string | null>(null)

const currentChat = computed(() =>
  chatSessions.value.find((chat) => chat.id === currentChatId.value)
)

async function loadChatSessions() {
  try {
    const sessions = await fetchChatSessions()
    chatSessions.value = sessions
    if (sessions.length > 0 && !currentChatId.value) {
      currentChatId.value = sessions[0].id
    }
  } catch (error) {
    console.error('Failed to load chat sessions:', error)
  }
}

async function createNewChat() {
  try {
    const result = await createChat()
    if (result.success) {
      const name = `${t('chat.newChat')} ${new Date().toLocaleTimeString()}`
      chatSessions.value.push({ id: result.chat_id, name })
      currentChatId.value = result.chat_id
    }
  } catch (error) {
    console.error('Failed to create new chat:', error)
  }
}

function selectChat(chatId: string) {
  currentChatId.value = chatId
}

function logout() {
  localStorage.removeItem('user::isLoggedIn')
  window.location.href = '/auth/login.html'
}

onMounted(() => {
  loadChatSessions()
})
</script>

<style scoped lang="less">
.app-main-app {
  width: 100%;
  height: 100vh;
  display: flex;

  :deep(.ant-layout) {
    height: 100%;
  }

  :deep(.ant-layout-sider) {
    background: #fafafa;
    border-right: 1px solid #f0f0f0;
    display: flex;
    flex-direction: column;

    .sidebar-header {
      padding: 20px;
      border-bottom: 1px solid #f0f0f0;
      h1 {
        margin: 0;
        font-size: 18px;
        font-weight: 600;
        color: #1f2937;
      }
    }

    .sidebar-content {
      padding: 16px;
      flex: 1;
      overflow-y: auto;

      .new-chat-btn {
        margin-bottom: 16px;
        width: 100%;
      }

      .chat-history {
        .empty-state {
          text-align: center;
          color: #999;
          font-size: 12px;
          padding: 20px 10px;
        }

        .session-list {
          list-style: none;
          margin: 0;
          padding: 0;

          .session-btn {
            width: 100%;
            text-align: left;
            padding: 8px 12px;
            border-radius: 4px;

            &.active {
              background: #f0f7ff;
              color: #1890ff;
            }

            &:hover {
              background: #f5f5f5;
            }
          }
        }
      }
    }

    .sidebar-footer {
      padding: 16px;
      border-top: 1px solid #f0f0f0;
    }
  }

  :deep(.ant-layout-header) {
    background: white;
    border-bottom: 1px solid #f0f0f0;
    padding: 0 16px;
    display: flex;
    align-items: center;

    .toggle-button {
      font-size: 18px;
    }
  }

  :deep(.ant-layout-content) {
    background: white;
    overflow-y: auto;

    .empty-chat {
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100%;
      color: #999;
    }
  }
}
</style>
