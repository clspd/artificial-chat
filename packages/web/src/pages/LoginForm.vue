<template>
  <div class="login-page">
    <a-card class="login-card" :title="t('app.title')" :bordered="false">
      <a-form
        :model="form"
        name="login"
        autocomplete="on"
        layout="vertical"
        @submit.prevent="handleLogin"
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
            autocomplete="current-password"
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
          <a-checkbox v-model:checked="form.remember">
            {{ t('auth.rememberMe') }}
          </a-checkbox>
        </a-form-item>

        <a-form-item>
          <a-button
            type="primary"
            html-type="submit"
            size="large"
            block
            :loading="loading"
          >
            {{ t('auth.login') }}
          </a-button>
        </a-form-item>

        <div class="register-link">
          <a href="/auth/register.html">{{ t('auth.noAccount') }}</a>
        </div>
      </a-form>
    </a-card>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { UserOutlined, LockOutlined } from '@ant-design/icons-vue'
import { useTranslation } from 'i18next-vue'

const { t } = useTranslation()

const form = reactive({
  username: '',
  password: '',
  remember: false,
})

const errors = reactive({ username: '', password: '' })
const loading = ref(false)

async function sha256(message: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(message)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

async function handleLogin() {
  errors.username = ''
  errors.password = ''

  if (!form.username.trim()) {
    errors.username = '请输入用户名'
    return
  }
  if (!form.password) {
    errors.password = '请输入密码'
    return
  }

  loading.value = true

  try {
    const passwordHash = await sha256(form.password)
    const response = await fetch('/api/v1/user/webLoginByPassword', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: form.username.trim(),
        password: passwordHash,
        remember: form.remember,
      }),
    })

    if (response.status === 200) {
      window.location.href = '/'
    } else {
      const data = await response.json().catch(() => ({}))
      errors.password = data.error || `登录失败 (${response.status})`
    }
  } catch (error) {
    errors.password = error instanceof Error ? error.message : '网络错误'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background: #f0f2f5;
}
.login-card {
  width: 100%;
  max-width: 400px;
}
.field-error {
  color: #ff4d4f;
  font-size: 12px;
  margin-top: 4px;
}
.register-link {
  text-align: center;
}
.register-link a {
  color: #1890ff;
  text-decoration: none;
}
</style>
