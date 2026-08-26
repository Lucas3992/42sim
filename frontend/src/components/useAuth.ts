import { ref, computed } from 'vue';
import { useLanguage } from './useLang';
import type { Lang } from './useLang';

interface User {
  id: number;
  email: string;
  username: string;
  avatar_url: string | null;
  ft_login: string | null;
  prefLang: Lang;
}

const user = ref<User | null>(null);
const isAuthenticated = computed(() => user.value !== null);
const { currentLanguage, setLanguage } = useLanguage();

async function fetchUser() {
  try {
    const res = await fetch('https://localhost:3000/auth/me', {
      credentials: 'include',
    });

    if (!res.ok) {
      user.value = null;
      return;
    }

    const data = await res.json();
    user.value = data.user;

    if (user.value)
      setLanguage(user.value.prefLang);

  } catch (err) {
    console.error('Failed to fetch user', err);
    user.value = null;
  }
}

async function logout() {
  try {
    await fetch('https://localhost:3000/auth/logout', {
      method: 'POST',
      credentials: 'include',
    });
  } catch (err) {
    console.error('Logout failed', err);
  } finally {
    user.value = null;
    setLanguage('EN');

  }
}

async function login(email: string, password: string) {
  try {
    const res = await fetch('https://localhost:3000/auth/login', {
      method: 'POST',
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password}),
      credentials: 'include',
    });
    const data = await res.json();

    if (!res.ok)
      return { success: false, error: data.error };
    await fetchUser();
    return { success: true };

  } catch (err){
      console.error('Login failed', err);
      return {success:false, error: 'Network error' };
  }
}

async function register(email: string, password: string, username?: string) {
  try {
    const res = await fetch('https://localhost:3000/auth/register', {
      method: 'POST',
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, username, lang: currentLanguage.value }),
      credentials: 'include',
    });

    const data = await res.json();

    if (!res.ok)
      return { success: false, error: data.error, suggestions: data.suggestions };
    await fetchUser();
    return { success: true };

  } catch (err) {
      console.error('Register failed', err);
      return { success:false, error: 'Network error' };
  }
}

export function useAuth() {
    return { user, isAuthenticated, fetchUser, logout, login, register };
}
