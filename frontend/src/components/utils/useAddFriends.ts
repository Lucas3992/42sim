import { ref, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useUserSearch } from '@/components/utils/useUserSearch';
import { useAuth } from '@/components/utils/useAuth';
import { useFriends } from '@/components/utils/useFriends';

export function useAddFriends() {
    const { t } = useI18n();
    const router = useRouter();
    const { isAuthenticated } = useAuth();
    const { results, isLoading, search, clearResults } = useUserSearch();
    const { refreshAll } = useFriends();

    const query = ref('');
    const justSent = ref<Set<number>>(new Set());

    function isLocked(relationStatus: string | null, userId: number) {
        return relationStatus !== null || justSent.value.has(userId);
    }

    // renvoie '' si aucune relation: c'est au composant de decider quoi afficher
    function buttonLabel(relationStatus: string | null, userId: number) {
        if (relationStatus === 'PENDING' || justSent.value.has(userId))
            return t('friends.requestSent');
        return '';
    }

    function onInput() {
        search(query.value);
    }

    function clearSearch() {
        query.value = '';
        clearResults();
    }

    async function sendRequest(friendId: number, relationStatus: string | null) {
        if (isLocked(relationStatus, friendId))
            return;
        if (!isAuthenticated.value) {
            router.push('/login');
            return;
        }

        try {
            const res = await fetch('https://localhost:3000/friends/request', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ friendId }),
            });
            if (res.status === 401) {
                router.push('/login');
                return;
            }
            if (res.ok || res.status === 409)
                justSent.value.add(friendId);
            // si l'autre avait deja envoye une demande, le backend accepte
            // automatiquement : on recharge amis + demandes
            if (res.ok)
                await refreshAll();
        } catch (err) {
            console.error('Send friend request failed', err);
        }
    }

    onUnmounted(() => {
        clearSearch();
        justSent.value.clear();
    });

    return {
        query,
        results,
        isLoading,
        isLocked,
        buttonLabel,
        onInput,
        clearSearch,
        sendRequest,
    };
}