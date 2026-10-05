import { ref, computed, watch } from 'vue'
import { useSocket } from './useSocket'
import { useAuth } from './useAuth'
import vibrationSound from '@/assets/sounds/vibration.mp3'

const API = 'https://localhost:3000'
const PAGE_SIZE = 20

export interface ChatFriend {
  id: number
  username: string
  avatar_url: string | null
}

export interface ChatMessage {
  id: number
  conversationId: number
  senderId: number
  content: string
  createdAt: string
}

const selectedFriend = ref<ChatFriend | null>(null)
const conversationId = ref<number | null>(null)
const messages = ref<ChatMessage[]>([])
const peerLastReadAt = ref<string | null>(null)
const nextCursor = ref<number | null>(null)
const isLoading = ref(false)
const isLoadingMore = ref(false)
const unreadByUser = ref<Record<number, number>>({})
let loadToken = 0

const hasMore = computed(() => nextCursor.value !== null)
const totalUnread = computed(() =>
  Object.values(unreadByUser.value).reduce((sum, n) => sum + n, 0)
)

const vibration = new Audio(vibrationSound)

const { socket } = useSocket()
const { user } = useAuth()

function playVibration() {
  vibration.currentTime = 0
  vibration.play().catch(() => {})
}

function sendJson(payload: unknown): boolean {
  const ws = socket.value
  if (!ws || ws.readyState !== WebSocket.OPEN)
    return false
  ws.send(JSON.stringify(payload))
  return true
}

function selectFriend(friend: ChatFriend) {
  selectedFriend.value = { id: friend.id, username: friend.username, avatar_url: friend.avatar_url }
}

function clearSelection() {
  selectedFriend.value = null
}

function markRead() {
  if (conversationId.value === null)
    return
  sendJson({ type: 'read', conversationId: conversationId.value })
}

async function fetchUnread(): Promise<void> {
  try {
    const res = await fetch(`${API}/conversations/unread`, { credentials: 'include' })
    if (!res.ok)
      return
    const rows: { otherUserId: number; count: number }[] = await res.json()
    const next: Record<number, number> = {}
    for (const row of rows)
      next[row.otherUserId] = row.count
    // la conversation actuellement ouverte est en train d'etre lue
    if (selectedFriend.value && conversationId.value !== null)
      delete next[selectedFriend.value.id]
    unreadByUser.value = next
  } catch (err) {
    console.error('Failed to fetch unread counts', err)
  }
}

async function loadHistory(): Promise<void> {
  const id = conversationId.value
  if (id === null)
    return
  const token = ++loadToken
  try {
    const res = await fetch(`${API}/conversations/${id}/messages?limit=${PAGE_SIZE}`, { credentials: 'include' })
    if (!res.ok || token !== loadToken)
      return
    const data = await res.json()
    const latest: ChatMessage[] = [...data.messages].reverse()

    if (messages.value.length === 0) {
      messages.value = latest
      nextCursor.value = data.nextCursor ?? null
    } else {
      // reconnexion: on garde ce qu'on a deja et on ajoute seulement les messages manquants
      const known = new Set(messages.value.map((m) => m.id))
      messages.value = [...messages.value, ...latest.filter((m) => !known.has(m.id))]
    }
    peerLastReadAt.value = data.peerLastReadAt ?? null
    markRead()
    if (selectedFriend.value)
      delete unreadByUser.value[selectedFriend.value.id]
  } catch (err) {
    console.error('Failed to load messages', err)
  }
}

async function loadOlder(): Promise<void> {
  const id = conversationId.value
  const cursor = nextCursor.value
  if (id === null || cursor === null || isLoadingMore.value)
    return
  const token = loadToken
  isLoadingMore.value = true
  try {
    const res = await fetch(`${API}/conversations/${id}/messages?limit=${PAGE_SIZE}&cursor=${cursor}`, { credentials: 'include' })
    if (!res.ok || token !== loadToken)
      return
    const data = await res.json()
    const older: ChatMessage[] = [...data.messages].reverse()
    messages.value = [...older, ...messages.value]
    nextCursor.value = data.nextCursor ?? null
  } catch (err) {
    console.error('Failed to load older messages', err)
  } finally {
    isLoadingMore.value = false
  }
}

async function enter(): Promise<void> {
  const friend = selectedFriend.value
  if (!friend)
    return
  isLoading.value = true
  const token = ++loadToken
  try {
    const res = await fetch(`${API}/conversations`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetUserId: friend.id }),
    })
    if (!res.ok || token !== loadToken)
      return
    const convo = await res.json()
    conversationId.value = convo.id
    await loadHistory()
  } catch (err) {
    console.error('Failed to open conversation', err)
  } finally {
    isLoading.value = false
  }
}

function leave() {
  loadToken++
  conversationId.value = null
  messages.value = []
  peerLastReadAt.value = null
  nextCursor.value = null
  isLoading.value = false
  isLoadingMore.value = false
}

function sendMessage(text: string): boolean {
  const content = text.trim()
  if (conversationId.value === null || content.length === 0)
    return false
  return sendJson({ type: 'message', conversationId: conversationId.value, content })
}

function isRead(message: ChatMessage): boolean {
  if (message.senderId !== user.value?.id || peerLastReadAt.value === null)
    return false
  return new Date(message.createdAt).getTime() <= new Date(peerLastReadAt.value).getTime()
}

function handleIncomingMessage(data: any) {
  const fromMe = data.senderId === user.value?.id

  if (data.conversationId === conversationId.value) {
    if (messages.value.some((m) => m.id === data.id))
      return
    messages.value.push({
      id: data.id,
      conversationId: data.conversationId,
      senderId: data.senderId,
      content: data.content,
      createdAt: data.createdAt,
    })
    if (!fromMe)
      markRead()
    return
  }

  // message prive d'un ami dans une conversation qu'on ne regarde pas => non lu + son
  if (!fromMe && data.conversationType === 'DIRECT') {
    unreadByUser.value[data.senderId] = (unreadByUser.value[data.senderId] ?? 0) + 1
    playVibration()
  }
}

function onSocketMessage(event: MessageEvent) {
  let data: any
  try {
    data = JSON.parse(event.data)
  } catch {
    return
  }
  if (data.type === 'message')
    handleIncomingMessage(data)
  else if (data.type === 'read' && data.conversationId === conversationId.value)
    peerLastReadAt.value = data.lastReadAt
  else if (data.type === 'friendship_removed') {
    delete unreadByUser.value[data.userId]
    if (selectedFriend.value?.id === data.userId) {
      leave()
      clearSelection()
    }
  }
}

watch(socket, (ws, _previous, onCleanup) => {
  if (!ws) {
    unreadByUser.value = {}
    return
  }
  const onOpen = () => {
    fetchUnread()
    if (conversationId.value !== null)
      loadHistory()
  }
  ws.addEventListener('message', onSocketMessage)
  ws.addEventListener('open', onOpen)
  if (ws.readyState === WebSocket.OPEN)
    fetchUnread()
  onCleanup(() => {
    ws.removeEventListener('message', onSocketMessage)
    ws.removeEventListener('open', onOpen)
  })
}, { immediate: true })

export function useChat() {
  return {
    selectedFriend,
    messages,
    isLoading,
    isLoadingMore,
    hasMore,
    unreadByUser,
    totalUnread,
    selectFriend,
    clearSelection,
    enter,
    leave,
    loadOlder,
    sendMessage,
    markRead,
    isRead,
  }
}