<script setup lang="ts">
    import { computed, watch } from 'vue';
    import { useI18n } from 'vue-i18n';
    import { usePhone } from '@/components/utils/usePhone.ts';
    import { useFriends } from '@/components/utils/useFriends.ts';
    import { useChat } from '@/components/utils/useChat.ts';
    import type { ChatFriend } from '@/components/utils/useChat.ts';
    import { avatarSrc } from '@/components/utils/useAvatar';

    import Chat from '@/components/PhoneApps/Chat.vue';
	import Alone from '@/assets/gif/alone.gif';
    import NotificationBadge from '@/components/NotificationBadge.vue';

    const { t } = useI18n();
    const { phone, goDeeper, handleBack } = usePhone();
    const { sortedFriends } = useFriends();
    const { selectedFriend, selectFriend, unreadByUser } = useChat();

    const currentDepth = computed(() => phone.depth);

    function openChat(friend: ChatFriend) {
        selectFriend(friend);
        goDeeper();
    }

    // l'ami choisi disparait (supprime/bloque) pendant qu'on est dans le chat => retour a la liste
    watch(selectedFriend, (friend) => {
        if (friend === null && phone.depth === 2)
            handleBack();
    });
</script>

<template>
    <div class="messages-app">
        <template v-if="currentDepth === 1">
            <div class="messages-list-view">
                <h2 class="phone-app__title">{{ t('phone.messages.messages') }}</h2>

                <ul v-if="sortedFriends.length > 0" class="phone-list">
                    <li v-for="f in sortedFriends" :key="f.id">
                        <button class="phone-list-item" type="button" @click="openChat(f)">
                            <span class="phone-list-item__left row-user">
                                <span class="row-avatar-wrap">
                                    <img :src="avatarSrc(f.avatar_url)" alt="" class="row-avatar" />
                                    <span class="status-dot" :class="{ online: f.isOnline }" />
                                </span>
                                <span class="row-name">{{ f.username }}</span>
                                <NotificationBadge class="app-icon__badge" :count="unreadByUser[f.id] ?? 0" />
                            </span>
                        </button>
                    </li>
                </ul>

                <div v-else class="messages-empty"> 
					<img :src="Alone" alt="alone" class="messages-empty__img" />
				</div>
            </div>
        </template>

        <Chat v-else-if="currentDepth === 2" />
    </div>
</template>

<style scoped>
.messages-app {
    width: 100%;
    height: 100%;
    background: linear-gradient(160deg, #2800b8d2 0%, #2b40b3 100%);
    color: #1c1c1e;
    display: flex;
    flex-direction: column;
    box-sizing: border-box;
    overflow: hidden;
}

.phone-app__title {
	color: #00babc;
}

.messages-list-view {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    padding: var(--space-4) var(--space-3);
}

.messages-empty {
    display: flex;
    justify-content: center;
    padding: var(--space-4) 0;
}

.messages-empty__img {
    width: 100%;
    max-width: 160px;
    border-radius: var(--radius-md);
}

.row-user {
    min-width: 0;
    flex: 1;
}

.row-avatar-wrap {
    position: relative;
    display: inline-flex;
    flex-shrink: 0;
}

.row-avatar {
    width: 28px;
    height: 28px;
    border-radius: var(--radius-full);
    object-fit: cover;
    flex-shrink: 0;
}

.row-name {
    font-size: var(--text-xs);
    font-weight: 500;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.status-dot {
    position: absolute;
    bottom: -2px;
    right: -2px;
    width: 9px;
    height: 9px;
    border-radius: var(--radius-full);
    background: #ff0000;
    border: 1px solid white;
}

.status-dot.online {
    background: #00ff0d;
}

</style>