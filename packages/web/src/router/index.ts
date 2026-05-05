import { createRouter, createWebHashHistory } from 'vue-router'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      name: 'new-chat',
      component: () => import('@/views/NewChat.vue'),
    },
    {
      path: '/chat/c/:chatId',
      name: 'chat',
      component: () => import('@/views/ChatView.vue'),
      props: true,
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/',
    },
  ],
})

export default router
