<script setup lang="ts">
    import { useI18n } from 'vue-i18n';
    import { useNotifications } from '@/components/utils/useNotifications';
	import { avatarSrc } from '@/components/utils/useAvatar';
    import { useChat } from '@/components/utils/useChat';
    import { usePhone } from '@/components/utils/usePhone';

    const { selectFriend } = useChat();
    const { openAppAt } = usePhone();
//	import { onMounted } from 'vue';//debug

    const { t } = useI18n();
    const { current, dismiss, pause, resume,
//		push,
	} = useNotifications();

//	onMounted(() => {
//			push(0, 'userTEST', null);
//	});

    function handleSendMessage() {
        const n = current.value;
        if (!n)
            return;
        selectFriend({ id: n.userId, username: n.username, avatar_url: n.avatarUrl });
        openAppAt(1, 2);
        dismiss();
    }

</script>

<template>
    <Transition name="toast">
        <div v-if="current" class="toast" role="status" @mouseenter="pause" @mouseleave="resume">
			<p class="toast__message">
				<img :src="avatarSrc(current.avatarUrl)" alt="" class="toast__avatar" />
				<span>{{ current.username }} {{ t('friends.justconnected') }}</span>
			</p>
			<div class="toast__actions">
				<button class="toast__btn" type="button" @click="handleSendMessage">
					{{ t('friends.sendMessage') }}
				</button>
				<button class="toast__btn" type="button" @click="dismiss">
					{{ t('common.close') }}
				</button>
        	</div>
    	</div>
    </Transition>
</template>

<style scoped>

.toast {
    width: 100%;
    background: #00babc;
    color: #ffffff;
    border-radius: var(--radius-md);
    overflow: hidden;
    box-sizing: border-box;
}

.toast__message {
    padding: var(--space-3);
    font-size: 65%;
    font-weight: 700;
    text-align: center;
	display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-2);
}

.toast__avatar {
    width: 24px;
    height: 24px;
    border-radius: var(--radius-full);
    object-fit: cover;
    flex-shrink: 0;
}

.toast__actions {
    display: flex;
    max-height: 0;
    overflow: hidden;
    transition: max-height 0.2s ease;
}

.toast:hover .toast__actions {
    max-height: 50px;
}

.toast__btn {
    flex: 1;
    padding: var(--space-2) var(--space-1);
    font-size: var(--text-xs);
    color: #ffffff;
    border-top: 1px solid rgba(255, 255, 255, 0.15);
	font-size: 65%;

}

.toast__btn + .toast__btn {
    border-left: 1px solid rgba(255, 255, 255, 0.15);
}

.toast__btn:hover {
    background: rgba(255, 255, 255, 0.12);
}

.toast-enter-active,
.toast-leave-active {
    transition: opacity 0.25s ease, transform 0.25s ease;
}

.toast-enter-from,
.toast-leave-to {
    opacity: 0;
    transform: translateY(-8px);
}
</style>