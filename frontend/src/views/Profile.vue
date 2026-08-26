<script setup lang="ts">
import { ref, computed } from 'vue';
import AppHeader from '@/components/AppHeader.vue';
import { useAuth } from '@/components/useAuth';
import guestAvatar from '@/assets/img/avatars/kevin_malone.jpeg';
import localAvatar from '@/assets/img/avatars/for_sure.jpeg';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const GUEST_AVATAR = guestAvatar;
const LOCAL_AVATAR = localAvatar;

const { user, fetchUser } = useAuth();

const fileInput = ref<HTMLInputElement | null>(null);
const isUploading = ref(false);
const errorMessage = ref('');

const avatarSrc = computed(() => {
  const url = user.value?.avatar_url;
  if (!url) 
    return user.value ? LOCAL_AVATAR : GUEST_AVATAR;
  if (url.startsWith('http')) 
    return url;
  return `https://localhost:3000${url}`;
});

function triggerFileSelect() {
  fileInput.value?.click();
}

async function handleFileChange(event: Event) {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) 
    return;

  errorMessage.value = '';
  isUploading.value = true;

  const formData = new FormData();
  formData.append('file', file);

  try {
    const res = await fetch('https://localhost:3000/users/me/avatar', {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      errorMessage.value = data.error || 'Upload failed';
      return;
    }
  } catch (err) {
    errorMessage.value = 'Network error, please try again';
    return;
  } finally {
    isUploading.value = false;
    target.value = '';
  }
  await fetchUser();
}

</script>

<template>
  <AppHeader />

  <main class="container">
    <section class="card profile-card">
      <div class="avatar-block">
        <div class="avatar-wrapper">
          <img :src="avatarSrc" alt="Avatar" class="profile-avatar" />
        </div>
        <button class="btn btn-secondary" :disabled="isUploading" @click="triggerFileSelect">
          {{ isUploading ? t('common.pleaseWait') : t('profile.changeAvatar') }}
        </button>
        <input
          ref="fileInput"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          class="hidden-input"
          @change="handleFileChange"
        />
        <p v-if="errorMessage" class="error-text">{{ errorMessage }}</p>
      </div>

      <div class="info-block">
        <h2>{{ user?.username }}</h2>
        <p class="info-line"><span class="info-label">Email</span>{{ user?.email }}</p>
        <p class="info-line"><span class="info-label">Ta soeur</span>-</p>
        <p class="info-line"><span class="info-label">Bio</span>-</p>
      </div>
    </section>
    <router-link to="/home" class="btn btn-block btn-teal"> {{ t('common.back') }} </router-link>

  </main>
</template>

<style scoped>
.profile-card {
  display: flex;
  gap: var(--space-8);
  align-items: flex-start;
  margin-top: var(--space-8);
}

.avatar-block {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-3);
}

.avatar-wrapper {
  width: 120px;
  height: 120px;
  border-radius: var(--radius-full);
  overflow: hidden;
  border: 1px solid var(--color-border);
  background: var(--color-surface-2);
}

.profile-avatar {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.hidden-input {
  display: none;
}

.error-text {
  color: var(--color-error);
  font-size: var(--text-xs);
}

.info-block {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.info-line {
  color: var(--color-text);
  font-size: var(--text-sm);
}

.info-label {
  display: inline-block;
  min-width: 110px;
  color: var(--color-text-muted);
  font-weight: 600;
}

.btn {
  margin-top: 10px;
}

</style>