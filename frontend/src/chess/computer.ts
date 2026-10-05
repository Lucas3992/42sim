import { Chess, type Move } from 'chess.js';
import { evaluatePosition } from './evaluation';
import type { PromotionPiece } from './types';

export interface ComputerMove {
  from: string;
  to: string;
  promotion?: PromotionPiece;
}

function cloneFromPgn(pgn: string): Chess {
  const copy = new Chess();
  if (pgn) copy.loadPgn(pgn);
  return copy;
}

function minimax(game: Chess, depth: number, alpha: number, beta: number, ply: number): number {
  if (depth === 0 || game.isGameOver()) return evaluatePosition(game, ply);

  const maximizing = game.turn() === 'b';
  let best = maximizing ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY;

  for (const move of game.moves({ verbose: true })) {
    game.move(move);
    let score: number;
    try {
      score = minimax(game, depth - 1, alpha, beta, ply + 1);
    } finally {
      game.undo();
    }

    if (maximizing) {
      best = Math.max(best, score);
      alpha = Math.max(alpha, best);
    } else {
      best = Math.min(best, score);
      beta = Math.min(beta, best);
    }
    if (beta <= alpha) break;
  }

  return best;
}

function toComputerMove(move: Move): ComputerMove {
  return {
    from: move.from,
    to: move.to,
    ...(move.promotion ? { promotion: move.promotion as PromotionPiece } : {}),
  };
}

/** Searches an isolated PGN copy and never mutates the caller's live game. */
export function findComputerMove(pgn: string, depth = 2): ComputerMove | null {
  const searchGame = cloneFromPgn(pgn);
  if (searchGame.turn() !== 'b' || searchGame.isGameOver()) return null;

  let bestScore = Number.NEGATIVE_INFINITY;
  let bestMove: Move | null = null;

  for (const move of searchGame.moves({ verbose: true })) {
    searchGame.move(move);
    let score: number;
    try {
      score = minimax(
        searchGame,
        Math.max(0, depth - 1),
        Number.NEGATIVE_INFINITY,
        Number.POSITIVE_INFINITY,
        1,
      );
    } finally {
      searchGame.undo();
    }

    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }
  }

  return bestMove ? toComputerMove(bestMove) : null;
}
