import localAvatar from '@/assets/img/avatars/for_sure.jpeg';

export function avatarSrc(url: string | null | undefined, fallback: string = localAvatar): string {
	if (!url)
		return fallback;
	return url.startsWith('http') ? url : `https://localhost:3000${url}`;
}