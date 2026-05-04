import axios from 'axios'

const api = axios.create({
  baseURL: '/api/v1',
  timeout: 30000,
})

/**
 * 获取聊天记录列表
 */
export async function fetchChatSessions(): Promise<Array<{ id: string; name: string }>> {
  try {
    const response = await api.get('/chat/sessions')
    return response.data || []
  } catch (error) {
    console.error('Failed to fetch chat sessions:', error)
    throw error
  }
}

/**
 * 创建新聊天
 */
export async function createChat(): Promise<{ success: boolean; chat_id: string }> {
  try {
    const response = await api.post('/chat/chat')
    return response.data
  } catch (error) {
    console.error('Failed to create chat:', error)
    throw error
  }
}

/**
 * 获取聊天内容
 */
export async function getChatContent(chatId: string) {
  try {
    const response = await api.get(`/chat/chat?chat_id=${chatId}`)
    return response.data
  } catch (error) {
    console.error('Failed to get chat content:', error)
    throw error
  }
}

/**
 * 更新聊天名称
 */
export async function updateChatName(chatId: string, name: string) {
  try {
    const response = await api.patch(`/chat/chat?chat_id=${chatId}`, { name })
    return response.data
  } catch (error) {
    console.error('Failed to update chat name:', error)
    throw error
  }
}

/**
 * 删除聊天
 */
export async function deleteChat(chatId: string) {
  try {
    const response = await api.delete(`/chat/chat?chat_id=${chatId}`)
    return response.status === 202
  } catch (error) {
    console.error('Failed to delete chat:', error)
    throw error
  }
}

export default api
