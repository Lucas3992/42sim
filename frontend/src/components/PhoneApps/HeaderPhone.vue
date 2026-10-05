<script setup lang="ts">
    import { ref } from 'vue';
    import { onMounted, onUnmounted, computed } from 'vue';
    import { useLanguage } from '../utils/useLang';

    const now = ref(new Date());
    let timer: ReturnType<typeof setInterval>;

    onMounted(() => {
        timer = setInterval(() => {
            now.value = new Date();
        }, 1000);
    });

    onUnmounted(() => {
        clearInterval(timer);
    });

    const { currentLanguage } = useLanguage();
    const  locales = { EN: 'en-GB', FR: 'fr-BE', NL: 'nl-BE' };

    const dateLabel = computed(() =>
        now.value.toLocaleDateString(locales[currentLanguage.value], {
            weekday: 'long',
            day: 'numeric',
            month: 'numeric',
        })
    )

    const timeLabel = computed (() =>
        now.value.toLocaleTimeString(locales[currentLanguage.value], {
            hour: '2-digit',
            minute: '2-digit',
            hourCycle: 'h23',
        })
    )

</script>

<template>
    <div class="status-bar">
        <span class="status-bar__date">{{ dateLabel }}</span>
        <span class="status-bar__time">{{ timeLabel }}</span>
    </div>
</template>

<style scoped>

.status-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    height: 100%;
    padding: 0 var(--space-4);
    font-size: var(--text-xs);
    color: #ffffff;
    white-space: nowrap;
    text-transform: capitalize;
}

</style>