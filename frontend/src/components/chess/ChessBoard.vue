<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import type { ChessMoveSnapshot, ChessSquareSnapshot, PieceKind } from '@/chess/types';

const props = defineProps<{
  squares: ChessSquareSnapshot[];
  selectedSquare: string | null;
  legalTargets: readonly string[];
  lastMove: ChessMoveSnapshot | null;
  checkedKingSquare: string | null;
  disabled: boolean;
}>();

const emit = defineEmits<{ select: [square: string] }>();
const { t } = useI18n();

const glyphs: Record<string, string> = {
  wp: '♙', wn: '♘', wb: '♗', wr: '♖', wq: '♕', wk: '♔',
  bp: '♟', bn: '♞', bb: '♝', br: '♜', bq: '♛', bk: '♚',
};

const pieceNames: Record<PieceKind, string> = {
  p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king',
};

const legalSet = computed(() => new Set(props.legalTargets));

function isLight(square: ChessSquareSnapshot): boolean {
  return (square.file.charCodeAt(0) - 97 + Number(square.rank)) % 2 === 1;
}

function isLastMove(square: string): boolean {
  return props.lastMove?.from === square || props.lastMove?.to === square;
}

function labelFor(square: ChessSquareSnapshot): string {
  const contents = square.piece
    ? t('chess.a11y.pieceOnSquare', {
        color: t(`chess.${square.piece.color === 'w' ? 'white' : 'black'}`),
        piece: t(`chess.pieces.${pieceNames[square.piece.type]}`),
        square: square.square,
      })
    : t('chess.a11y.emptySquare', { square: square.square });
  return legalSet.value.has(square.square)
    ? `${contents} ${t('chess.a11y.legalDestination')}`
    : contents;
}
</script>

<template>
  <div class="chess-board" role="group" :aria-label="t('chess.a11y.board')">
    <button
      v-for="square in squares"
      :key="square.square"
      type="button"
      class="chess-square"
      :class="{
        light: isLight(square),
        dark: !isLight(square),
        selected: selectedSquare === square.square,
        legal: legalSet.has(square.square),
        capture: legalSet.has(square.square) && square.piece,
        'last-move': isLastMove(square.square),
        checked: checkedKingSquare === square.square,
      }"
      :aria-label="labelFor(square)"
      :aria-pressed="selectedSquare === square.square"
      :disabled="disabled"
      @click="emit('select', square.square)"
    >
      <span v-if="square.file === 'a'" class="coordinate rank">{{ square.rank }}</span>
      <span v-if="square.rank === '1'" class="coordinate file">{{ square.file }}</span>
      <span v-if="square.piece" class="piece" aria-hidden="true">
        {{ glyphs[`${square.piece.color}${square.piece.type}`] }}
      </span>
    </button>
  </div>
</template>

<style scoped>
.chess-board {
  display: grid;
  grid-template-columns: repeat(8, minmax(0, 1fr));
  grid-template-rows: repeat(8, minmax(0, 1fr));
  width: min(90vw, 640px);
  max-width: 100%;
  aspect-ratio: 1;
  border: 3px solid var(--color-border);
  border-radius: var(--radius-md);
  overflow: hidden;
  box-shadow: var(--shadow-lg);
}

.chess-square {
  position: relative;
  display: grid;
  place-items: center;
  min-width: 0;
  min-height: 0;
  width: 100%;
  height: 100%;
  aspect-ratio: 1;
  overflow: hidden;
  border: 0;
  padding: 0;
  color: #111827;
  cursor: pointer;
}

.chess-square.light { background: #e8dcc4; }
.chess-square.dark { background: #7693a6; }
.chess-square:disabled { cursor: default; opacity: 1; }
.chess-square.last-move { box-shadow: inset 0 0 0 0.35rem rgb(250 204 21 / 55%); }
.chess-square.selected { outline: 0.35rem solid var(--color-primary); outline-offset: -0.35rem; z-index: 2; }
.chess-square.legal::after {
  content: '';
  width: 24%;
  aspect-ratio: 1;
  border-radius: 50%;
  background: rgb(15 118 110 / 70%);
  box-shadow: 0 0 0 2px rgb(255 255 255 / 70%);
  position: absolute;
}
.chess-square.capture::after {
  width: 75%;
  background: transparent;
  border: 0.35rem solid rgb(185 28 28 / 75%);
  box-sizing: border-box;
}
.chess-square.checked { background: #ef7777; }
.chess-square:focus-visible { z-index: 3; outline-offset: -3px; }

.piece {
  font-size: clamp(1.8rem, 8vw, 4.25rem);
  line-height: 1;
  filter: drop-shadow(0 1px 1px rgb(0 0 0 / 35%));
  z-index: 1;
}

.coordinate {
  position: absolute;
  font-size: clamp(0.55rem, 1.8vw, 0.8rem);
  font-weight: 800;
  opacity: 0.8;
}
.coordinate.rank { top: 2px; left: 3px; }
.coordinate.file { right: 3px; bottom: 1px; }
</style>
