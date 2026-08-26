import { createRouter, createWebHistory } from 'vue-router';
import Home from '../views/Home.vue';
import Pong from '../views/HardPong.vue';
import Login from '../views/Login.vue';
import Profile from '../views/Profile.vue';
import Coquin from '../components/Coquin.vue';
import { useAuth } from '@/components/useAuth';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'root', component: Login },
    { path: '/login', name: 'login', component: Login, meta: { guestOnly: true } },
    { path: '/register', name: 'register', component: () => import('../components/Form.vue'), meta: { guestOnly: true } },
    { path: '/home', name: 'home', component: Home },
    { path: '/pong', name: 'pong', component: Pong },
    { path: '/profile', name: 'profile', component: Profile, meta: { requiresAuth: true } },
    { path: '/nice-try', name: 'coquin', component: Coquin },
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