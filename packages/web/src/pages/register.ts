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
 * 显示模态对话框
 */
function showModal(title: string, message: string, onConfirm: () => void = () => {}) {
  const modal = document.getElementById('modal') as HTMLElement
  const titleEl = document.getElementById('modal-title') as HTMLElement
  const messageEl = document.getElementById('modal-message') as HTMLElement
  const button = document.getElementById('modal-button') as HTMLButtonElement

  titleEl.textContent = title
  messageEl.textContent = message

  const handleConfirm = () => {
    modal.classList.remove('show')
    button.removeEventListener('click', handleConfirm)
    onConfirm()
  }

  button.addEventListener('click', handleConfirm)
  modal.classList.add('show')
}

/**
 * 处理注册表单提交
 */
async function handleRegister(e: Event) {
  e.preventDefault()
  clearErrors()

  const form = e.target as HTMLFormElement
  const usernameInput = document.getElementById('username') as HTMLInputElement
  const passwordInput = document.getElementById('password') as HTMLInputElement
  const codeInput = document.getElementById('code') as HTMLInputElement
  const registerBtn = document.getElementById('register-btn') as HTMLButtonElement

  // 获取表单值
  const username = usernameInput.value.trim()
  const password = passwordInput.value
  const code = codeInput.value.trim()

  // 验证
  if (!username) {
    showError('username', '请输入用户名')
    return
  }
  if (!password) {
    showError('password', '请输入密码')
    return
  }
  if (!code) {
    showError('code', '请输入邀请码')
    return
  }

  // 禁用按钮并显示加载状态
  registerBtn.disabled = true
  const originalText = registerBtn.textContent
  registerBtn.textContent = '注册中...'

  try {
    // 1. 对密码进行 SHA256 哈希（客户端）
    const passwordHash = await sha256(password)

    // 2. 发送注册请求
    const response = await fetch('/api/v1/user/addUserWeb', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username,
        password: passwordHash,
        code,
      }),
    })

    const data = await response.json()

    if (response.status === 201 && data.success) {
      // 注册成功
      showModal('注册成功', '注册成功！请返回登录页面。', () => {
        window.location.href = '/auth/login.html'
      })
    } else {
      // 注册失败
      const errorMessage = data.error || `注册失败 (状态码: ${response.status})`
      showModal('注册失败', errorMessage)

      // 根据状态码处理不同的错误
      if (response.status === 409) {
        showError('username', '用户名已存在')
      } else if (response.status === 403) {
        showError('code', '邀请码无效')
      } else {
        showError('password', errorMessage)
      }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '网络错误'
    showModal('注册失败', `注册失败: ${errorMessage}`)
  } finally {
    registerBtn.disabled = false
    registerBtn.textContent = originalText
  }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('register-form') as HTMLFormElement
  if (form) {
    form.addEventListener('submit', handleRegister)
  }
})
