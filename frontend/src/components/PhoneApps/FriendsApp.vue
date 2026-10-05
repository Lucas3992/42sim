<script setup lang="ts">
    import { ref, computed, watch, onMounted } from 'vue';
    import { useI18n } from 'vue-i18n';
    import { usePhone } from '@/components/utils/usePhone.ts';
    import { useFriends } from '@/components/utils/useFriends.ts';

    import AddFriendsIcon from '@/assets/svg/AddFriendsIcon.vue';
    import AddFriends from './AddFriends.vue';
    import localAvatar from '@/assets/img/avatars/for_sure.jpeg';
    import Alone from '@/assets/gif/alone.gif';

    const LOCAL_AVATAR = localAvatar;

    type OptionType = 'remove' | 'block';

    const { t } = useI18n();
    const { phone, goDeeper } = usePhone();
    const { pending, sortedFriends, refreshAll, acceptRequest, rejectRequest, removeFriendship, blockFriendship } = useFriends();

    const currentDepth = computed(() => phone.depth);

    const feedback = ref<string | null>(null);

    //deux sets separes: ids de FRIENDSHIP (demandes) et ids de USER (amis)
    //sinon un friendship id 3 et un user id 3 se bloqueraient mutuellement
    const busyRequestIds = ref<Set<number>>(new Set());
    const busyFriendIds = ref<Set<number>>(new Set());

    const openOptionsId = ref<number | null>(null);
    const confirmingAction = ref<{ id: number; type: OptionType } | null>(null);

    function avatarSrc(url: string | null) {
        if (!url)
            return LOCAL_AVATAR;
        return url.startsWith('http') ? url : `https://localhost:3000${url}`;
    }

    function showFeedback(message: string) {
        feedback.value = message;
        setTimeout(() => {
            feedback.value = null;
        }, 2000);
    }

    //accept et reject prennent l'id de la FRIENDSHIP (p.id), pas celui du user
    async function handleAccept(friendshipId: number) {
        busyRequestIds.value.add(friendshipId);
        const result = await acceptRequest(friendshipId);
        busyRequestIds.value.delete(friendshipId);
        showFeedback(result.success ? t('friends.requestAccepted') : t('common.actionFailed'));
    }

    async function handleReject(friendshipId: number) {
        busyRequestIds.value.add(friendshipId);
        const result = await rejectRequest(friendshipId);
        busyRequestIds.value.delete(friendshipId);
        showFeedback(result.success ? t('friends.requestRejected') : t('common.actionFailed'));
    }

    function closeOptions() {
        openOptionsId.value = null;
        confirmingAction.value = null;
    }

    function toggleOptions(friendId: number) {
        if (openOptionsId.value === friendId) {
            closeOptions();
            return;
        }
        openOptionsId.value = friendId;
        confirmingAction.value = null;
    }

    function isConfirming(friendId: number, type: OptionType) {
        return confirmingAction.value?.id === friendId
            && confirmingAction.value.type === type;
    }

    function optionLabel(friendId: number, type: OptionType) {
        if (isConfirming(friendId, type))
            return t('common.confirm');
        return type === 'remove' ? t('friends.remove') : t('friends.block');
    }

    // remove / block prennent l'id du USER (f.id), pas celui de la friendship
    // 1er clic: demande confirmation (4 s)
	// 2e clic: execute l'action
    async function handleOption(friendId: number, type: OptionType) {
        if (!isConfirming(friendId, type)) {
            confirmingAction.value = { id: friendId, type };
            setTimeout(() => {
                if (isConfirming(friendId, type))
                    confirmingAction.value = null;
            }, 4000);
            return;
        }

        busyFriendIds.value.add(friendId);
        const result = type === 'remove'
            ? await removeFriendship(friendId)
            : await blockFriendship(friendId);
        busyFriendIds.value.delete(friendId);
        closeOptions();

        const okKey = type === 'remove' ? 'friends.friendRemoved' : 'friends.userBlocked';
        showFeedback(result.success ? t(okKey) : t('common.actionFailed'));
    }

    //si on change d'ecran (search)-> on referme le dropdown
    watch(currentDepth, () => closeOptions());

    onMounted(() => {
        refreshAll();
    });
</script>


<template>
    <div class="phone-app">
        <template v-if="currentDepth === 1">
            <h2 class="phone-app__title">{{ t('friends.friends') }}</h2>
            <p v-if="feedback" class="friends-feedback">{{ feedback }}</p>

            <ul class="phone-list">
                <li>
                    <button class="phone-list-item" type="button" @click="goDeeper">
                        <span class="phone-list-item__left">
                            <AddFriendsIcon />
                            {{ t('friends.addFriend') }}
                        </span>
                        <span class="phone-list-item__chevron">›</span>
                    </button>
                </li>

                <li v-for="p in pending" :key="p.id" class="phone-list-row">
                    <span class="phone-list-item__left row-user">
                        <img :src="avatarSrc(p.requester.avatar_url)" alt="" class="row-avatar" />
                        <span class="row-name">{{ p.requester.username }}</span>
                    </span>

                    <span class="pending-actions">
                        <button class="pending-btn pending-btn--accept" type="button" :disabled="busyRequestIds.has(p.id)" @click="handleAccept(p.id)">
							✓
						</button>
                        <button class="pending-btn pending-btn--reject" type="button" :disabled="busyRequestIds.has(p.id)" @click="handleReject(p.id)">
							×
						</button>
                    </span>
                </li>
            </ul>

            <ul v-if="sortedFriends.length > 0" class="phone-list">
                <li v-for="f in sortedFriends" :key="f.id">

                    <div class="phone-list-row">
                        <span class="phone-list-item__left row-user">
                            <span class="row-avatar-wrap">
                                <img :src="avatarSrc(f.avatar_url)" alt="" class="row-avatar" />
                                <span class="status-dot" :class="{ online: f.isOnline }" />
                            </span>
                            <span class="row-name">{{ f.username }}</span>
                        </span>

                        <button class="options-btn" type="button" @click="toggleOptions(f.id)">⋯</button>
                    </div>

                    <div v-if="openOptionsId === f.id" class="friend-options">
                        <button class="friend-options__half" :class="{ danger: isConfirming(f.id, 'remove') }" type="button" :disabled="busyFriendIds.has(f.id)" @click="handleOption(f.id, 'remove')">
							{{ optionLabel(f.id, 'remove') }}
						</button>

                        <button class="friend-options__half" :class="{ danger: isConfirming(f.id, 'block') }" type="button" :disabled="busyFriendIds.has(f.id)" @click="handleOption(f.id, 'block')">
							{{ optionLabel(f.id, 'block') }}
						</button>
                    </div>

                </li>
            </ul>

            <div v-else class="friends-empty">
                <img :src="Alone" alt="alone" class="friends-empty__img" />
            </div>
        </template>

        <template v-else-if="currentDepth === 2">
            <h2 class="phone-app__title">{{ t('friends.addFriend') }}</h2>
            <AddFriends />
        </template>
    </div>
</template>


<style scoped>

.phone-app {
    width: 100%;
    height: 100%;
    background: linear-gradient(160deg, #886bbd 0%, #dd72b9 100%);
    color: #1c1c1e;
    display: flex;
    flex-direction: column;
    padding: var(--space-4) var(--space-3);
    box-sizing: border-box;
    overflow-y: auto;
}

.friends-feedback {
    font-size: var(--text-xs);
    font-weight: 600;
    color: #00ff00;
    padding: 0 var(--space-2);
    margin-bottom: var(--space-2);
}

.phone-list-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-3);
    padding: var(--space-2) var(--space-3);
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

.options-btn {
    flex-shrink: 0;
    width: 24px;
    height: 24px;
    border-radius: var(--radius-full);
    font-size: 16px;
    font-weight: 700;
    line-height: 1;
    color: rgba(0, 0, 0, 0.5);
}

.options-btn:hover {
    background: rgba(0, 0, 0, 0.08);
}

.friend-options {
    display: flex;
    background: rgba(0, 0, 0, 0.05);
    border-top: 1px solid rgba(0, 0, 0, 0.08);
}

.friend-options__half {
    flex: 1;
    padding: var(--space-2) var(--space-1);
    font-size: var(--text-xs);
    font-weight: 500;
    color: #1c1c1e;
    text-align: center;
    transition: background var(--transition-interactive);
}

.friend-options__half + .friend-options__half {
    border-left: 1px solid rgba(0, 0, 0, 0.08);
}

.friend-options__half:hover {
    background: rgba(0, 0, 0, 0.06);
}

.friend-options__half.danger {
    color: #e53935;
    font-weight: 700;
}

.friend-options__half:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.friends-empty {
    display: flex;
    justify-content: center;
    padding: var(--space-4) 0;
}

.friends-empty__img {
    width: 100%;
    max-width: 160px;
    border-radius: var(--radius-md);
}

.pending-actions {
    display: flex;
    gap: var(--space-1);
    flex-shrink: 0;
}

.pending-btn {
    width: 24px;
    height: 24px;
    border-radius: var(--radius-full);
    font-size: 14px;
    font-weight: 700;
    line-height: 1;
    color: #ffffff;
}

.pending-btn--accept {
    background: #43a047;
}

.pending-btn--reject {
    background: #e53935;
}

.pending-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

</style>