import { createRouter, createWebHistory } from 'vue-router';
import Home from '../views/Home.vue';
import Pong from '../views/HardPong.vue';
import Login from '../views/Login.vue';
import Coquin from '@/views/Coquin.vue';
import Test from '../views/Test.vue';
import Register from '@/views/Form.vue';
import { useAuth } from '@/components/utils/useAuth.ts';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'root', component: Login },
    { path: '/login', name: 'login', component: Login, meta: { guestOnly: true } },
    { path: '/register', name: 'register', component: Register, meta: { guestOnly: true } },
    { path: '/home', name: 'home', component: Home },
    { path: '/pong', name: 'pong', component: Pong },
    { path: '/chess', name: 'chess', component: () => import('../views/Chess.vue') },
    { path: '/nice-try', name: 'coquin', component: Coquin },
    { path: '/test', name: 'test', component: Test, meta: { requiresAuth: true } },
    { path: '/debug-chat', component: () => import('@/views/DebugChat.vue') }
  ],
});

router.beforeEach(async (to) => {
  const { isAuthenticated, fetchUser, user } = useAuth();

  if (user.value === null) 
    await fetchUser();

  if (to.name === 'root') 
    return isAuthenticated.value ? { name: 'home' } : { name: 'login' };

  if (to.meta.guestOnly && isAuthenticated.value) 
    return { name: 'coquin' };

  if (to.meta.requiresAuth && !isAuthenticated.value)
    return { name: 'coquin' };

  return true;
});

export default router;