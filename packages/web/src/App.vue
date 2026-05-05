<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { MenuFoldOutlined } from '@ant-design/icons-vue'
import { Modal } from 'ant-design-vue'
import { useTranslation } from 'i18next-vue'
import SidebarContent from '@/components/SidebarContent.vue'
import { fetchChatSessions, createChat, ApiError } from '@/api/chat'

const { t } = useTranslation()
const router = useRouter()
const route = useRoute()

const windowWidth = ref(window.innerWidth)
const isLargeScreen = computed(() => windowWidth.value >= 640)
const sidebarCollapsed = ref(false)

function onResize() { windowWidth.value = window.innerWidth }

onMounted(() => {
  window.addEventListener('resize', onResize)
  if (!isLargeScreen.value) sidebarCollapsed.value = true
  loadChatSessions()
})

onUnmounted(() => { window.removeEventListener('resize', onResize) })

const chatSessions = ref<Array<{ id: string; name: string }>>([])
const currentChatId = computed(() => (route.params as any).chatId as string | null)
const currentChatName = computed(() =>
  chatSessions.value.find((s) => s.id === currentChatId.value)?.name
)

function handleApiError(e: unknown): boolean {
  if (!(e instanceof ApiError)) return false
  if (e.status === 401) {
    window.location.href = '/auth/login.html'
    return true
  }
  if (e.status === 403) {
    Modal.error({ title: t('common.error'), content: e.body || t('auth.accountDisabled') })
    return true
  }
  return false
}

async function loadChatSessions() {
  try {
    chatSessions.value = await fetchChatSessions()
  } catch (e) { handleApiError(e) }
}

async function createNewChat() {
  try {
    const result = await createChat()
    if (result.success) {
      const name = `${t('chat.newChat')} ${new Date().toLocaleTimeString()}`
      chatSessions.value.push({ id: result.chat_id, name })
      router.push({ name: 'chat', params: { chatId: result.chat_id } })
      if (!isLargeScreen.value) sidebarCollapsed.value = true
    }
  } catch (e) { handleApiError(e) }
}

function selectChat(chatId: string) {
  router.push({ name: 'chat', params: { chatId } })
}

function selectChatAndClose(chatId: string) {
  selectChat(chatId)
  if (!isLargeScreen.value) sidebarCollapsed.value = true
}

function logout() {
  localStorage.removeItem('user::isLoggedIn')
  window.location.href = '/auth/login.html'
}
</script>

<template>
  <div class="app-main-app">
    <a-layout class="main-layout">
      <!-- Desktop sidebar -->
      <a-layout-sider
        v-if="isLargeScreen"
        class="sidebar-sider"
        :width="250"
        :collapsed-width="0"
        :collapsed="sidebarCollapsed"
        theme="light"
      >
        <SidebarContent
          :chat-sessions="chatSessions"
          :current-chat-id="currentChatId"
          @create="createNewChat"
          @select="selectChat"
          @collapse="sidebarCollapsed = !sidebarCollapsed"
          @logout="logout"
        />
      </a-layout-sider>

      <!-- Mobile drawer -->
      <a-drawer
        v-else
        :width="Math.min(windowWidth, 250)"
        :open="!sidebarCollapsed"
        placement="left"
        :closable="false"
        :header-style="{ padding: 0, border: 0 }"
        :body-style="{ padding: 0, display: 'flex', flexDirection: 'column' }"
        @close="sidebarCollapsed = true"
      >
        <SidebarContent
          :chat-sessions="chatSessions"
          :current-chat-id="currentChatId"
          @create="createNewChat"
          @select="selectChatAndClose"
          @collapse="sidebarCollapsed = !sidebarCollapsed"
          @logout="logout"
        />
      </a-drawer>

      <a-layout class="main-content">
        <a-layout-header class="main-content-header">
          <div class="header-bar">
            <a-button
              v-if="!isLargeScreen || sidebarCollapsed"
              type="text"
              shape="circle"
              @click="sidebarCollapsed = !sidebarCollapsed"
            >
              <MenuFoldOutlined />
            </a-button>
            <div class="flexible-space" />
            <span class="title-text">{{ currentChatName || t('app.title') }}</span>
            <div class="flexible-space" />
          </div>
        </a-layout-header>

        <a-layout-content class="main-content-body">
          <router-view />
        </a-layout-content>
      </a-layout>
    </a-layout>
  </div>
</template>

<style scoped>
.app-main-app {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.main-layout {
  height: 100%;
}

.main-layout :deep(.ant-layout) {
  background: unset;
}

.sidebar-sider {
  background: var(--layout-sider-bg, #fafafa) !important;
  border-right: 1px solid var(--split-border-color, #f0f0f0);
}

.main-content {
  overflow: hidden;
}

.main-content-header {
  padding: 0;
  height: auto;
  line-height: 1em;
  background: var(--layout-header-bg, #fff);
  border-bottom: 1px solid var(--split-border-color, #f0f0f0);
  position: sticky;
  top: 0;
  z-index: 1;
}

.header-bar {
  display: flex;
  align-items: center;
  padding: 0.5em;
}

.flexible-space {
  flex: 1;
}

.title-text {
  font-weight: bold;
  text-overflow: ellipsis;
  white-space: nowrap;
  overflow: hidden;
  text-align: center;
}

.main-content-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
</style>
