<script setup lang="ts">
  import { ref, onMounted, onUnmounted, computed } from 'vue';
  import { useRouter } from 'vue-router';
  import { useTheme } from '@/components/theme';
  import { useAuth } from '@/components/useAuth';
  import guestAvatar from '@/assets/img/avatars/kevin_malone.jpeg';
  import localAvatar from '@/assets/img/avatars/for_sure.jpeg';
  import ProfileIcon from '@/assets/svg/ProfileIcon.vue';
  import ThemeIcon from '@/assets/svg/ThemeIcon.vue';
  import LogoutIcon from '@/assets/svg/LogoutIcon.vue';
  import LangSwitcher from '@/components/LangSwitcher.vue';
  import { useI18n } from 'vue-i18n';

  const GUEST_AVATAR = guestAvatar;
  const LOCAL_AVATAR = localAvatar;
  const { toggleTheme } = useTheme();
  const { user, isAuthenticated, logout } = useAuth();
  const router = useRouter();
  const showMenu = ref(false);
  const menuRef = ref<HTMLElement | null>(null);
  const { t } = useI18n();


  const avatarSrc = computed(() => {
    if (!isAuthenticated.value) return GUEST_AVATAR;
    const url = user.value?.avatar_url;
    if (!url) return LOCAL_AVATAR;
    return url.startsWith('http') ? url : `https://localhost:3000${url}`;
  });

  function toggleMenu() {
    showMenu.value = !showMenu.value;
  }

  function closeMenu() {
    showMenu.value = false;
  }

  function handleClickOutside(event: MouseEvent) {
    if (menuRef.value && !menuRef.value.contains(event.target as Node))
      closeMenu();
  }

  onMounted(() => document.addEventListener('click', handleClickOutside));
  onUnmounted(() => document.removeEventListener('click', handleClickOutside));

  async function handleLogout() {
    await logout();
    closeMenu();
    router.push('/');
  }
</script>

<template>
  <header class="app-header">
    <div class="header-logo">
      <div class="fourty-two">42</div>
      <div class="bel-sim-stack">
        <span class="bel-sim-line">Belgium</span>
        <span class="bel-sim-line">Simulator</span>
      </div>
    </div>

    <div class="header-actions">
      <LangSwitcher />
      <div class="settings-menu" ref="menuRef">
        <button class="avatar-btn" @click="toggleMenu" aria-label="Menu utilisateur">
          <img :src="avatarSrc" alt="Avatar" class="avatar-img" />
          <span class="avatar-arrow">▾</span>
        </button>

        <div v-if="showMenu" class="dropdown">
          <router-link v-if="isAuthenticated" to="/profile" class="dropdown-item" @click="closeMenu">
            <ProfileIcon />
            {{ t('profile.profilePage') }} </router-link>
          <button class="dropdown-item" @click="toggleTheme">
            <ThemeIcon />
            {{ t('profile.toggleTheme') }} </button>
          <button v-if="isAuthenticated" class="dropdown-item" @click="handleLogout">
            <LogoutIcon />
            {{ t('auth.logout') }} </button>
        </div>
      </div>
    </div>
  </header>
</template>

<style scoped>
	.header-logo {
		display: flex;
		align-items: stretch;
		gap: var(--space-2);
	}

	.fourty-two {
		display: flex;
		align-items: center;
		font-family: var(--font-display), sans-serif;
		font-size: var(--text-2xl);
		font-weight: 700;
		color: var(--color-text);
		line-height: 1;
	}

	.bel-sim-stack {
		display: flex;
		flex-direction: column;
		justify-content: center;
		transform: translateY(2px);
	}

	.bel-sim-line {
		font-family: var(--font-display), sans-serif;
		font-size: var(--text-sm);
		font-weight: 700;
		color: var(--color-primary);
		text-transform: uppercase;
		line-height: 1;
	}

  .header-actions {
    display: flex;
    align-items: center;
    gap: var(--space-3);
  }

  .settings-menu {
    position: relative;
  }

	.avatar-btn {
		position: relative;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 80px;
		height: 80px;
		border-radius: var(--radius-full);
		border: 1px solid var(--color-border);
		background: var(--color-surface);
		padding: 0;
		overflow: visible;
	}

	.avatar-img {
		width: 100%;
		height: 100%;
		border-radius: var(--radius-full);
		object-fit: cover;
	}

	.avatar-arrow {
		position: absolute;
		bottom: -4px;
		right: -4px;
		font-size: var(--text-sm);
		color: var(--color-text);
		background: var(--color-surface);
		border-radius: var(--radius-full);
		width: 16px;
		height: 16px;
		display: flex;
		align-items: center;
		justify-content: center;
		opacity: 0;
		transition: opacity var(--transition-interactive);
	}

	.avatar-btn:hover .avatar-arrow {
		opacity: 1;
	}

  .dropdown {
    position: absolute;
    top: calc(100% + var(--space-2));
    right: 0;
    min-width: 160px;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-md);
    overflow: hidden;
    z-index: 20;
    }

	.dropdown-item {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: var(--space-2);
		width: 100%;
		text-align: center;
		padding: var(--space-3) var(--space-4);
		font-size: var(--text-sm);
		color: var(--color-text);
		background: transparent;
		transition: background-color var(--transition-interactive);
	}

	.dropdown-item svg {
		flex-shrink: 0;
	}

  .dropdown-item:hover {
    background: var(--color-surface-2);
  }
</style>