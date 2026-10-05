import { computed, readonly, ref, watch } from 'vue';
import { Chess, type Square } from 'chess.js';
import { useAuth } from '@/components/utils/useAuth';
import { findComputerMove, type ComputerMove } from './computer';
import { chessStorageKey, loadChessGame, saveChessGame } from './persistence';
import type {
  ChessGameStatus,
  ChessMoveSnapshot,
  ChessSquareSnapshot,
  PendingPromotion,
  PromotionPiece,
} from './types';

const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] as const;
const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'] as const;

let game = new Chess();
const revision = ref(0);
const selectedSquare = ref<string | null>(null);
const legalTargets = ref<string[]>([]);
const pendingPromotion = ref<PendingPromotion | null>(null);
const activeStorageKey = ref(chessStorageKey(null));
const isComputerThinking = ref(false);
let authWatchStarted = false;
let searchGeneration = 0;
let searchTimer: ReturnType<typeof setTimeout> | null = null;

function touch(): void {
  revision.value += 1;
}

function clearInteraction(): void {
  selectedSquare.value = null;
  legalTargets.value = [];
  pendingPromotion.value = null;
}

function persist(): void {
  saveChessGame(activeStorageKey.value, game);
}

function cancelComputerMove(): void {
  searchGeneration += 1;
  if (searchTimer !== null) {
    clearTimeout(searchTimer);
    searchTimer = null;
  }
  isComputerThinking.value = false;
}

function requestComputerMove(): void {
  if (isComputerThinking.value || game.turn() !== 'b' || game.isGameOver()) return;

  const generation = ++searchGeneration;
  const storageKey = activeStorageKey.value;
  const startingFen = game.fen();
  const pgn = game.pgn();
  isComputerThinking.value = true;
  clearInteraction();

  // Yield so Vue can render the thinking state before the shallow search runs.
  searchTimer = setTimeout(() => {
    searchTimer = null;
    let move: ComputerMove | null = null;
    try {
      move = findComputerMove(pgn, 2);
    } catch {
      move = null;
    }

    if (
      generation !== searchGeneration
      || storageKey !== activeStorageKey.value
      || startingFen !== game.fen()
      || game.turn() !== 'b'
      || game.isGameOver()
    ) return;

    if (move) {
      try {
        // chess.js revalidates the result against the live position before commit.
        game.move(move);
        clearInteraction();
        touch();
        persist();
      } catch {
        // A stale or invalid result is deliberately ignored.
      }
    }
    if (generation === searchGeneration) isComputerThinking.value = false;
  }, 0);
}

function restoreForKey(key: string): void {
  cancelComputerMove();
  activeStorageKey.value = key;
  const restored = loadChessGame(key);
  game = restored?.game ?? new Chess();
  clearInteraction();
  touch();
  requestComputerMove();
}

function deriveStatus(): ChessGameStatus {
  revision.value;
  if (game.isCheckmate()) return 'checkmate';
  if (game.isStalemate()) return 'stalemate';
  if (game.isDraw()) return 'draw';
  if (game.inCheck()) return 'check';
  return 'turn';
}

function legalMovesFrom(square: string) {
  try {
    return game.moves({ square: square as Square, verbose: true });
  } catch {
    return [];
  }
}

function selectSquare(square: string): void {
  if (isComputerThinking.value || game.turn() !== 'w' || game.isGameOver() || pendingPromotion.value) return;

  if (selectedSquare.value && legalTargets.value.includes(square)) {
    playMove(selectedSquare.value, square);
    return;
  }

  const piece = game.get(square as Square);
  if (!piece || piece.color !== 'w') {
    clearInteraction();
    return;
  }

  selectedSquare.value = square;
  legalTargets.value = [...new Set(legalMovesFrom(square).map((move) => move.to))];
}

function commitMove(from: string, to: string, promotion?: PromotionPiece): boolean {
  if (isComputerThinking.value || game.turn() !== 'w' || game.isGameOver()) return false;
  try {
    game.move({ from, to, ...(promotion ? { promotion } : {}) });
    clearInteraction();
    touch();
    persist();
    requestComputerMove();
    return true;
  } catch {
    return false;
  }
}

function playMove(from: string, to: string): boolean {
  if (isComputerThinking.value || game.turn() !== 'w' || game.isGameOver()) return false;
  const matching = legalMovesFrom(from).filter((move) => move.to === to);
  if (matching.length === 0) return false;

  const choices = [...new Set(matching.map((move) => move.promotion).filter(Boolean))] as PromotionPiece[];
  if (choices.length > 0) {
    pendingPromotion.value = { from, to, choices };
    return true;
  }
  return commitMove(from, to);
}

function choosePromotion(piece: PromotionPiece): boolean {
  const pending = pendingPromotion.value;
  if (!pending || !pending.choices.includes(piece)) return false;
  return commitMove(pending.from, pending.to, piece);
}

function cancelPromotion(): void {
  pendingPromotion.value = null;
}

function resetGame(): void {
  cancelComputerMove();
  game = new Chess();
  clearInteraction();
  touch();
  persist();
}

export function useChessGame() {
  const { user } = useAuth();
  if (!authWatchStarted) {
    authWatchStarted = true;
    watch(
      () => user.value?.id ?? null,
      (userId) => restoreForKey(chessStorageKey(userId)),
      { immediate: true },
    );
  }

  // Route remounts resume a module-scoped Black turn after teardown cancellation.
  requestComputerMove();

  const board = computed<ChessSquareSnapshot[]>(() => {
    revision.value;
    return ranks.flatMap((rank) => files.map((file) => {
      const square = `${file}${rank}`;
      const piece = game.get(square as Square);
      return {
        square,
        file,
        rank,
        piece: piece ? { color: piece.color, type: piece.type } : null,
      };
    }));
  });

  const turn = computed(() => {
    revision.value;
    return game.turn();
  });
  const status = computed(deriveStatus);
  const isGameOver = computed(() => status.value === 'checkmate' || status.value === 'stalemate' || status.value === 'draw');
  const moveHistory = computed<ChessMoveSnapshot[]>(() => {
    revision.value;
    return game.history({ verbose: true }).map((move) => ({
      san: move.san,
      from: move.from,
      to: move.to,
      color: move.color,
    }));
  });
  const lastMove = computed(() => moveHistory.value.at(-1) ?? null);
  const checkedKingSquare = computed<string | null>(() => {
    revision.value;
    if (!game.inCheck()) return null;
    for (const rank of ranks) {
      for (const file of files) {
        const square = `${file}${rank}`;
        const piece = game.get(square as Square);
        if (piece?.type === 'k' && piece.color === game.turn()) return square;
      }
    }
    return null;
  });

  return {
    board,
    turn,
    status,
    isGameOver,
    isComputerThinking: readonly(isComputerThinking),
    selectedSquare: readonly(selectedSquare),
    legalTargets: readonly(legalTargets),
    pendingPromotion: readonly(pendingPromotion),
    moveHistory,
    lastMove,
    checkedKingSquare,
    selectSquare,
    playMove,
    choosePromotion,
    cancelPromotion,
    resetGame,
    requestComputerMove,
    cancelComputerMove,
  };
}
