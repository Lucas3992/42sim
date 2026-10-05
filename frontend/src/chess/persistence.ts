import { Chess } from 'chess.js';
import type { SavedChessGameV1 } from './types';

const STORAGE_PREFIX = 'chess.game.v1';

export function chessStorageKey(userId: number | string | null | undefined): string {
  return userId == null ? `${STORAGE_PREFIX}.guest` : `${STORAGE_PREFIX}.user.${userId}`;
}

function isSavedChessGameV1(value: unknown): value is SavedChessGameV1 {
  if (!value || typeof value !== 'object') return false;
  const save = value as Partial<SavedChessGameV1>;
  return save.version === 1
    && typeof save.pgn === 'string'
    && typeof save.fen === 'string'
    && typeof save.savedAt === 'string'
    && !Number.isNaN(Date.parse(save.savedAt));
}

export function loadChessGame(key: string): { game: Chess; save: SavedChessGameV1 } | null {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isSavedChessGameV1(parsed)) return null;

    const game = new Chess();
    game.loadPgn(parsed.pgn);
    if (game.fen() !== parsed.fen) return null;
    return { game, save: parsed };
  } catch {
    return null;
  }
}

export function saveChessGame(key: string, game: Chess): boolean {
  const save: SavedChessGameV1 = {
    version: 1,
    pgn: game.pgn(),
    fen: game.fen(),
    savedAt: new Date().toISOString(),
  };

  try {
    window.localStorage.setItem(key, JSON.stringify(save));
    return true;
  } catch {
    return false;
  }
}
