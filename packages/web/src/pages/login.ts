import { Message } from 'ant-design-vue'

/**
 * SHA256 哈希函数
 */
async function sha256(message: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(message)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
  return hashHex
}

/**
 * 清除错误提示
 */
function clearErrors() {
  const errorElements = document.querySelectorAll('.error-message')
  errorElements.forEach((el) => {
    el.textContent = ''
  })
}

/**
 * 显示错误提示
 */
function showError(fieldId: string, message: string) {
  const errorEl = document.getElementById(`${fieldId}-error`)
  if (errorEl) {
    errorEl.textContent = message
  }
}

/**
 * 显示提示消息（这里使用简单的alert，实际应使用Ant Design Message）
 */
async function showMessage(type: 'success' | 'error' | 'info', content: string) {
  // 简单实现，实际应该集成Ant Design Message
  if (type === 'error') {
    console.error(content)
  } else {
    console.log(content)
  }
}

/**
 * 处理登录表单提交
 */
async function handleLogin(e: Event) {
  e.preventDefault()
  clearErrors()

  const form = e.target as HTMLFormElement
  const usernameInput = document.getElementById('username') as HTMLInputElement
  const passwordInput = document.getElementById('password') as HTMLInputElement
  const rememberCheckbox = document.getElementById('remember') as HTMLInputElement
  const loginBtn = document.getElementById('login-btn') as HTMLButtonElement

  // 获取表单值
  const username = usernameInput.value.trim()
  const password = passwordInput.value
  const remember = rememberCheckbox.checked

  // 验证
  if (!username) {
    showError('username', '请输入用户名')
    return
  }
  if (!password) {
    showError('password', '请输入密码')
    return
  }

  // 禁用按钮并显示加载状态
  loginBtn.disabled = true
  const originalText = loginBtn.textContent
  loginBtn.textContent = '登录中...'

  try {
    // 1. 对密码进行 SHA256 哈希（客户端）
    const passwordHash = await sha256(password)

    // 2. 发送登录请求
    const response = await fetch('/api/v1/user/webLoginByPassword', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username,
        password: passwordHash,
        remember,
      }),
    })

    if (response.status === 200) {
      // 登录成功，设置登录状态并跳转
      localStorage.setItem('user::isLoggedIn', 'true')
      showMessage('success', '登录成功')
      // 延迟跳转，允许用户看到成功提示
      setTimeout(() => {
        window.location.href = '/'
      }, 500)
    } else {
      // 处理不同的错误状态码
      const data = await response.json().catch(() => ({}))
      const errorMessage = data.error || `登录失败 (状态码: ${response.status})`
      showMessage('error', errorMessage)
      showError('password', errorMessage)
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '网络错误'
    showMessage('error', `登录失败: ${errorMessage}`)
  } finally {
    loginBtn.disabled = false
    loginBtn.textContent = originalText
  }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('login-form') as HTMLFormElement
  if (form) {
    form.addEventListener('submit', handleLogin)
  }
})
