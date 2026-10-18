import { createRouter, createWebHashHistory, createWebHistory } from 'vue-router'

import HomeScreen from './screens/HomeScreen.vue'

/**
 * Opened from disk (single-file build, T-013) there is no server to answer `/moderator`,
 * so the routes live after `#` – `5proti5.html#/moderator`.
 */
const fromFile = typeof location !== 'undefined' && location.protocol === 'file:'

const router = createRouter({
  history: fromFile ? createWebHashHistory() : createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', component: HomeScreen },
    { path: '/moderator', component: () => import('./screens/moderator/ModeratorScreen.vue') },
    { path: '/board', component: () => import('./screens/board/BoardScreen.vue') },
    { path: '/editor', component: () => import('./screens/editor/EditorScreen.vue') },
  ],
})

export default router
