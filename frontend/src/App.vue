<script setup lang="ts">
	import { onMounted, watch } from 'vue';
	import { useAuth } from '@/components/utils/useAuth';
	import { useSocket } from '@/components/utils/useSocket';
	import { useFriends } from '@/components/utils/useFriends';

	const { fetchUser, isAuthenticated } = useAuth();
	const { connect, disconnect } = useSocket();
	const { clearFriendsState } = useFriends();

	watch(isAuthenticated, (loggedIn) => {
		if (loggedIn)
			connect();
		else {
			disconnect();
			clearFriendsState();
		}
	}, { immediate: true });

	onMounted(() => {
		fetchUser();
	});
</script>

<template>
	<router-view />
</template>
