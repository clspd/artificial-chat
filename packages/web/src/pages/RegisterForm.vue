<template>
  <div class="register-page">
    <a-card class="register-card" :title="t('auth.register')" :bordered="false">
      <a-form
        :model="form"
        name="register"
        autocomplete="on"
        layout="vertical"
        @submit.prevent="handleRegister"
      >
        <a-form-item>
          <a-input
            v-model:value="form.username"
            name="username"
            autocomplete="username"
            :placeholder="t('auth.username')"
            size="large"
            :status="errors.username ? 'error' : undefined"
            aria-required="true"
          >
            <template #prefix>
              <UserOutlined />
            </template>
          </a-input>
          <div v-if="errors.username" class="field-error" role="alert">{{ errors.username }}</div>
        </a-form-item>

        <a-form-item>
          <a-input-password
            v-model:value="form.password"
            name="password"
            autocomplete="new-password"
            :placeholder="t('auth.password')"
            size="large"
            :status="errors.password ? 'error' : undefined"
            aria-required="true"
          >
            <template #prefix>
              <LockOutlined />
            </template>
          </a-input-password>
          <div v-if="errors.password" class="field-error" role="alert">{{ errors.password }}</div>
        </a-form-item>

        <a-form-item>
          <a-input
            v-model:value="form.code"
            name="code"
            :placeholder="t('auth.inviteCode')"
            size="large"
            :status="errors.code ? 'error' : undefined"
            aria-required="true"
          >
            <template #prefix>
              <KeyOutlined />
            </template>
          </a-input>
          <div v-if="errors.code" class="field-error" role="alert">{{ errors.code }}</div>
        </a-form-item>

        <a-form-item>
          <a-button
            type="primary"
            html-type="submit"
            size="large"
            block
            :loading="loading"
          >
            {{ t('auth.continue') }}
          </a-button>
        </a-form-item>

        <div class="login-link">
          <a href="/auth/login.html">{{ t('auth.hasAccount') }}</a>
        </div>
      </a-form>
    </a-card>

    <a-modal
      v-model:open="showResult"
      :title="resultTitle"
      :footer="null"
      @ok="showResult = false"
    >
      <p>{{ resultMessage }}</p>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { UserOutlined, LockOutlined, KeyOutlined } from '@ant-design/icons-vue'
import { useTranslation } from 'i18next-vue'

const { t } = useTranslation()

const codeParam = new URLSearchParams(window.location.search).get('code')
const form = reactive({ username: '', password: '', code: codeParam || '' })
const errors = reactive({ username: '', password: '', code: '' })
const loading = ref(false)
const showResult = ref(false)
const resultTitle = ref('')
const resultMessage = ref('')

async function sha256(message: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(message)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

async function handleRegister() {
  errors.username = ''
  errors.password = ''
  errors.code = ''

  if (!form.username.trim()) { errors.username = '请输入用户名'; return }
  if (/[^\x00-\x7F]/.test(form.username.trim())) { errors.username = '用户名只能使用英文字母、数字和符号'; return }
  if (!form.password) { errors.password = '请输入密码'; return }
  if (!form.code.trim()) { errors.code = '请输入邀请码'; return }

  loading.value = true

  try {
    const passwordHash = await sha256(form.password)
    const response = await fetch('/api/v1/user/addUserWeb', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: form.username.trim(),
        password: passwordHash,
        code: form.code.trim(),
      }),
    })

    const data = await response.json().catch(() => ({}))

    if (response.status === 201) {
      resultTitle.value = t('auth.register')
      resultMessage.value = t('auth.registerSuccess')
      showResult.value = true
      setTimeout(() => {
        window.location.href = '/auth/login.html'
      }, 1500)
    } else if (response.status === 409) {
      errors.username = '用户名已存在'
    } else if (response.status === 403) {
      errors.code = '邀请码无效'
    } else {
      errors.code = data.error || `注册失败 (${response.status})`
    }
  } catch (error) {
    errors.code = error instanceof Error ? error.message : '网络错误'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.register-page {
  position: absolute;
  inset: 0;
  padding: 10px;
  display: flex;
  justify-content: center;
  align-items: center;
  background: #f0f2f5;
}
.register-card {
  width: 100%;
  max-width: 400px;
}
.field-error {
  color: #ff4d4f;
  font-size: 12px;
  margin-top: 4px;
}
.login-link {
  text-align: center;
}
.login-link a {
  color: #1890ff;
  text-decoration: none;
}
</style>
