<template>
  <div class="gencode-page">
    <a-card class="gencode-card" title="生成邀请码" :bordered="false">
      <a-form
        :model="form"
        name="gencode"
        layout="vertical"
        autocomplete="off"
        @submit.prevent="handleSubmit"
      >
        <a-form-item>
          <a-input
            v-model:value="form.source"
            name="source"
            placeholder="邀请码标识符"
            size="large"
            :status="errors.source ? 'error' : undefined"
          >
            <template #prefix>
              <TagOutlined />
            </template>
          </a-input>
          <div v-if="errors.source" class="field-error" role="alert">{{ errors.source }}</div>
        </a-form-item>

        <a-form-item>
          <a-input-password
            v-model:value="form.password"
            name="password"
            placeholder="管理密码"
            size="large"
            :status="errors.password ? 'error' : undefined"
          >
            <template #prefix>
              <LockOutlined />
            </template>
          </a-input-password>
          <div v-if="errors.password" class="field-error" role="alert">{{ errors.password }}</div>
        </a-form-item>

        <a-form-item>
          <a-date-picker
            v-model:value="form.expiry"
            show-time
            placeholder="过期于"
            size="large"
            style="width: 100%"
            :status="errors.expiry ? 'error' : undefined"
          />
          <div v-if="errors.expiry" class="field-error" role="alert">{{ errors.expiry }}</div>
        </a-form-item>

        <a-form-item>
          <a-button
            type="primary"
            html-type="submit"
            size="large"
            block
            :loading="loading"
          >
            生成邀请码
          </a-button>
        </a-form-item>
      </a-form>

      <a-alert
        v-if="result"
        type="success"
        show-icon
        :message="'邀请码生成成功！'"
      >
        <template #description>
          <a-typography-paragraph copyable :content="result" style="word-break: break-all; margin: 0;" />
        </template>
      </a-alert>
    </a-card>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import dayjs from 'dayjs'
import { TagOutlined, LockOutlined } from '@ant-design/icons-vue'

const form = reactive({
  source: '',
  password: '',
  expiry: null as dayjs.Dayjs | null,
})
const errors = reactive({ source: '', password: '', expiry: '' })
const loading = ref(false)
const result = ref('')

async function sha256(message: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(message)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

async function handleSubmit() {
  errors.source = ''
  errors.password = ''
  errors.expiry = ''
  result.value = ''

  if (!form.source.trim()) { errors.source = '请输入邀请码标识符'; return }
  if (!form.password) { errors.password = '请输入管理密码'; return }
  if (!form.expiry) { errors.expiry = '请选择过期时间'; return }

  loading.value = true

  try {
    const passwordHash = await sha256(form.password)
    const response = await fetch('/api/v1/auth/gencode', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        password: passwordHash,
        source: form.source.trim(),
        expiry: form.expiry.valueOf(),
      }),
    })

    const data = await response.json()

    if (response.ok) {
      result.value = data.value
    } else if (response.status === 401) {
      errors.password = '管理密码错误'
    } else {
      errors.password = data.error || `请求失败 (${response.status})`
    }
  } catch (error) {
    errors.password = error instanceof Error ? error.message : '网络错误'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.gencode-page {
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background: #f0f2f5;
}
.gencode-card {
  width: 100%;
  max-width: 480px;
}
.field-error {
  color: #ff4d4f;
  font-size: 12px;
  margin-top: 4px;
}
</style>
