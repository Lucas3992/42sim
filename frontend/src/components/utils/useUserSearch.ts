import { ref } from 'vue'

interface UserResult {
  id: number
  username: string
  displayName: string | null
  avatar_url: string | null
  relationStatus: 'PENDING' | 'ACCEPTED' | 'BLOCKED' | null
}

const results = ref<UserResult[]>([])
const isLoading = ref(false)

let debounceTimer: ReturnType<typeof setTimeout> | null = null
let latestQuery = ''

async function runSearch(query: string) {
  latestQuery = query
  isLoading.value = true

  try {
    const res = await fetch(
      `https://localhost:3000/users/search?q=${encodeURIComponent(query)}`,
      { credentials: 'include' }
    )

    if (query !== latestQuery)
      return

    if (!res.ok) {
      results.value = []
      return
    }

    results.value = await res.json()
  } catch (err) {
    console.error('User search failed', err)
    if (query === latestQuery)
      results.value = []
  } finally {
    if (query === latestQuery)
      isLoading.value = false
  }
}

function search(query: string) {
  const trimmed = query.trim()

  if (debounceTimer)
    clearTimeout(debounceTimer)

  if (trimmed.length === 0) {
    latestQuery = ''
    results.value = []
    isLoading.value = false
    return
  }

  debounceTimer = setTimeout(() => runSearch(trimmed), 250)
}

function clearResults() {
  if (debounceTimer)
    clearTimeout(debounceTimer)
  latestQuery = ''
  results.value = []
  isLoading.value = false
}

export function useUserSearch() {
  return { results, isLoading, search, clearResults }
}