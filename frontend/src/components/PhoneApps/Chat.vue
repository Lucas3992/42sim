<script setup lang="ts">
    import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue';
    import { useI18n } from 'vue-i18n';
    import { usePhone } from '@/components/utils/usePhone.ts';
    import { useFriends } from '@/components/utils/useFriends.ts';
    import { useChat } from '@/components/utils/useChat.ts';
    import { useAuth } from '@/components/utils/useAuth.ts';
    import { avatarSrc } from '@/components/utils/useAvatar.ts';
    import Send from '@/assets/svg/Send.vue';

    const { t } = useI18n();
    const { phone } = usePhone();
    const { friends } = useFriends();
    const { selectedFriend, messages, isLoadingMore, hasMore, enter, leave, 
            loadOlder, clearSelection, sendMessage, isRead } = useChat();
    const { user } = useAuth();
    const draft = ref('');
    const listEl = ref<HTMLElement | null>(null);

    const friendOnline = computed(() =>
        friends.value.find((f) => f.id === selectedFriend.value?.id)?.isOnline ?? false
    );

    function submit() {
        if (sendMessage(draft.value))
            draft.value = '';
    }

    function scrollToBottom() {
        nextTick(() => {
            if (listEl.value)
                listEl.value.scrollTop = listEl.value.scrollHeight;
        });
    }

    watch(() => messages.value[messages.value.length - 1]?.id, scrollToBottom);

    watch(() => selectedFriend.value?.id, (id) => {
        if (id === undefined)
            return;
        leave();
        enter();
    });

    async function handleLoadOlder() {
        const el = listEl.value;
        const previousHeight = el ? el.scrollHeight : 0;
        await loadOlder();
        await nextTick();
        if (el)
            el.scrollTop = el.scrollHeight - previousHeight;
    }

    onMounted(() => {
        enter();
    });

    onUnmounted(() => {
        leave();
        if (phone.depth < 2)
            clearSelection();
    });
</script>

<template>
    <div class="chat">
        <header v-if="selectedFriend" class="chat__header">
            <span class="chat__avatar-wrap">
                <img :src="avatarSrc(selectedFriend.avatar_url)" alt="" class="chat__avatar" />
                <span class="chat__dot" :class="{ online: friendOnline }" />
            </span>
            <span class="chat__name">{{ selectedFriend.username }}</span>
        </header>

        <ul ref="listEl" class="chat__messages">

            <li v-if="hasMore" class="chat__more">
                <button class="chat__more-btn" type="button" :disabled="isLoadingMore" @click="handleLoadOlder">
                    {{ t('phone.messages.loadMore') }}
                </button>
            </li>

            <li v-for="m in messages" :key="m.id" class="bubble" :class="m.senderId === user?.id ? 'bubble--me' : 'bubble--them'">
                <span class="bubble__text">{{ m.content }}</span>
                <span v-if="m.senderId === user?.id" class="bubble__check" :class="{ 'bubble__check--read': isRead(m) }">✓</span>
            </li>
        </ul>

        <form class="chat__form" @submit.prevent="submit">
            <input v-model="draft" class="chat__input" type="text" maxlength="2000" />
            <button class="chat__send" type="submit" :disabled="draft.trim().length === 0">
                <Send />
            </button>
        </form>
    </div>
</template>

<style scoped>
.chat {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
}

.chat__header {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-3);
}

.chat__avatar-wrap {
    position: relative;
    display: inline-flex;
    flex-shrink: 0;
}

.chat__avatar {
    width: 24px;
    height: 24px;
    border-radius: var(--radius-full);
    object-fit: cover;
}

.chat__dot {
    position: absolute;
    bottom: -2px;
    right: -2px;
    width: 8px;
    height: 8px;
    border-radius: var(--radius-full);
    background: #ff0000;
    border: 1px solid white;
}

.chat__dot.online {
    background: #00ff0d;
}

.chat__name {
    font-size: var(--text-xs);
    font-weight: 600;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: #00babc;
}

.chat__messages {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    padding: var(--space-3);
    list-style: none;
    margin: 0;
}

.chat__messages::-webkit-scrollbar {
    width: 6px;
}

.chat__messages::-webkit-scrollbar-track {
    background: transparent;
}

.chat__messages::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.35);
    border-radius: 3px;
}

.chat__messages::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 255, 255, 0.7);
}

@supports not selector(::-webkit-scrollbar) {
    .chat__messages {
        scrollbar-width: thin;
        scrollbar-color: rgba(255, 255, 255, 0.5) transparent;
    }
}

.chat__empty {
    margin: auto;
    font-size: var(--text-xs);
    color: rgba(255, 255, 255, 0.85);
}

.bubble {
    max-width: 80%;
    padding: var(--space-2) var(--space-3);
    font-size: var(--text-xs);
    display: flex;
    align-items: flex-end;
    gap: var(--space-2);
    flex-shrink: 0;
}

.bubble__text {
    overflow-wrap: anywhere;
    font-size: 90%;
}

.bubble--them {
    align-self: flex-start;
    background: rgba(255, 255, 255, 0.55);
    border-radius: 0px 8px 8px 8px;
}

.bubble--me {
    align-self: flex-end;
    background: #ffffff;
    border-radius: 8px 0px 8px 8px;
}

.bubble__check {
    flex-shrink: 0;
    font-size: 10px;
    font-weight: 700;
    color: #8e8e93;
}

.bubble__check--read {
    color: #00babc;
}

.chat__form {
    display: flex;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-3);
}

.chat__input {
    flex: 1;
    min-width: 0;
    padding: var(--space-2) var(--space-3);
    font-size: var(--text-xs);
    border: none;
    border-radius: var(--radius-md);
    background: #ffffff;
    color: #1c1c1e;
}

.chat__send {
    flex-shrink: 0;
    padding: var(--space-2) var(--space-3);
    font-size: var(--text-xs);
    font-weight: 600;
    color: #ffffff;
    background: #00babc;
    border-radius: var(--radius-md);
}

.chat__send:disabled {
    opacity: 0.5;
    cursor: default;
}

.chat__more {
    align-self: center;
    flex-shrink: 0;
}

.chat__more-btn {
    font-size: var(--text-xs);
    color: #ffffff;
    background: rgba(255, 255, 255, 0.25);
    padding: var(--space-1) var(--space-3);
    border-radius: var(--radius-full);
}

.chat__more-btn:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.4);
}

.chat__more-btn:disabled {
    opacity: 0.5;
    cursor: default;
}

</style>