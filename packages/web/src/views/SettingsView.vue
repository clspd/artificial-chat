<template>
  <div class="settings-page">
    <!-- User Info -->
    <a-card :title="t('settings.userInfo')" class="settings-card" :bordered="false">
      <a-descriptions :column="1" size="small">
        <a-descriptions-item :label="t('settings.username')">
          {{ userInfo?.username }}
        </a-descriptions-item>
        <a-descriptions-item :label="t('settings.source')">
          {{ userInfo?.user_source }}
        </a-descriptions-item>
        <a-descriptions-item :label="t('settings.createdAt')">
          {{ userInfo ? new Date(userInfo.created_at * 1000).toLocaleString() : '' }}
        </a-descriptions-item>
      </a-descriptions>
    </a-card>

    <!-- Change Password -->
    <a-card :title="t('settings.changePassword')" class="settings-card" :bordered="false">
      <a-form
        :model="passwordForm"
        layout="vertical"
        @submit.prevent="handleChangePassword"
      >
        <a-form-item>
          <a-input-password
            v-model:value="passwordForm.oldPassword"
            :placeholder="t('settings.oldPassword')"
            size="large"
            :disabled="passwordLoading"
          />
        </a-form-item>
        <a-form-item>
          <a-input-password
            v-model:value="passwordForm.newPassword"
            :placeholder="t('settings.newPassword')"
            size="large"
            :disabled="passwordLoading"
          />
        </a-form-item>
        <a-form-item>
          <a-input-password
            v-model:value="passwordForm.confirmPassword"
            :placeholder="t('settings.confirmPassword')"
            size="large"
            :status="confirmError ? 'error' : undefined"
            :disabled="passwordLoading"
          />
          <div v-if="confirmError" class="field-error" role="alert">{{ confirmError }}</div>
        </a-form-item>
        <a-form-item>
          <a-button
            type="primary"
            html-type="submit"
            :loading="passwordLoading"
            :disabled="!passwordForm.oldPassword || !passwordForm.newPassword || !passwordForm.confirmPassword"
            block
          >
            {{ t('settings.changePassword') }}
          </a-button>
        </a-form-item>
      </a-form>
    </a-card>

    <!-- Logout All -->
    <a-card :title="t('settings.logoutAll')" class="settings-card" :bordered="false">
      <a-button type="primary" danger @click="handleLogoutAll" :loading="logoutAllLoading">
        {{ t('settings.logoutAll') }}
      </a-button>
    </a-card>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, onMounted } from 'vue'
import { Modal } from 'ant-design-vue'
import { useTranslation } from 'i18next-vue'
import { fetchUserInfo, changePassword, logoutAllDevices, ApiError, type UserInfo } from '@/api/settings'

const { t } = useTranslation()

const userInfo = ref<UserInfo | null>(null)

const passwordForm = reactive({
  oldPassword: '',
  newPassword: '',
  confirmPassword: '',
})

const confirmError = ref('')
const passwordLoading = ref(false)
const logoutAllLoading = ref(false)

async function sha256(message: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(message)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

onMounted(async () => {
  try {
    userInfo.value = await fetchUserInfo()
  } catch (e) {
    if (e instanceof ApiError && (e.status === 401 || e.status === 403)) {
      window.location.href = '/auth/login.html'
    }
  }
})

async function handleChangePassword() {
  confirmError.value = ''

  if (passwordForm.newPassword !== passwordForm.confirmPassword) {
    confirmError.value = t('settings.passwordMismatch')
    return
  }

  passwordLoading.value = true
  try {
    const oldHash = await sha256(passwordForm.oldPassword)
    const newHash = await sha256(passwordForm.newPassword)
    await changePassword(oldHash, newHash)
    passwordForm.oldPassword = ''
    passwordForm.newPassword = ''
    passwordForm.confirmPassword = ''
    Modal.success({ content: t('settings.passwordChanged') })
  } catch (e) {
    if (e instanceof ApiError) {
      confirmError.value = e.body || t('common.error')
    }
  } finally {
    passwordLoading.value = false
  }
}

async function handleLogoutAll() {
  Modal.confirm({
    title: t('settings.logoutAll'),
    content: t('settings.logoutAllConfirm'),
    okText: t('settings.logoutAll'),
    okType: 'danger',
    cancelText: t('common.cancel'),
    async onOk() {
      logoutAllLoading.value = true
      try {
        await logoutAllDevices()
        localStorage.removeItem('user::isLoggedIn')
        window.location.href = '/auth/login.html'
      } catch {
        logoutAllLoading.value = false
      }
    },
  })
}
</script>

<style scoped>
.settings-page {
  max-width: 600px;
  margin: 0 auto;
  padding: 1em;
  overflow-y: auto;
  height: 100%;
}

.settings-card {
  margin-bottom: 1em;
}

.field-error {
  color: #ff4d4f;
  font-size: 12px;
  margin-top: 4px;
}
</style>
