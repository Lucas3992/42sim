import { reactive, computed } from 'vue';
import { useFriends } from '@/components/utils/useFriends';
import { useChat } from '@/components/utils/useChat';

import FriendsApp from '@/components/PhoneApps/FriendsApp.vue';
import MessagesApp from '@/components/PhoneApps/MessagesApp.vue';
import PlayApp from '@/components/PhoneApps/PlayApp.vue';
import SettingsApp from '@/components/PhoneApps/SettingsApp.vue';
import LogoutApp from '@/components/PhoneApps/LogOutApp.vue';

import FriendsIcon from '@/assets/img/apps/friends.png';
import MessagesIcon from '@/assets/img/apps/messages.png';
import PlayIcon from '@/assets/img/apps/play.png';
import SettingsIcon from '@/assets/img/apps/settings.png';
import LogoutIcon from '@/assets/img/apps/logout.png';

export type AppId = number;

export type PhoneApp = {
	id: AppId;
	icon: string;
};

export type PhoneState = {
	apps: PhoneApp[];
	activeAppId: AppId | null;
	depth: number;
	isOpen: boolean;
};

const appComponents: Record<AppId, any> = {
	0: FriendsApp,
	1: MessagesApp,
	2: PlayApp,
	3: SettingsApp,
	4: LogoutApp,
};

const phoneApps: PhoneApp[] = [
	{ id: 0, icon: FriendsIcon },
	{ id: 1, icon: MessagesIcon },
	{ id: 2, icon: PlayIcon },
	{ id: 3, icon: SettingsIcon },
	{ id: 4, icon: LogoutIcon },
];

const phone = reactive<PhoneState>({
	apps: phoneApps,
	activeAppId: null,
	depth: 0,
	isOpen: false,
});

const activeAppComponent = computed(() => {
	if (phone.activeAppId === null)
		return null;
	return appComponents[phone.activeAppId];
});

const { totalUnread } = useChat();
const { pendingCount, refreshAll } = useFriends();

function togglePhone() {
	phone.isOpen = !phone.isOpen;
}

function openApp(id: AppId) {
	phone.activeAppId = id;
	phone.depth = 1;
	refreshAll();
}

function openAppAt(id: AppId, depth: number) {
	phone.isOpen = true;
	phone.activeAppId = id;
	phone.depth = depth;
	refreshAll();
}

function goDeeper() {
	phone.depth++;
}

function handleBack() {
	if (phone.depth > 0)
		phone.depth--;
	if (phone.depth === 0)
		phone.activeAppId = null;
	refreshAll();
}

function handleHome() {
	phone.activeAppId = null;
	phone.depth = 0;
	refreshAll();
}

function badgeFor(id: AppId): number {
	switch (id) {
		case 0:
			return pendingCount.value;
		case 1:
			return totalUnread.value;
		default:
			return 0;
	}
}

export function usePhone() {
	return {
		phone,
		activeAppComponent,
		openApp,
		goDeeper,
		handleBack,
		handleHome,
    	badgeFor,
		openAppAt,
		togglePhone,
	};
}