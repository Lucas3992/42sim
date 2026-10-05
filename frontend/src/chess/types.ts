export type PlayerColor = 'w' | 'b';
export type ChessGameStatus = 'turn' | 'check' | 'checkmate' | 'stalemate' | 'draw';
export type PieceKind = 'p' | 'n' | 'b' | 'r' | 'q' | 'k';
export type PromotionPiece = 'q' | 'r' | 'b' | 'n';

export interface ChessPieceSnapshot {
  color: PlayerColor;
  type: PieceKind;
}

export interface ChessSquareSnapshot {
  square: string;
  file: string;
  rank: string;
  piece: ChessPieceSnapshot | null;
}

export interface ChessMoveSnapshot {
  san: string;
  from: string;
  to: string;
  color: PlayerColor;
}

export interface PendingPromotion {
  from: string;
  to: string;
  choices: PromotionPiece[];
}

export interface SavedChessGameV1 {
  version: 1;
  pgn: string;
  fen: string;
  savedAt: string;
}
