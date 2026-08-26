<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import HeartIcon from '@/assets/svg/HeartIcon.vue';
import StarIcon from '@/assets/svg/StarIcon.vue';
import bgMusic from '@/assets/sounds/pongsong.mp3';
import gameOverSound from '@/assets/sounds/gameover.mp3';
import screamerVideo from '@/assets/video/screamer.mp4';
import AppHeader from '@/components/AppHeader.vue';
import { useI18n } from 'vue-i18n';
 
	const { t } = useI18n();

	const score = ref(0);
	const lives = ref(3);
	const letter = ref("");
	const countdown = ref(3);
	const letterCountdown = ref(3);
	const letterGameStarted = ref(false);
	const secondBallAdded = ref(false);
	const thirdBallAdded = ref(false);
	const assetsReady = ref(false);

	const lastScreamer = ref(0);
 	const screamer = ref(4 + Math.floor(Math.random() * 3));
	const screamerActive = ref(false);

	const gameState = ref<'countdown' | 'playing' | 'gameover' | 'waitforclick' | 'screamer'>('waitforclick');

	const canvas = ref<HTMLCanvasElement | null>(null);
	const music = ref<HTMLAudioElement | null>(null);
	const screamerVideoRef = ref<HTMLVideoElement | null>(null);
	const gameOverAudio = ref<HTMLAudioElement | null>(null);

	let mouseMoveHandler: (e: MouseEvent) => void;
	let keydownHandler: (e: KeyboardEvent) => void;
	
	let animationId: number;
	let letterIntervalId: ReturnType<typeof setInterval>;

	type Ball = {
		x: number;
		y: number;
		dx: number;
		dy: number;
		radius: number;
		alive: boolean;
	};

	function initBall(): Ball {
		const speed = Math.round((1.0 + Math.random()) * 10) / 10;
		const x = Math.floor(100 + Math.random() * (700 - 100 + 1));
		const radius = Math.floor(5 + Math.random() * 6);
    	return { x, y: 100, dx: speed, dy: speed, radius, alive: true };
	}

	let balls = [initBall()];

	let paddleHeight = 10;
	let paddleWidth = 75;

	let startGame: () => void = () => {};

	function resetGame() {
		score.value = 0;
		lives.value = 3;
		letter.value = "";
		countdown.value = 3;
    	letterCountdown.value = 3;
		letterGameStarted.value = false;
		secondBallAdded.value = false;
		thirdBallAdded.value = false;
		lastScreamer.value = 0;
		screamer.value = 4 + Math.floor(Math.random() * 3);
		clearInterval(letterIntervalId);
		balls = [initBall()];
		gameState.value = 'waitforclick';
		startGame();
	}

	function playMusic() {
		music.value?.play().catch(() => {});
	}

	function stopMusic() {
		music.value?.pause();
		if (music.value)
			music.value.currentTime = 0;
	}

	function pauseMusic() {
		music.value?.pause();
	}

	function preloadAudio(src: string, volume: number): Promise<HTMLAudioElement> {
		return new Promise((resolve) => {
			const audio = new Audio(src);
			audio.volume = volume;
			audio.preload = "auto";
			audio.addEventListener("canplaythrough", () => resolve(audio), { once: true });
			audio.load();
		});
	}

	function onScreamerEnded() {
		screamerActive.value = false;
		if (lives.value < 1) {
			gameState.value = 'gameover';
			gameOverAudio.value?.play().catch(() => {});
			return;
		}
		gameState.value = 'playing';
		screamer.value = 3 + Math.floor(Math.random() * 3);
		playMusic();
	}

	onMounted(async () => {
		const [bg, gameOver] = await Promise.all([
			preloadAudio(bgMusic, 0.3),
			preloadAudio(gameOverSound, 0.5),
		]);

		music.value = bg;
		music.value.loop = true;
		gameOverAudio.value = gameOver;
		assetsReady.value = true;

		const ctx = canvas.value?.getContext("2d");
		let paddleX = (canvas.value!.width - paddleWidth) / 2;

		function drawBall(ball: Ball) {
			ctx!.beginPath();
			ctx!.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
			ctx!.fillStyle = "#ff0000";
			ctx!.fill();
			ctx!.closePath();
		}

		function moveBall(ball: Ball) {
			if (ball.y + ball.dy + ball.radius >= canvas.value!.height) {
				if (didWeSaveTheBall(ball))
					ball.dy = -ball.dy;
				else
					ball.alive = false;
			}
			if (ball.x + ball.dx > canvas.value!.width - ball.radius
				|| ball.x + ball.dx < ball.radius)
    			ball.dx = -ball.dx;
			ball.x += ball.dx;
			if (ball.y + ball.dy < ball.radius)
    			ball.dy = -ball.dy;
			ball.y += ball.dy;
		}

		function drawPaddle() {
			ctx!.beginPath();
			ctx!.rect(paddleX, canvas.value!.height - paddleHeight, paddleWidth, paddleHeight);
			ctx!.fillStyle = "#0095DD";
			ctx!.fill();
			ctx!.closePath();
		}

		function handleMissedBall() {
			const countBefore = balls.length;
		    balls = balls.filter(ball => ball.alive);
			const countAfter = balls.length;
			if (countAfter < countBefore) {
            	loseLife();
            	if (countAfter < 1) {
					lives.value = 0;
        	    	gameState.value = 'gameover';
              		return;
            	}
				setTimeout(() => {
					balls.push(initBall());
				}, 1000);
        	}
		}

		function didWeSaveTheBall(ball: Ball): boolean {
			if (ball.y + ball.radius >= canvas.value!.height - paddleHeight
				&& ball.x + ball.radius >= paddleX 
				&& ball.x - ball.radius <= paddleX + paddleWidth) {
				score.value++;
				lastScreamer.value++;
				if (lastScreamer.value >= screamer.value)
					triggerScreamer();
				return true;
			}
			return false;
		}

		function triggerScreamer() {
			if (screamerActive.value)
				return;
			screamerActive.value = true;
			lastScreamer.value = 0;
			pauseMusic();
			gameState.value = 'screamer';
			screamerVideoRef.value?.currentTime && (screamerVideoRef.value.currentTime = 0);
		}

		mouseMoveHandler = (e) => {
			if (gameState.value !== 'playing')
				return;
			const rect = canvas.value!.getBoundingClientRect();
			const mouseX = e.clientX - rect.left;
			paddleX = mouseX - paddleWidth / 2;
		};

		keydownHandler = (event) => {
			if (gameState.value !== 'playing')
				return;
			const pressedKey = event.key.toUpperCase();
			clearInterval(letterIntervalId);
			if (pressedKey === letter.value) {
				newLetter();
			} else {
				loseLife();
				startLetterTimer();
			}
		};

		document.addEventListener('mousemove', mouseMoveHandler);
		document.addEventListener('keydown', keydownHandler);

		function loseLife() {
			lives.value--;
			if (lives.value < 1) {
				lives.value = 0;
				gameState.value = 'gameover';
				clearInterval(letterIntervalId);
			}
		}

		function newLetter() {
			letter.value = String.fromCharCode(65 + Math.floor(Math.random() * 26));
			startLetterTimer();
		}

		function startLetterTimer() {
			letterCountdown.value = 3;
			letterIntervalId = setInterval(() => {
				if (gameState.value === 'screamer')
					return;
				letterCountdown.value--;
				if (letterCountdown.value < 1) {
					clearInterval(letterIntervalId);
					loseLife();
					startLetterTimer();
				}
			}, 1000);
		}

		function gameLoop() {
			if (gameState.value === 'gameover') {
				stopMusic();
				gameOverAudio.value?.play().catch(() => {});
				return;
			}
			if (gameState.value === 'screamer') {
				animationId = requestAnimationFrame(gameLoop);
				return;
			}
			ctx?.clearRect(0, 0, canvas.value!.width, canvas.value!.height);
			drawPaddle();
			balls.forEach(ball => {
				drawBall(ball);
				moveBall(ball);	
			});
			handleMissedBall();
			if (score.value > 2 && !letterGameStarted.value) {
				letterGameStarted.value = true;
				newLetter();
			}
			if (score.value === 4 && !secondBallAdded.value) {
				secondBallAdded.value = true;
				balls.push(initBall());
			}
			if (score.value === 8 && !thirdBallAdded.value) {
				thirdBallAdded.value = true;
				balls.push(initBall());
			}
			animationId = requestAnimationFrame(gameLoop);
		}

		startGame = function () {
			if (gameState.value !== 'screamer' && gameState.value !== 'gameover')
				playMusic();
			gameState.value = 'countdown';
			const interval = setInterval(() => {
				countdown.value--;
				if (countdown.value === -1) {
					clearInterval(interval);
					gameState.value = 'playing';
					gameLoop();
				}
			}, 1000);
		}

	});

	onUnmounted(() => {
		stopMusic();
		if (mouseMoveHandler) 
			document.removeEventListener('mousemove', mouseMoveHandler);
		if (keydownHandler) 
			document.removeEventListener('keydown', keydownHandler);
		cancelAnimationFrame(animationId);
		clearInterval(letterIntervalId);
	});

</script>

<template>

	<AppHeader />
	
	<div class = "canvas-wrapper">
		<div class="hud">
			<div class="score-display"><StarIcon /> : {{ score }}</div>
			<div class="lives-display"><HeartIcon /> : {{ lives }}</div>
    	</div>
			
		<canvas ref="canvas" width="800" height="400"></canvas>

		<div class = "waitforclick" @click="assetsReady && startGame()" v-if="gameState === 'waitforclick'">
			{{ t('common.clickHere') }} </div>

		<div class = "countdown" v-if="gameState === 'countdown' && countdown > 0">
			{{ countdown }} </div>
		<div class = "countdown" v-else-if="gameState === 'countdown' && countdown === 0">
			GO! </div>

		<div class = "countdown" v-if="gameState === 'playing' && letterGameStarted">
			{{ t('game.type') }} : {{ letter }} <br> 
			{{ letterCountdown }} </div>

		<div v-if="gameState === 'screamer'" class="screamer-overlay">
			<video ref="screamerVideoRef" :src="screamerVideo" autoplay playsinline @ended="onScreamerEnded" ></video></div>

		<div  class = "gameOver" v-if="gameState === 'gameover'">
			{{ t('game.gameOver') }} </div>

		<div class = "replay" v-if="gameState === 'gameover'" @click="resetGame()">
			{{ t('game.replay') }} ? </div>

	    <router-link to="/home" class="btn btn-block btn-teal"> {{ t('common.back') }} </router-link>
	</div>

</template>

<style scoped>
	.canvas-wrapper {
		display: flex;
		flex-direction: column;
		align-items: center;
		width: 800px;
		margin: auto;
		position: relative;
	}

	.hud {
		display: flex;
		justify-content: space-between;
		width: 800px;
		margin-bottom: 8px;
	}

	.score-display, .lives-display {
		display: flex;
		align-items: center;
		gap: 6px;
	}

	canvas {
		border: 2px solid #000000;
		background-color: #ffff;
	}

	.countdown {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		color: #000;
	}

	.waitforclick {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		cursor: pointer;
		color: #000;
	}

	.screamer-overlay {
		position: fixed;
		top: 0; left: 0;
		width: 100vw;
		height: 100vh;
		display: flex;
		justify-content: center;
		align-items: center;
		background: black;
		z-index: 9999;
	}

	.btn {
		margin-top: 10px;
	}

	.gameOver {
		position: absolute;
		top: 45%;
		left: 50%;
		transform: translate(-50%, -50%);
		color: #000;
	}

	.replay {
		position: absolute;
		top: 55%;
		left: 50%;
		transform: translate(-50%, -50%);
		color: #000;
		cursor: pointer;
	}

</style> 