<script setup lang="ts">
	import { ref, computed } from 'vue';
	import { useI18n } from 'vue-i18n';
	import { useAuth } from '@/components/utils/useAuth';
	import { useLanguage } from '@/components/utils/useLang';
	import { usePhone } from '@/components/utils/usePhone';
	import guestAvatar from '@/assets/img/avatars/kevin_malone.jpeg';
	import localAvatar from '@/assets/img/avatars/for_sure.jpeg';
	import ChangeAvatarIcon from '@/assets/svg/ChangeAvatarIcon.vue';

	const { t } = useI18n();
	const { user, fetchUser, updateLanguage } = useAuth();
	const { currentLanguage } = useLanguage();
	const { phone, goDeeper } = usePhone();

	const GUEST_AVATAR = guestAvatar;
	const LOCAL_AVATAR = localAvatar;

	const fileInput = ref<HTMLInputElement | null>(null);
	const isUploading = ref(false);
	const errorMessage = ref('');

	const langMeta = {
		EN: { label: 'English', code: 'EN', flag: 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.0.0/flags/4x3/gb.svg' },
		FR: { label: 'Français', code: 'FR', flag: 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.0.0/flags/4x3/fr.svg' },
		NL: { label: 'Nederlands', code: 'NL', flag: 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.0.0/flags/4x3/nl.svg' },
	} as const;

	const avatarSrc = computed(() => {
		const url = user.value?.avatar_url;
		if (!url)
			return user.value ? LOCAL_AVATAR : GUEST_AVATAR;
		return url.startsWith('http') ? url : `https://localhost:3000${url}`;
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

	function openLanguageMenu() {
		goDeeper();
	}

	function selectLanguage(lang: keyof typeof langMeta) {
		updateLanguage(lang);
	}

	const currentLanguageMeta = computed(() => {
		return langMeta[currentLanguage.value];
	});

</script>


<template>
	<div class="phone-app">
		<h2 class="phone-app__title">{{ user!.username }}</h2>

		<template v-if="phone.depth === 1">
			<input ref="fileInput" type="file" accept="image/jpeg,image/png,image/webp" class="hidden-input" @change="handleFileChange"/>
			<p v-if="errorMessage" class="error-text">{{ errorMessage }}</p>
			<img :src="avatarSrc" alt="Avatar" class="phone-list-item__avatar" />

			<ul class="phone-list">
				<li>
					<button class="phone-list-item" type="button" @click="triggerFileSelect" :disabled="isUploading">
						<span class="phone-list-item__left">
							<ChangeAvatarIcon />
							<span>{{ isUploading ? t('common.pleaseWait') : t('profile.changeAvatar') }}</span>
						</span>
						<span class="phone-list-item__chevron">›</span>
					</button>
				</li>

				<li>
					<button class="phone-list-item" type="button" @click="openLanguageMenu">
						<span class="phone-list-item__left">
							<img :src="currentLanguageMeta.flag" class="phone-list-item__flag" />
							<span>{{ t('phone.language') }}</span>
						</span>
						<span class="phone-list-item__chevron">›</span>
					</button>
				</li>
			</ul>
		</template>

		<ul v-else-if="phone.depth === 2" class="phone-list">
			<li v-for="(meta, code) in langMeta" :key="code">
				<button class="phone-list-item" :class="{ active: code === currentLanguage }" type="button" @click="selectLanguage(code as any)">
					<span class="phone-list-item__left">
						<img :src="meta.flag" :alt="meta.label" class="phone-list-item__flag" />
						<span>{{ meta.label }}</span>
					</span>
				</button>
			</li>
		</ul>
	</div>
</template>


<style scoped>

.hidden-input {
	display: none;
}

.error-text {
	color: var(--color-error);
	font-size: var(--text-xs);
}

.phone-app {
	width: 100%;
	height: 100%;
	background: linear-gradient(160deg, #d8dadd 0%, #b8bcc2 50%, #9ea3aa 100%);
	color: #1c1c1e;
	display: flex;
	flex-direction: column;
	padding: var(--space-4) var(--space-3);
	box-sizing: border-box;
	overflow-y: auto;
}

.phone-list-item__avatar {
	width: 100%;
	height: 30%;
	border-radius: 8px;
	object-fit: cover;
	border: 1px solid rgba(0, 0, 0, 0.12);
	flex-shrink: 0;
	margin-bottom: var(--space-3);
}

.phone-list-item__flag {
	width: 20px;
	height: 15px;
	object-fit: cover;
	border-radius: 2px;
	flex-shrink: 0;
}

</style>