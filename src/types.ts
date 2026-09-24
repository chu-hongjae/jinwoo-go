/** public/kifu/index.json 의 항목 (fetch-games.mjs가 생성) */
export interface PlayerInfo {
  name: string;
  kyu?: number; // 급수 기보: 1~10
  rank?: string; // 프로 기보: "9단" 등 (없으면 kyu로 표시)
}

export interface KifuEntry {
  id: number | string;
  category?: "kyu" | "pro"; // 없으면 "kyu"
  kyu?: number; // 급수 기보일 때 1~10
  dan?: number; // 단급 기보일 때 1~6 (kyu와 배타적)
  featured?: string; // 프로 기보: 주인공 선수 (예: "이세돌")
  file: string; // "10k/game-12345.sgf"
  sgfUrl?: string; // 실시간 검색 결과: OGS API SGF 경로 (file 대신 사용)
  handicap: number;
  komi: number | null;
  outcome: string; // "Resignation", "Timeout", "45.5 points" ...
  winner: "B" | "W";
  ended: string | null; // "2024-05-03"
  black: PlayerInfo;
  white: PlayerInfo;
}

/** 기보 파일 경로만 담은 pro.json 항목 — 메타데이터는 SGF에서 클라이언트가 파싱 */
export interface ProKifuFile {
  file: string;
  featured: string; // "이세돌" 등
}

export type Stone = "B" | "W" | null;

export interface Move {
  color: "B" | "W";
  x: number; // -1 = 패스
  y: number;
}

export interface BoardPosition {
  board: Stone[][]; // board[y][x]
  lastMove: { x: number; y: number } | null;
  capturedByB: number; // 흑이 잡은 돌 수
  capturedByW: number;
  /** 수 번호 표시용: 돌이 놓인 좌표와 해당 수의 번호 */
  numbers: { x: number; y: number; n: number; color: "B" | "W" }[];
}

export interface SgfGame {
  boardSize: number;
  handicap: number;
  komi?: string;
  blackName?: string;
  whiteName?: string;
  blackRank?: string;
  whiteRank?: string;
  result?: string;
  date?: string;
  event?: string;
  setup: Move[]; // 핸디캡 착점(AB/AW)
  moves: Move[]; // 메인 라인 수순 (패스 포함)
}