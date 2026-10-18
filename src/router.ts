import { createRouter, createWebHistory } from 'vue-router'

import HomeScreen from './screens/HomeScreen.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', component: HomeScreen },
    { path: '/moderator', component: () => import('./screens/moderator/ModeratorScreen.vue') },
    { path: '/board', component: () => import('./screens/board/BoardScreen.vue') },
    { path: '/editor', component: () => import('./screens/editor/EditorScreen.vue') },
  ],
})

export default router
