import type { WebSocket } from '@fastify/websocket'
import { getSockets } from './connectionRegistry.js'

const WS_OPEN = 1;

export function sendTo(sockets: Set<WebSocket>, payload: unknown): void {
	const data = JSON.stringify(payload);
	for (const socket of sockets) {
		if (socket.readyState !== WS_OPEN)
			continue ;
		socket.send(data);
	}
}

export function sendToUser(userId: number, payload: unknown): void {
	sendTo(getSockets(userId), payload);
}