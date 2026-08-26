<script setup lang="ts">
import coquinGif from '@/assets/gif/coquin.gif';
import AppHeader from './AppHeader.vue';
import { useI18n } from 'vue-i18n';
 
  const { t } = useI18n();

</script>

<template>

    <AppHeader />

    <main class="coquin-main">
        <img :src="coquinGif" alt="Nice try" class="coquin-gif" />
        <h2 class="coquin-title"> {{ t('nope.niceTry') }} </h2>
  	    <router-link to="/home" class="btn btn-block btn-teal"> {{ t('common.back') }} </router-link>
    </main>

</template>

<style scoped>
  .coquin-main {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--space-6);
    min-height: 70vh;
    text-align: center;
  }

  .coquin-gif {
    max-width: 320px;
    border-radius: var(--radius-lg);
  }

  .coquin-title {
    font-size: var(--text-2xl);
  }
</style>