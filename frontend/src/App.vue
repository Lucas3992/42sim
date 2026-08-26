<script setup lang="ts">
  import { onMounted } from 'vue';
  import { useAuth } from '@/components/useAuth';

  const { fetchUser } = useAuth();

  onMounted(() => {
    fetchUser();
  });
</script>

<template>
  <router-view />
</template>
