<script setup lang="ts">
    import AppHeader from '@/components/AppHeader.vue';
    import { useAuth } from '@/components/utils/useAuth';
    import { useI18n } from 'vue-i18n';

    const { isAuthenticated } = useAuth();
    const { t } = useI18n();

</script>

<template>

    <AppHeader />

    <main class="pong-main">
        <router-link to="/pong" class="btn btn-block btn-white">
            Pong4Life bb</router-link>

        <router-link to="/chess" class="btn btn-block btn-white">
            {{ t('chess.launch') }}</router-link>

        <router-link  v-if="isAuthenticated" to="/test" class="btn btn-block btn-white">
            Test</router-link>

        <router-link v-if="!isAuthenticated" to="/" class="btn btn-block btn-teal">
            {{ t('common.back') }} </router-link>
    </main>

</template>

<style scoped>
    .pong-main {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: var(--space-4);
        padding-block: var(--space-12);
    }
</style>