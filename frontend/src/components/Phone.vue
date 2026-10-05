<script setup lang="ts">
	import { usePhone } from '@/components/utils/usePhone.ts';
	import { onMounted } from 'vue';
	import { useFriends } from '@/components/utils/useFriends.ts';
	
	import NotificationBadge from '@/components/NotificationBadge.vue';
	import Phone from '@/assets/img/apps/phone.png';
	import PhoneHeader from './PhoneApps/HeaderPhone.vue';


	const { phone, activeAppComponent, openApp, handleBack, handleHome, badgeFor } = usePhone();

	const { refreshAll } = useFriends();

	onMounted(() => {
		refreshAll();
	});

</script>

<template>
	<div class="phone-overlay phone-slide-up">
		<img :src="Phone" alt="Phone UI" class="phone-img" />

		<div class="phone-screen">
			<div class="phone-header">
				<PhoneHeader />
			</div>

			<div class="phone-main">
				<div v-if="phone.activeAppId === null" class="apps-grid">
					<button v-for="app in phone.apps" :key="app.id" class="app-icon" type="button" @click="openApp(app.id)">
						<img :src="app.icon" :alt="`App ${app.id}`" class="app-icon-image" />
						<NotificationBadge class="app-icon__badge" :count="badgeFor(app.id)" />
					</button>
				</div>

				<div v-else class="app-view">
					<component :is="activeAppComponent" class="app-view-inner" />
				</div>
			</div>

			<div class="phone-bottom">
				<button class="bottom-btn bottom-back" type="button" @click="handleBack"></button>
				<button class="bottom-btn bottom-home" type="button" @click="handleHome"></button>
			</div>
		</div>
	</div>
</template>


<style scoped>

.phone-overlay {
    position: relative;
    width: 100%;
    height: 100%;
}

.phone-img {
    display: block;
    width: 100%;
    height: 95%;
}

.phone-screen {
	position: absolute;
	top: 8px;
	left: 12px;
	right: 12px;
	bottom: 7%;
	display: flex;
	flex-direction: column;
	overflow: hidden;
	border-radius: 25px 25px 0 0 ;
}

.phone-header {
	flex: 0 0 45px;
	width: 100%;
}

.apps-grid {
	width: 100%;
	height: 100%;
	display: grid;
	grid-template-columns: repeat(3, 1fr);
	grid-template-rows: repeat(6, 1fr);
	gap: 5%;
	row-gap: 2%;
	justify-items: center;
	align-items: center;
	padding-left: 5%;
	padding-right: 5%;
}

.app-icon {
	position: relative;
	background: none;
	border: none;
	padding: 0;
	cursor: pointer;
	width: 100%;
	height: 100%;
	display: flex;
	align-items: center;
	justify-content: center;
}

.app-icon-image {
	width: 100%;
	height: 100%;
	object-fit: contain;
}

.phone-main {
	flex: 1;
	min-height: 0;
	width: 100%;
	display: flex;
}

.app-view {
	width: 100%;
	height: 100%;
	min-height: 0;
    overflow: hidden;
}

.app-view-inner {
	width: 100%;
	height: 100%;
	border-radius: 4px;
}

.phone-bottom {
	flex: 0 0 45px;
	width: 100%;
	display: flex;
}

.bottom-btn {
	flex: 1;
	border: none;
	background: transparent;
	cursor: pointer;
}

.app-icon__badge {
    position: absolute;
    top: -8%;
    right: -8%;
}

</style>