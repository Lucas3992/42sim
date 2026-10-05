<script setup lang="ts">
	import { onMounted, onUnmounted, computed } from 'vue';
	import { useTheme } from '@/components/utils/theme';
	import { useAuth } from '@/components/utils/useAuth';
	import { useHeaderMenu } from '@/components/utils/useHeaderMenu';
	import guestAvatar from '@/assets/img/avatars/kevin_malone.jpeg';
	import localAvatar from '@/assets/img/avatars/for_sure.jpeg';
	import ThemeIcon from '@/assets/svg/ThemeIcon.vue';
	import { useI18n } from 'vue-i18n';


	const GUEST_AVATAR = guestAvatar;
	const LOCAL_AVATAR = localAvatar;
	const { toggleTheme } = useTheme();
	const { user, isAuthenticated } = useAuth();
	const { isMenuOpen, toggleMenu, closeMenu } = useHeaderMenu();
	const { t } = useI18n();

	const showMenu = isMenuOpen('profile');

	const avatarSrc = computed(() => {
		if (!isAuthenticated.value)
			return GUEST_AVATAR;
		const url = user.value?.avatar_url;
		if (!url)
			return LOCAL_AVATAR;
		return url.startsWith('http') ? url : `https://localhost:3000${url}`;
	});

	function toggleProfileMenu() {
		toggleMenu('profile');
	}

	function handleClickOutside(event: MouseEvent) {
		const header = document.querySelector('.app-header');
		if (header && !header.contains(event.target as Node))
			closeMenu();
	}

	onMounted(() => document.addEventListener('click', handleClickOutside));
	onUnmounted(() => document.removeEventListener('click', handleClickOutside));

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
			<div class="settings-menu">
				<button class="avatar-btn" @click.stop="toggleProfileMenu" aria-label="Menu utilisateur">
				<img :src="avatarSrc" alt="Avatar" class="avatar-img" />
				<span class="avatar-arrow">▾</span>
				</button>
				<div v-if="showMenu" class="dropdown">
					<button class="dropdown-item" @click.stop="toggleTheme">
						<ThemeIcon />
						{{ t('profile.toggleTheme') }}
					</button>
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