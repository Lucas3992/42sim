<script setup lang="ts">
  import { ref } from 'vue';
  import { useRouter } from 'vue-router';
  import { useAuth } from '@/components/useAuth';
  import AppHeader from '@/components/AppHeader.vue';
  import { useI18n } from 'vue-i18n';

  const { t } = useI18n();

  const router = useRouter();
  const { register } = useAuth();

  const email = ref('');
  const password = ref('');
  const username = ref('');
  const errorMsg = ref('');
  const suggestions = ref<string[]>([]);
  const loading = ref(false);

  const emit = defineEmits<{ success: [] }>();

  async function handleRegister() {
    errorMsg.value = '';
    suggestions.value = [];
    loading.value = true;

    const result = await register(
      email.value,
      password.value,
      username.value || undefined
    );

    loading.value = false;

    if (!result?.success) {
      errorMsg.value = result?.error ?? 'Registration failed';
      if (result?.suggestions) suggestions.value = result.suggestions;
        return;
    }

    emit('success');
    router.push('/home');
  }
</script>

<template>
  <AppHeader />

  <main class="register-main">
    <form class="register-form" @submit.prevent="handleRegister">

      <input v-model="email" type="email" class="login-input" placeholder="Email" required />
      <input v-model="password" type="password" class="login-input" :placeholder="t('auth.password')" required />
      <input v-model="username" type="text" class="login-input" :placeholder="t('auth.username')" (optional) />

      <button class="btn btn-block btn-white" type="submit" :disabled="loading">
        {{ loading ? t('common.pleaseWait') : t('common.confirm') }} </button>

      <router-link to="/" class="btn btn-block btn-teal">
        {{ t('common.back') }} </router-link>

      <p v-if="errorMsg" class="error-msg">{{ errorMsg }}</p>

      <ul v-if="suggestions.length" class="suggestions-list">
        <li v-for="s in suggestions" :key="s">{{ s }}</li>
      </ul>

    </form>
  </main>
</template>

<style scoped>
  .register-main {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 70vh;
  }

  .register-form {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
    width: 100%;
    max-width: 320px;
  }

  .login-input {
    width: 100%;
    padding: var(--space-4) var(--space-6);
    font-size: var(--text-base);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    background: var(--color-surface);
    color: var(--color-text);
  }

  .error-msg {
    color: var(--color-error);
    font-size: var(--text-sm);
  }

  .suggestions-list {
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    font-size: var(--text-sm);
    color: var(--color-text-muted);
  }
</style>