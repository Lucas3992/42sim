import type { WebSocket } from "@fastify/websocket";

const registry = new Map<number, Set<WebSocket>>()

export function add(userId: number, socket: WebSocket): void {
	let sock = registry.get(userId);
	if (!sock) {
		sock = new Set<WebSocket>();
		registry.set(userId, sock);
	}
	sock.add(socket);
}

export function remove(userId: number, socket: WebSocket): void {
	const sock = registry.get(userId);
	if (!sock)
		return ;
	else {
		sock.delete(socket);
		if (sock.size == 0)
			registry.delete(userId);
	}
}

export function getSockets(userId: number): Set<WebSocket> {
	return registry.get(userId) ?? new Set<WebSocket>();
}

export function isOnline(userId: number): boolean {
	return registry.has(userId);
}

export function getAllSockets(): Set<WebSocket> {
	const socketsList = new Set<WebSocket>();
	for (const setSockets of registry.values()) {
		for (const socket of setSockets)
			socketsList.add(socket); 
	}
	return socketsList;
}

export function getOnlineUserIds(): number[] {
	const keysList: number[] = [];
	for (const userId of registry.keys())
		keysList.push(userId);
	return keysList;
}

export function closeUserSockets(userId: number): void {
	for (const socket of getSockets(userId))
		socket.close(1000);
	registry.delete(userId);
}