<script setup lang="ts">
import { computed, onBeforeUnmount } from 'vue';
import { useI18n } from 'vue-i18n';
import AppHeader from '@/components/AppHeader.vue';
import ChessBoard from '@/components/chess/ChessBoard.vue';
import { useChessGame } from '@/chess/useChessGame';
import type { PromotionPiece } from '@/chess/types';

const { t } = useI18n();
const chess = useChessGame();

const statusText = computed(() => {
  if (chess.status.value === 'checkmate') {
    const winner = chess.turn.value === 'w' ? t('chess.computer') : t('chess.player');
    return t('chess.status.checkmate', { winner });
  }
  if (chess.status.value === 'stalemate') return t('chess.status.stalemate');
  if (chess.status.value === 'draw') return t('chess.status.draw');
  if (chess.isComputerThinking.value) return t('chess.status.computerThinking');
  if (chess.turn.value === 'b') return t('chess.status.computerTurn');
  return chess.status.value === 'check'
    ? t('chess.status.playerInCheck')
    : t('chess.status.yourTurn');
});

onBeforeUnmount(chess.cancelComputerMove);

const promotionLabels: Record<PromotionPiece, string> = {
  q: 'queen', r: 'rook', b: 'bishop', n: 'knight',
};

function newGame(): void {
  const hasMoves = chess.moveHistory.value.length > 0 && !chess.isGameOver.value;
  if (!hasMoves || window.confirm(t('chess.confirmNewGame'))) chess.resetGame();
}
</script>

<template>
  <AppHeader />
  <main class="container chess-page">
    <header class="chess-heading">
      <div>
        <h1>{{ t('chess.title') }}</h1>
        <p>{{ t('chess.subtitle') }}</p>
      </div>
      <button type="button" class="btn btn-teal" @click="newGame">
        {{ t('chess.newGame') }}
      </button>
    </header>

    <div class="roles">
      <span><strong>{{ t('chess.player') }}</strong> — {{ t('chess.white') }}</span>
      <span><strong>{{ t('chess.computer') }}</strong> — {{ t('chess.black') }}</span>
    </div>
    <p class="status card" role="status" aria-live="polite">{{ statusText }}</p>

    <div class="game-layout">
      <ChessBoard
        :squares="chess.board.value"
        :selected-square="chess.selectedSquare.value"
        :legal-targets="chess.legalTargets.value"
        :last-move="chess.lastMove.value"
        :checked-king-square="chess.checkedKingSquare.value"
        :disabled="chess.isComputerThinking.value || chess.turn.value !== 'w' || chess.isGameOver.value || Boolean(chess.pendingPromotion.value)"
        @select="chess.selectSquare"
      />

      <aside class="card side-panel">
        <h2>{{ t('chess.moveHistory') }}</h2>
        <ol v-if="chess.moveHistory.value.length" class="move-list">
          <li v-for="(move, index) in chess.moveHistory.value" :key="`${index}-${move.san}`">
            <span>{{ Math.floor(index / 2) + 1 }}{{ index % 2 ? '…' : '.' }}</span>
            <strong>{{ move.san }}</strong>
          </li>
        </ol>
        <p v-else>{{ t('chess.noMoves') }}</p>
        <p class="save-note">{{ t('chess.localSaveNote') }}</p>
      </aside>
    </div>

    <section v-if="chess.pendingPromotion.value" class="promotion card" role="dialog" aria-modal="true" :aria-label="t('chess.promotionPrompt')">
      <h2>{{ t('chess.promotionPrompt') }}</h2>
      <div class="promotion-actions">
        <button
          v-for="piece in chess.pendingPromotion.value.choices"
          :key="piece"
          type="button"
          class="btn btn-white"
          @click="chess.choosePromotion(piece)"
        >
          {{ t(`chess.pieces.${promotionLabels[piece]}`) }}
        </button>
        <button type="button" class="btn" @click="chess.cancelPromotion">{{ t('common.back') }}</button>
      </div>
    </section>

    <router-link to="/home" class="btn back-link">{{ t('chess.backHome') }}</router-link>
  </main>
</template>

<style scoped>
.chess-page { padding-block: var(--space-8); }
.chess-heading {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--space-4);
  margin-bottom: var(--space-4);
}
.chess-heading h1 { margin: 0; }
.chess-heading p { margin: var(--space-2) 0 0; color: var(--color-text-muted); }
.roles { display: flex; justify-content: center; flex-wrap: wrap; gap: var(--space-2) var(--space-6); margin-bottom: var(--space-3); }
.status { margin-bottom: var(--space-4); font-weight: 700; text-align: center; }
.game-layout { display: grid; grid-template-columns: minmax(0, 640px) minmax(220px, 1fr); gap: var(--space-6); align-items: start; }
.side-panel { max-height: min(90vw, 640px); overflow: auto; }
.side-panel h2 { margin-top: 0; }
.move-list { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--space-2); padding-left: var(--space-6); }
.move-list li span { color: var(--color-text-muted); margin-right: var(--space-2); }
.save-note { margin-top: var(--space-6); color: var(--color-text-muted); font-size: 0.9rem; }
.promotion { margin-top: var(--space-4); }
.promotion h2 { margin-top: 0; }
.promotion-actions { display: flex; flex-wrap: wrap; gap: var(--space-2); }
.back-link { display: inline-flex; margin-top: var(--space-6); }
@media (max-width: 860px) {
  .game-layout { grid-template-columns: 1fr; justify-items: center; }
  .side-panel { width: min(90vw, 640px); max-height: none; }
}
@media (max-width: 520px) {
  .chess-heading { align-items: stretch; flex-direction: column; }
}
</style>
