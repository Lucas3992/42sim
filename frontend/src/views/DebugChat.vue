<script setup lang="ts">
import { ref, onUnmounted } from 'vue'

const API = 'https://localhost:3000'

const ws = ref<WebSocket | null>(null)
const connected = ref(false)
const log = ref<any[]>([])

const conversations = ref<any[]>([])
const targetUserId = ref<number>(2)
const conversationId = ref<number>(1)
const content = ref('hello')

function push(tag: string, data: unknown) {
  log.value.unshift({ tag, data, at: new Date().toISOString() })
}

function connect() {
  if (ws.value) ws.value.close()
  const socket = new WebSocket(`wss://localhost:3000/ws`)
  socket.onopen = () => { connected.value = true; push('open', null) }
  socket.onmessage = (e) => push('recv', JSON.parse(e.data))
  socket.onerror = () => push('error', 'socket error')
  socket.onclose = (e) => { connected.value = false; push('close', e.code) }
  ws.value = socket
}

function disconnect() {
  ws.value?.close()
  ws.value = null
}

function sendMessage() {
  if (!ws.value || ws.value.readyState !== 1) return push('error', 'socket not open')
  const payload = { type: 'message', conversationId: conversationId.value, content: content.value }
  ws.value.send(JSON.stringify(payload))
  push('sent', payload)
}

function sendRaw(raw: string) {
  if (!ws.value || ws.value.readyState !== 1) return push('error', 'socket not open')
  ws.value.send(raw)
  push('sent-raw', raw)
}

async function listConversations() {
  try {
    const res = await fetch(`${API}/conversations`, { credentials: 'include' })
    const data = await res.json()
    conversations.value = Array.isArray(data) ? data : []
    push(`GET /conversations ${res.status}`, data)
  } catch (err) {
    push('error', String(err))
  }
}

async function createConversation() {
  try {
    const res = await fetch(`${API}/conversations`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetUserId: targetUserId.value }),
    })
    const data = await res.json()
    push(`POST /conversations ${res.status}`, data)
    if (data?.id) conversationId.value = data.id
  } catch (err) {
    push('error', String(err))
  }
}

onUnmounted(disconnect)
</script>

<template>
  <div style="padding:1rem; font-family:monospace">
    <h2>Debug chat</h2>

    <section style="margin-bottom:1rem">
      <button @click="connect">connect</button>
      <button @click="disconnect">disconnect</button>
      <span> socket: {{ connected ? 'OPEN' : 'CLOSED' }}</span>
    </section>

    <section style="margin-bottom:1rem">
      <button @click="listConversations">GET /conversations</button>
      <ul>
        <li v-for="c in conversations" :key="c.id">
          #{{ c.id }} — {{ c.otherUser?.username ?? '?' }}
          <button @click="conversationId = c.id">use</button>
        </li>
      </ul>
    </section>

    <section style="margin-bottom:1rem">
      targetUserId <input v-model.number="targetUserId" type="number" style="width:60px" />
      <button @click="createConversation">POST /conversations</button>
    </section>

    <section style="margin-bottom:1rem">
      convId <input v-model.number="conversationId" type="number" style="width:60px" />
      <input v-model="content" style="width:240px" />
      <button @click="sendMessage">send</button>
      <button @click="sendRaw('{{{')">send broken json</button>
      <button @click="sendRaw('{\'type\':\'message\'}')">send incomplete</button>
    </section>

    <section>
      <button @click="log = []">clear</button>
      <pre v-for="(l, i) in log" :key="i" style="border-top:1px solid #444; margin:0; padding:.25rem">{{ l.tag }} — {{ JSON.stringify(l.data, null, 2) }}</pre>
    </section>
  </div>
</template>