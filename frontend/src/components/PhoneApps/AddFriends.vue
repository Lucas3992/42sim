<script setup lang="ts">
    import { useI18n } from 'vue-i18n';
    import { useAddFriends } from '@/components/utils/useAddFriends';
    import localAvatar from '@/assets/img/avatars/for_sure.jpeg';

    const LOCAL_AVATAR = localAvatar;
    const { t } = useI18n();

    const {
        query,
        results,
        isLoading,
        isLocked,
        buttonLabel,
        onInput,
        clearSearch,
        sendRequest,
    } = useAddFriends();

    function avatarSrc(url: string | null) {
        if (!url)
            return LOCAL_AVATAR;
        return url.startsWith('http') ? url : `https://localhost:3000${url}`;
    }
</script>

<template>
    <div class="friends-search">
        <ul class="phone-list">
            <li class="phone-search">
                <input v-model="query" type="text" class="phone-search__input" autocomplete="off" @input="onInput"/>
                <button v-if="query" class="phone-search__clear" type="button" @click="clearSearch">
					×
				</button>
            </li>
        </ul>

        <p v-if="isLoading" class="friends-search__status">{{ t('common.pleaseWait') }}</p>
        <ul v-else-if="results.length > 0" class="phone-list">
            <li v-for="u in results" :key="u.id">
                <button class="phone-list-item" type="button" :disabled="isLocked(u.relationStatus, u.id)" @click="sendRequest(u.id, u.relationStatus)">
                    <span class="phone-list-item__left friends-search__left">
                        <img :src="avatarSrc(u.avatar_url)" alt="" class="friends-search__avatar" />
                        <span class="friends-search__name">{{ u.username }}</span>
                    </span>
                    <span class="friends-search__action">
                        {{ buttonLabel(u.relationStatus, u.id) }}
                    </span>
                </button>
            </li>
        </ul>

        <p v-else-if="query.trim().length > 0" class="friends-search__status">
            {{ t('friends.noResults') }}
        </p>

    </div>
</template>

<style scoped>
.friends-search {
    width: 100%;
}

.phone-search {
    position: relative;
    display: flex;
    align-items: center;
}

.phone-search__input {
    width: 100%;
    padding: var(--space-3);
    padding-right: var(--space-8);
    background: transparent;
    border: none;
    outline: none;
    font-size: var(--text-xs);
    color: #1c1c1e;
}

.phone-search__input::placeholder {
    color: rgba(0, 0, 0, 0.4);
}

.phone-search__clear {
    position: absolute;
    right: var(--space-3);
    top: 50%;
    transform: translateY(-50%);
    font-size: var(--text-sm);
    color: rgba(0, 0, 0, 0.45);
    line-height: 1;
}

.friends-search__status {
    font-size: var(--text-xs);
    color: rgba(0, 0, 0, 0.6);
    padding: 0 var(--space-2);
}

.friends-search__left {
    min-width: 0;
    flex: 1;
}

.friends-search__avatar {
    width: 28px;
    height: 28px;
    border-radius: var(--radius-full);
    object-fit: cover;
    flex-shrink: 0;
}

.friends-search__name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.friends-search__action {
    flex-shrink: 0;
    font-size: 10px;
    font-weight: 600;
    color: var(--color-primary);
}

</style>