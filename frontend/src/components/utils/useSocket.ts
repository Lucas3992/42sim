import { ref, shallowRef } from 'vue';

type SocketStatus = 'connecting' | 'open' | 'closed';

const WS_URL = 'wss://localhost:3000/ws';
const MAX_DELAY = 30000;

const socket = shallowRef<WebSocket | null>(null);
const status = ref<SocketStatus>('closed');

let retryTimer: ReturnType<typeof setTimeout> | null = null;
let retryCount = 0;
let shouldReconnect = false;

function scheduleReconnect() {
	if (retryTimer)
		return;
	const delay = Math.min(1000 * 2 ** retryCount, MAX_DELAY);
	retryCount++;
	retryTimer = setTimeout(() => {
		retryTimer = null;
		if (shouldReconnect)
			connect();
	}, delay);
}

function connect() {
	shouldReconnect = true;
	const current = socket.value;
	if (current && (current.readyState === WebSocket.OPEN || current.readyState === WebSocket.CONNECTING))
		return;

	status.value = 'connecting';
	const ws = new WebSocket(WS_URL);
	socket.value = ws;

	ws.addEventListener('open', () => {
		retryCount = 0;
		status.value = 'open';
	});

	ws.addEventListener('close', (event) => {
		if (socket.value === ws) {
			socket.value = null;
			status.value = 'closed';
		}
		if (shouldReconnect && event.code !== 1000)
			scheduleReconnect();
	});
}

function disconnect() {
	shouldReconnect = false;
	if (retryTimer) {
		clearTimeout(retryTimer);
		retryTimer = null;
	}
	retryCount = 0;
	const ws = socket.value;
	socket.value = null;
	status.value = 'closed';
	ws?.close(1000);
}

window.addEventListener('pageshow', (event) => {
	if (!event.persisted || !shouldReconnect)
		return;
	const ws = socket.value;
	socket.value = null;
	ws?.close(1000);
	connect();
});

export function useSocket() {
	return { socket, status, connect, disconnect };
}