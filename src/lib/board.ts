import type { BoardPosition, SgfGame, Stone } from "../types";

/**
 * 수순 n까지 재생한 판 상태를 계산한다.
 * 규칙: 단순 판촉(공점 0인 그룹 제거) + 단순 패(직전 1돌 포석 재착수 금지).
 */

interface KoState {
  /** 패가 발생해 재착수가 금지된 좌표 */
  x: number;
  y: number;
  color: Stone; // 이 색이 여기 둘 수 없음
}

function emptyBoard(size: number): Stone[][] {
  return Array.from({ length: size }, () => Array<Stone>(size).fill(null));
}

function neighbors(size: number, x: number, y: number): { x: number; y: number }[] {
  const out: { x: number; y: number }[] = [];
  if (x > 0) out.push({ x: x - 1, y });
  if (x < size - 1) out.push({ x: x + 1, y });
  if (y > 0) out.push({ x, y: y - 1 });
  if (y < size - 1) out.push({ x, y: y + 1 });
  return out;
}

/** 그룹(같은 색 연결된 돌) 수집과 공점 확인 */
function groupInfo(
  board: Stone[][],
  size: number,
  x: number,
  y: number
): { group: { x: number; y: number }[]; liberties: number } {
  const color = board[y][x];
  const visited = new Set<string>();
  const group: { x: number; y: number }[] = [];
  let liberties = 0;
  const stack = [{ x, y }];
  visited.add(`${x},${y}`);
  while (stack.length > 0) {
    const p = stack.pop()!;
    group.push(p);
    for (const q of neighbors(size, p.x, p.y)) {
      const v = board[q.y][q.x];
      const key = `${q.x},${q.y}`;
      if (v == null) {
        if (!visited.has(key)) {
          visited.add(key);
          liberties++;
        }
      } else if (v === color && !visited.has(key)) {
        visited.add(key);
        stack.push(q);
      }
    }
  }
  return { group, liberties };
}

export function positionAfter(game: SgfGame, moveIndex: number): BoardPosition {
  const size = game.boardSize;
  const board = emptyBoard(size);
  for (const s of game.setup) board[s.y][s.x] = s.color;

  let capturedByB = 0;
  let capturedByW = 0;
  let lastMove: { x: number; y: number } | null = null;
  let ko: KoState | null = null;
  const numbers: BoardPosition["numbers"] = [];

  const applySetupNumbering = () => {
    // 핸디캡 돌에도 번호를 붙인다 (학습용 표시)
    game.setup.forEach((s, i) => {
      numbers.push({ x: s.x, y: s.y, n: i + 1, color: s.color });
    });
  };

  const upto = Math.min(moveIndex, game.moves.length);
  for (let m = 0; m < upto; m++) {
    const move = game.moves[m];
    if (move.x < 0) {
      // 패스
      ko = null;
      lastMove = null;
      continue;
    }
    if (ko && ko.color === move.color && ko.x === move.x && ko.y === move.y) {
      // 패 재착수는 기보에 없어야 하지만, 방어적으로 스킵
      continue;
    }
    const opponent: Stone = move.color === "B" ? "W" : "B";
    board[move.y][move.x] = move.color;
    let captured = 0;
    let singleCapture: { x: number; y: number } | null = null;
    for (const q of neighbors(size, move.x, move.y)) {
      if (board[q.y][q.x] === opponent) {
        const { group, liberties } = groupInfo(board, size, q.x, q.y);
        if (liberties === 0) {
          for (const g of group) {
            board[g.y][g.x] = null;
            captured++;
            singleCapture = { x: g.x, y: g.y };
          }
        }
      }
    }
    // 자가 포석(스스로 공점 0)은 무효로 하고 원상복구
    const mine = groupInfo(board, size, move.x, move.y);
    if (mine.liberties === 0) {
      for (const g of mine.group) board[g.y][g.x] = null;
      continue;
    }
    if (move.color === "B") capturedByB += captured;
    else capturedByW += captured;

    // 단순 패 판정: 정확히 1돌을 잡고, 착수한 돌 혼자이며 공점 1개
    if (captured === 1 && mine.group.length === 1 && mine.liberties === 1 && singleCapture) {
      ko = { x: singleCapture.x, y: singleCapture.y, color: opponent };
    } else {
      ko = null;
    }

    lastMove = { x: move.x, y: move.y };
    numbers.push({ x: move.x, y: move.y, n: m + 1, color: move.color });
  }

  if (upto === 0) applySetupNumbering();

  return { board, lastMove, capturedByB, capturedByW, numbers };
}