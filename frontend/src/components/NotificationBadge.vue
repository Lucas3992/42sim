<script setup lang="ts">
	import { computed } from 'vue';

	const MAX = 9;

	const props = defineProps<{
		count: number;
	}>();

	//au dela de MAX (9), on affiche "9+" au lieu du nombre exact
	const label = computed(() => {
		return props.count > MAX ? `${MAX}+` : String(props.count);
	});
</script>


<template>
    <span v-if="count > 0" class="notification-badge">{{ label }}</span>
</template>


<style scoped>

.notification-badge {
    display: inline-block;
    min-width: 16px;
    height: 16px;
    padding: 0 4px;
    border-radius: var(--radius-full);
    background: #e53935;
    color: #ffffff;
    font-size: 10px;
    font-weight: 700;
    line-height: 16px;
    text-align: center;
    box-sizing: border-box;
}
</style>