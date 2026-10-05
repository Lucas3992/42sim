<script setup lang="ts">
	import { useAuth } from '@/components/utils/useAuth';
	import { useRouter } from 'vue-router';
	import { onMounted } from 'vue';
    import { useI18n } from 'vue-i18n';
	import { usePhone } from '@/components/utils/usePhone';

	const { t } = useI18n();

	const { logout } = useAuth();
	const router = useRouter();
	const resetPhone = usePhone();

	async function handleLogout() {
		await logout();
		router.push('/');
		resetPhone.handleHome();
	}

	onMounted(handleLogout);

</script>

<template>
	{{ t('auth.disconnecting') }}
</template>

<style scoped>

</style>