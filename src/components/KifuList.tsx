import { useState } from "react";
import type { KifuEntry } from "../types";

interface KifuListProps {
  entries: KifuEntry[];
  onOpen: (entry: KifuEntry) => void;
}

const KYU_VALUES = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1];

function resultLabel(e: KifuEntry): string {
  const side = e.winner === "B" ? "흑" : "백";
  const how: Record<string, string> = { Resignation: "불계", Timeout: "시간" };
  const m = e.outcome.match(/^([\d.]+) points$/);
  const howText = m ? `${m[1]}점` : (how[e.outcome] ?? e.outcome);
  return `${side} ${howText} 승`;
}

export function KifuList({ entries, onOpen }: KifuListProps) {
  const [kyu, setKyu] = useState(10);

  const filtered = entries
    .filter((e) => e.kyu === kyu)
    .sort((a, b) => (b.ended ?? "").localeCompare(a.ended ?? ""));

  return (
    <div className="kifu-list">
      <div className="tabs" role="tablist" aria-label="급수 선택">
        {KYU_VALUES.map((k) => {
          const count = entries.filter((e) => e.kyu === k).length;
          return (
            <button
              key={k}
              role="tab"
              aria-selected={k === kyu}
              className={`tab ${k === kyu ? "active" : ""} ${count === 0 ? "empty" : ""}`}
              onClick={() => setKyu(k)}
            >
              {k}급
            </button>
          );
        })}
      </div>

      <p className="tab-hint">
        {kyu}급 급수대 플레이어들의 실전 대국 {filtered.length}국입니다. 공부하고 싶은 기보를 선택하세요.
      </p>

      <ul className="game-list">
        {filtered.length === 0 && (
          <li className="none">
            이 급수의 기보가 아직 없습니다. <code>npm run fetch-games</code>로 기보를 더 수집할 수 있어요.
          </li>
        )}
        {filtered.map((e) => (
          <li key={e.id}>
            <button className="game-row" onClick={() => onOpen(e)}>
              <span className="players">
                <span className="stone-dot black" aria-hidden />
                {e.black.name} <em>({e.black.kyu}급)</em>
                <span className="vs">vs</span>
                <span className="stone-dot white" aria-hidden />
                {e.white.name} <em>({e.white.kyu}급)</em>
              </span>
              <span className="meta">
                {resultLabel(e)}
                {e.handicap > 0 && <> · 핸디캡 {e.handicap}</>}
                {e.ended && <> · {e.ended}</>}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}