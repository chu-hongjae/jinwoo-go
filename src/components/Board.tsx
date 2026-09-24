import { memo } from "react";
import type { BoardPosition } from "../types";

const COL_LETTERS = "ABCDEFGHJKLMNOPQRST"; // I 제외

interface BoardProps {
  size: number; // 19
  position: BoardPosition;
  showCoords: boolean;
  showNumbers: boolean;
}

const CELL = 30;
const MARGIN = 26;

function starPoints(size: number): { x: number; y: number }[] {
  if (size === 19) {
    const pts = [3, 9, 15];
    return pts.flatMap((y) => pts.map((x) => ({ x, y })));
  }
  if (size === 13) {
    const pts = [3, 6, 9];
    return pts.flatMap((y) => pts.map((x) => ({ x, y })));
  }
  if (size === 9) {
    return [
      { x: 2, y: 2 },
      { x: 6, y: 2 },
      { x: 4, y: 4 },
      { x: 2, y: 6 },
      { x: 6, y: 6 },
    ];
  }
  return [];
}

function BoardInner({ size, position, showCoords, showNumbers }: BoardProps) {
  const total = CELL * (size - 1) + MARGIN * 2;
  const px = (v: number) => MARGIN + v * CELL;

  const lines = [];
  for (let i = 0; i < size; i++) {
    lines.push(
      <line key={`h${i}`} x1={px(0)} y1={px(i)} x2={px(size - 1)} y2={px(i)} stroke="var(--board-line)" strokeWidth={i === 0 || i === size - 1 ? 1.4 : 1} />
    );
    lines.push(
      <line key={`v${i}`} x1={px(i)} y1={px(0)} x2={px(i)} y2={px(size - 1)} stroke="var(--board-line)" strokeWidth={i === 0 || i === size - 1 ? 1.4 : 1} />
    );
  }

  const stars = starPoints(size).map((p, i) => (
    <circle key={`s${i}`} cx={px(p.x)} cy={px(p.y)} r={2.6} fill="var(--board-line)" />
  ));

  const stones = [];
  const labels = [];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const s = position.board[y][x];
      if (!s) continue;
      stones.push(
        s === "B" ? (
          <circle key={`b${x}-${y}`} cx={px(x)} cy={px(y)} r={CELL * 0.47} fill="url(#stone-black)" />
        ) : (
          <g key={`w${x}-${y}`}>
            <circle cx={px(x)} cy={px(y)} r={CELL * 0.47} fill="url(#stone-white)" stroke="var(--stone-white-edge)" strokeWidth={0.8} />
          </g>
        )
      );
    }
  }

  if (showNumbers) {
    for (const n of position.numbers) {
      // 포석으로 사라진 돌은 표시하지 않음
      if (position.board[n.y][n.x] !== n.color) continue;
      labels.push(
        <text
          key={`n${n.x}-${n.y}-${n.n}`}
          x={px(n.x)}
          y={px(n.y)}
          dy="0.35em"
          textAnchor="middle"
          fontSize={n.n >= 100 ? 9 : 11}
          fontWeight={700}
          fill={n.color === "B" ? "var(--num-on-black)" : "var(--num-on-white)"}
          pointerEvents="none"
        >
          {n.n}
        </text>
      );
    }
  }

  const last = position.lastMove;
  const lastMarker =
    last && position.board[last.y][last.x] ? (
      <circle
        cx={px(last.x)}
        cy={px(last.y)}
        r={CELL * 0.16}
        fill="none"
        stroke={position.board[last.y][last.x] === "B" ? "var(--num-on-black)" : "var(--num-on-white)"}
        strokeWidth={2.2}
      />
    ) : null;

  const coords = [];
  if (showCoords) {
    for (let i = 0; i < size; i++) {
      coords.push(
        <text key={`cl${i}`} x={px(i)} y={14} textAnchor="middle" fontSize={10} fill="var(--board-coord)">
          {COL_LETTERS[i]}
        </text>,
        <text key={`cn${i}`} x={7} y={px(i)} dy="0.35em" textAnchor="middle" fontSize={10} fill="var(--board-coord)">
          {size - i}
        </text>
      );
    }
  }

  return (
    <svg viewBox={`0 0 ${total} ${total}`} className="board-svg" role="img" aria-label="바둑판">
      <defs>
        <radialGradient id="stone-black" cx="35%" cy="30%" r="75%">
          <stop offset="0%" stopColor="#5a5a5a" />
          <stop offset="35%" stopColor="#2b2b2b" />
          <stop offset="100%" stopColor="#000" />
        </radialGradient>
        <radialGradient id="stone-white" cx="35%" cy="35%" r="75%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="70%" stopColor="#e6e4df" />
          <stop offset="100%" stopColor="#c9c6bf" />
        </radialGradient>
      </defs>
      <rect x={0} y={0} width={total} height={total} rx={6} fill="var(--board-wood)" />
      {coords}
      {lines}
      {stars}
      {stones}
      {labels}
      {lastMarker}
    </svg>
  );
}

export const Board = memo(BoardInner);