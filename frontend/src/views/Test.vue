<script setup lang="ts">
    import { ref, onMounted, onUnmounted } from 'vue';
    import AppHeader from '@/components/AppHeader.vue';
    import Rain from '@/assets/img/backgrounds/cluster.jpeg';
    import Pepito from '@/assets/img/characters/pepito.png';
    import RainMusic from '@/assets/sounds/musics/pixelRain.mp3';
    import Trumpets from '@/assets/sounds/musics/pepito.mp3';
    import { useI18n } from 'vue-i18n';
    import PhoneOverlay from '@/components/Phone.vue';
    import NotificationToast from '@/components/NotificationToast.vue';
    import { usePhone } from '@/components/utils/usePhone';

    const { phone, togglePhone } = usePhone();

    const { t } = useI18n();

    type Rect = { x: number; y: number; width: number; height: number };

    const gameCanvas = ref<HTMLCanvasElement | null>(null);

    const themeAudio = ref<HTMLAudioElement | null>(null);
    const trumpetsAudio = ref<HTMLAudioElement | null>(null);

    const pepitoHitBox: Rect = { x: 0, y: 0, width: 0, height: 0 };

    const talk = ref(false);
    const talkBanner = ref({
        left: '0px',
        bottom: '0px',
        width: '100%',
    });

    const columnStyle = ref({
        top: '0px',
        right: '0px',
        height: '100%',
    });

    function createAudio(src: string, loop = false): HTMLAudioElement {
        const audio = new Audio(src);
        audio.loop = loop;
        return audio;
    }

    function playAudio(audio: HTMLAudioElement | null, reset = false) {
        if (!audio)
            return;
        if (reset)
            audio.currentTime = 0;
        audio.play();
    }

    function pauseAudio(audio: HTMLAudioElement | null, reset = false) {
        if (!audio)
            return;
        audio.pause();
        if (reset) 
            audio.currentTime = 0;
    }

    function loadImage(src: string): Promise<HTMLImageElement> {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = src;
        });
    }

    function getContainRect(canvas: HTMLCanvasElement, img: HTMLImageElement): Rect {
        const scale = Math.min(canvas.width / img.width, canvas.height / img.height);
        const width = img.width * scale;
        const height = img.height * scale;
        return {
            x: (canvas.width - width) / 2,
            y: (canvas.height - height) / 2,
            width,
            height,
        };
    }

    function getPepitoRect(canvas: HTMLCanvasElement, img: HTMLImageElement, bgRect: Rect): Rect {
        const maxWidth = canvas.width * 0.20;
        const scale = maxWidth / img.width;
        const width = img.width * scale;
        const height = img.height * scale;
        return {
            x: (canvas.width - width) / 90 ,
            y: bgRect.y + bgRect.height - height,
            width,
            height,
        };
    }

    function isInsideRect(x: number, y: number, rect: Rect): boolean {
        return (
            x >= rect.x &&
            x <= rect.x + rect.width &&
            y >= rect.y &&
            y <= rect.y + rect.height
        );
    }

    function drawBackground(ctx: CanvasRenderingContext2D, img: HTMLImageElement, rect: Rect) {
        ctx.drawImage(img, rect.x, rect.y, rect.width, rect.height);
    }

    function drawPepito(ctx: CanvasRenderingContext2D, img: HTMLImageElement, rect: Rect) {
        ctx.drawImage(img, rect.x, rect.y, rect.width, rect.height);
    }

    function computeTalkBannerStyle(canvas: HTMLCanvasElement, bgRect: Rect) {
        const bottom = canvas.height - (bgRect.y + bgRect.height);
        return {
            left: `${bgRect.x}px`,
            bottom: `${bottom}px`,
            width: `${bgRect.width}px`,
        };
    }

    function computeSideColumnStyle(canvas: HTMLCanvasElement, bgRect: Rect) {
        return {
            top: `${bgRect.y}px`,
            right: `${canvas.width - (bgRect.x + bgRect.width)}px`,
            height: `${bgRect.height}px`,
        };
    }

    function getCanvasCoords(canvas: HTMLCanvasElement, event: MouseEvent) {
        const rect = canvas.getBoundingClientRect();
        return {
            x: event.clientX - rect.left,
            y: event.clientY - rect.top,
        };
    }

    function handlePepitoClick(canvas: HTMLCanvasElement, event: MouseEvent) {
        if (phone.isOpen)
            return;
        const { x, y } = getCanvasCoords(canvas, event);
        if (!isInsideRect(x, y, pepitoHitBox)) {
            talk.value = false;
            pauseAudio(trumpetsAudio.value, true);
            playAudio(themeAudio.value);
            return;
        }
        talk.value = !talk.value;
        if (talk.value) {
            pauseAudio(themeAudio.value);
            playAudio(trumpetsAudio.value, true);
        } else {
            pauseAudio(trumpetsAudio.value, true);
            playAudio(themeAudio.value);
        }
    }

    function handlePepitoHover(canvas: HTMLCanvasElement, event: MouseEvent) {
        if (phone.isOpen) {
            canvas.style.cursor = 'default';
            return;
        }
        const { x, y } = getCanvasCoords(canvas, event);
        canvas.style.cursor = isInsideRect(x, y, pepitoHitBox) ? 'pointer' : 'default';
    }

    function bindCanvasEvents(canvas: HTMLCanvasElement) {
        canvas.addEventListener('click', (event) => handlePepitoClick(canvas, event));
        canvas.addEventListener('mousemove', (event) => handlePepitoHover(canvas, event));
    }

    async function setupScene(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
        const [background, pepito] = await Promise.all([
            loadImage(Rain),
            loadImage(Pepito),
        ]);

        const bgRect = getContainRect(canvas, background);
        drawBackground(ctx, background, bgRect);

        const pepitoRect = getPepitoRect(canvas, pepito, bgRect);
        Object.assign(pepitoHitBox, pepitoRect);
        drawPepito(ctx, pepito, pepitoRect);

        talkBanner.value = computeTalkBannerStyle(canvas, bgRect);
        columnStyle.value = computeSideColumnStyle(canvas, bgRect);
    }

    function handleKeydown(event: KeyboardEvent) {
        if (event.key === 'Tab') {
            event.preventDefault();
            togglePhone();
        }
    }

    onMounted(async () => {
        const canvas = gameCanvas.value;
        if (!canvas)
            return;
        const ctx = canvas.getContext('2d');
        if (!ctx)
            return;

        themeAudio.value = createAudio(RainMusic, true);
        trumpetsAudio.value = createAudio(Trumpets, true);
        playAudio(themeAudio.value);

        bindCanvasEvents(canvas);
        await setupScene(canvas, ctx);

        window.addEventListener('keydown', handleKeydown);
    });

    onUnmounted(() => {
        pauseAudio(themeAudio.value, true);
        pauseAudio(trumpetsAudio.value, true);
        window.removeEventListener('keydown', handleKeydown);
    });
</script>

<template>

    <AppHeader />

    <main class="game-container">
        <div class="canvas-wrapper">
            <canvas ref="gameCanvas" width="1200" height="800"></canvas>

            <div v-if="talk" class="talk" :style="talkBanner">
                Hola a todos, soy Pepito. Me encantan las pijas.
            </div>

            <div class="side-column" :style="columnStyle">
                <div class="notification-zone">
                    <NotificationToast />
                </div>
                <div class="phone-zone">
                    <Transition name="phone-slide">
                        <PhoneOverlay v-if="phone.isOpen" />
                    </Transition>
                </div>
            </div>
        </div>
		<router-link to="/home" class="btn btn-block btn-teal">
    		{{ t('common.back') }}
    	</router-link>

    </main>

</template>

<style scoped>
    .game-container {
        width: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;
        margin-bottom: 50px;
    }

    .canvas-wrapper {
        position: relative;
        width: 1200px;
        height: 800px;
        display: block;
    }

    .talk {
        position: absolute;
        background: rgba(0, 0, 0, 0.7);
        color: #fff;
        padding: 50px;
        display: flex;
        align-items: center;
        justify-content: center;
        box-sizing: border-box;
        border-radius: 18px 18px 0 0;
    }

    .side-column {
        position: absolute;
        width: 260px;
        display: flex;
        flex-direction: column;
        gap: var(--space-2);
        padding: var(--space-3);
        box-sizing: border-box;
        pointer-events: none;
    }

    .notification-zone {
        flex: 0 0 auto;
        min-height: 100px;
    }

    .phone-zone {
        flex: 1;
        min-height: 0;
        position: relative;
        overflow: hidden;
    }

    .notification-zone > *,
    .phone-zone > * {
        pointer-events: auto;
    }

    .phone-slide-enter-active,
    .phone-slide-leave-active {
        transition: transform 0.35s ease-out, opacity 0.35s ease-out;
    }

    .phone-slide-enter-from,
    .phone-slide-leave-to {
        transform: translateY(100%);
        opacity: 0;
    }

    .phone-slide-enter-to,
    .phone-slide-leave-from {
        transform: translateY(0);
        opacity: 1;
    }
</style>