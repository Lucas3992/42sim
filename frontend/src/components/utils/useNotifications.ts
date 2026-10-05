import { ref } from 'vue';
import notificationSound from '@/assets/sounds/notification.mp3';

export interface AppNotification {
    id: number;
    userId: number;
    username: string;
	avatarUrl: string | null;
}

//const DEBUG_PERSIST = true;//debug

const DURATION_MS = 3000;

const current = ref<AppNotification | null>(null);
let timer: ReturnType<typeof setTimeout> | null = null;
let nextId = 0;

const sound = new Audio(notificationSound);
sound.volume = 1;

function playSound() {
    sound.currentTime = 0;
    sound.play().catch(() => {});
}

function stopTimer() {
    if (timer) {
        clearTimeout(timer);
        timer = null;
    }
}

function dismiss() {
    stopTimer();
    current.value = null;
}

function startTimer() {
//    if (DEBUG_PERSIST)
//        return;
    stopTimer();
    timer = setTimeout(dismiss, DURATION_MS);
}

function push(userId: number, username: string, avatarUrl: string | null) {
    current.value = { id: nextId++, userId, username, avatarUrl };
    startTimer();
    playSound();
}

function pause() {
    stopTimer();
}

function resume() {
    if (current.value)
        startTimer();
}

export function useNotifications() {
    return { current, push, dismiss, pause, resume };
}