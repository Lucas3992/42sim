import { ref, computed, watch } from 'vue'
import { useSocket } from './useSocket'
import { useNotifications } from './useNotifications'

const { push } = useNotifications();

interface FriendUser {
	id: number
	username: string
	displayName: string | null
	avatar_url: string | null
	isOnline: boolean
	lastSeenAt: string | null
}

interface PendingFriendship {
	id: number
	userAId: number
	userBId: number
	requestedBy: number
	status: 'PENDING'
	createdAt: string
	respondedAt: string | null
	requester: FriendUser
}

type ActionResult = { success: true } | { success: false; error: string }

const friends = ref<FriendUser[]>([])
const pending = ref<PendingFriendship[]>([])
const isLoading = ref(false)

const sortedFriends = computed(() =>
  [...friends.value].sort((a, b) =>
    Number(b.isOnline) - Number(a.isOnline) || a.username.localeCompare(b.username)
  )
)

const pendingCount = computed(() => pending.value.length)

async function fetchFriends() {
	try {
		const res = await fetch('https://localhost:3000/friends', { credentials: 'include' })
		if (!res.ok) {
			friends.value = []
			return
		}
		friends.value = await res.json()
	} catch (err) {
		console.error('Failed to fetch friends', err)
		friends.value = []
	}
}

async function fetchPending() {
	try {
		const res = await fetch('https://localhost:3000/friends/pending', { credentials: 'include' })
		if (!res.ok) {
			pending.value = []
			return
		}
		pending.value = await res.json()
	} catch (err) {
		console.error('Failed to fetch pending friend requests', err)
		pending.value = []
  }
}

async function refreshAll() {
	isLoading.value = true
	await Promise.all([fetchFriends(), fetchPending()])
	isLoading.value = false
}

function clearFriendsState() {
	friends.value = []
	pending.value = []
	}

async function acceptRequest(friendshipId: number): Promise<ActionResult> {
	try {
		const res = await fetch(`https://localhost:3000/friends/${friendshipId}/accept`, {
			method: 'POST',
			credentials: 'include',
		})
		if (!res.ok) 
			return { success: false, error: 'accept_failed' }
		await refreshAll()
		return { success: true }
	} catch (err) {
		console.error('Accept friend request failed', err)
		return { success: false, error: 'network_error' }
	}
}

async function rejectRequest(friendshipId: number): Promise<ActionResult> {
	try {
		const res = await fetch(`https://localhost:3000/friends/${friendshipId}/reject`, {
			method: 'POST',
			credentials: 'include',
		})
		if (!res.ok)
			return { success: false, error: 'reject_failed' }
		await refreshAll()
		return { success: true }
	} catch (err) {
		console.error('Reject friend request failed', err)
		return { success: false, error: 'network_error' }
	}
}

async function blockFriendship(friendshipId: number): Promise<ActionResult> {
	try {
		const res = await fetch(`https://localhost:3000/friends/${friendshipId}/block`, {
			method: 'POST',
			credentials: 'include',
		})
		if (!res.ok)
			return { success: false, error: 'block_failed' }
		await refreshAll()
		return { success: true }
	} catch (err) {
		console.error('Block friend failed', err)
		return { success: false, error: 'network_error' }
	}
}

async function removeFriendship(friendshipId: number): Promise<ActionResult> {
	try {
		const res = await fetch(`https://localhost:3000/friends/${friendshipId}`, {
			method: 'DELETE',
			credentials: 'include',
		})
		if (!res.ok)
			return { success: false, error: 'remove_failed' }
		await refreshAll()
		return { success: true }
	} catch (err) {
		console.error('Remove friend failed', err)
		return { success: false, error: 'network_error' }
	}
}

function applyPresence(userId: number, isOnline: boolean, lastSeenAt?: string) {
	const friend = friends.value.find((f) => f.id === userId)
	if (!friend)
		return
	const wasOnline = friend.isOnline
	friend.isOnline = isOnline
	if (lastSeenAt)
		friend.lastSeenAt = lastSeenAt
	if (isOnline && !wasOnline)
		push(friend.id, friend.username, friend.avatar_url)
}

function onSocketMessage(event: MessageEvent) {
	try {
		const data = JSON.parse(event.data)
		if (data.type === 'presence' && typeof data.userId === 'number' && typeof data.isOnline === 'boolean')
			applyPresence(data.userId, data.isOnline, data.lastSeenAt)
		else if (data.type === 'friendship_removed')
  			fetchFriends()
	} catch {
		// message non JSON-> on sen fou
	}
}

const { socket } = useSocket()

watch(socket, (ws, _previous, onCleanup) => {
	if (!ws)
		return
	const onOpen = () => { fetchFriends() }
	ws.addEventListener('message', onSocketMessage)
	ws.addEventListener('open', onOpen)

	onCleanup(() => {
		ws.removeEventListener('message', onSocketMessage)
		ws.removeEventListener('open', onOpen)
	})
}, { immediate: true })

export function useFriends() {
	return {
		friends,
		sortedFriends,
		pending,
		pendingCount,
		isLoading,
		fetchFriends,
		fetchPending,
		refreshAll,
		clearFriendsState,
		acceptRequest,
		rejectRequest,
		blockFriendship,
		removeFriendship,
	}
}