import type { Chess } from 'chess.js';

const pieceValues = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 0,
} as const;

export const CHECKMATE_SCORE = 100_000;

/** Returns a score from Black's perspective: positive values favor Black. */
export function evaluatePosition(game: Chess, ply = 0): number {
  if (game.isCheckmate()) {
    return game.turn() === 'w'
      ? CHECKMATE_SCORE - ply
      : -CHECKMATE_SCORE + ply;
  }
  if (game.isDraw() || game.isStalemate()) return 0;

  let score = 0;
  for (const rank of game.board()) {
    for (const piece of rank) {
      if (!piece) continue;
      const value = pieceValues[piece.type];
      score += piece.color === 'b' ? value : -value;
    }
  }
  return score;
}
