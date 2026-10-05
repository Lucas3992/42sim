<script setup lang="ts">
    import { ref, onMounted } from 'vue';
    import { useAuth } from '@/components/utils/useAuth';
    import AppHeader from '@/components/AppHeader.vue';
    import { useRoute, useRouter } from 'vue-router';
    import { useI18n } from 'vue-i18n';
    
    const { t } = useI18n();

    const route = useRoute();
    const router = useRouter();

    const showLoginOptions = ref(false);
    const showEmailLogin = ref(false);

    const { login } = useAuth();

    const email = ref('');
    const password = ref('');
    const errorKey  = ref('');
    const loading = ref(false);

    const emit = defineEmits<{ success: [] }>();

    const queryErrors: Record<string, string> = {
        username_taken: 'error.usernameTaken',
        already_connected: 'error.alreadyConnected',
    };

    onMounted(() => {
        const key = queryErrors[route.query.error as string];
        if (key) {
            errorKey.value = key;
            router.replace({ path: '/login' });
        }
    });

    async function handleLogin() {
        errorKey.value = '';
        loading.value = true;
        const result = await login(email.value, password.value);
        loading.value = false;
        if (!result?.success) {
            errorKey.value = result?.error ?? 'Login failed';
            return;
        }

        emit('success');
            router.push('/home');
    }

    function loginWith42() {
        window.location.href = 'https://localhost:3000/auth/42';
    }

</script>

<template>

    <AppHeader />

    <main class="login-main">
        <p v-if="errorKey" class="error-msg">{{ t(errorKey) }}</p>

        <h2 class="welcome-title"> {{ t('auth.welcome') }} </h2>

        <div v-if="!showLoginOptions" class="btn-group">
            <button class="btn btn-block btn-white" @click="showLoginOptions = true">
                {{ t('auth.login') }} 
            </button>

            <router-link to="/register" class="btn btn-block btn-white">
                 {{ t('auth.createAccount') }}
            </router-link>

            <router-link to="/home" class="btn btn-block btn-teal">
                 {{ t('auth.continueAsGuest') }} 
            </router-link>
        </div>

        <div v-if="showLoginOptions" class="btn-group">
            <button class="btn btn-block btn-white" @click="loginWith42">
                {{ t('auth.loginWith42') }} 
            </button>

            <button v-if="!showEmailLogin" class="btn btn-block btn-white" @click="showEmailLogin=true">
                {{ t('auth.loginWithEmail') }}
            </button>

            <form v-if="showEmailLogin" class="login-form" @submit.prevent="handleLogin">
                <input v-model="email" type="email" class="login-input" placeholder="Email" required />
                <input v-model="password" type="password" class="login-input" placeholder="Password" required />
                <button class="btn btn-block btn-white" type="submit" :disabled="loading">
                    {{ loading ? t('auth.loggingIn') : t('auth.login') }}
                </button>
            </form>

            <button class="btn btn-block btn-teal" @click="showLoginOptions = false; showEmailLogin = false">
                {{ t('common.back') }}
            </button>
        </div>
    </main>
</template>

<style scoped>
    .login-main {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        min-height: 70vh;
        text-align: center;
        gap: var(--space-8);
    }

    .welcome-title {
        font-size: var(--text-2xl);
    }

    .btn-group {
        display: flex;
        flex-direction: column;
        gap: var(--space-4);
        width: 100%;
        max-width: 320px;
    }

    .login-form {
        display: flex;
        flex-direction: column;
        gap: var(--space-4);
        width: 100%;
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
</style>