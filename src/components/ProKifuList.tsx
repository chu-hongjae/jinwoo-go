import { useState } from "react";
import type { KifuEntry } from "../types";

interface ProKifuListProps {
  entries: KifuEntry[];
  onOpen: (entry: KifuEntry) => void;
}

function resultLabel(e: KifuEntry): string {
  const side = e.winner === "B" ? "흑" : "백";
  const how: Record<string, string> = { Resignation: "불계", Timeout: "시간", Forfeit: "몰수" };
  const m = e.outcome.match(/^([\d.]+) points$/);
  const howText = m ? `${m[1]}점` : (how[e.outcome] ?? e.outcome);
  return `${side} ${howText} 승`;
}

export function ProKifuList({ entries, onOpen }: ProKifuListProps) {
  const players = [...new Set(entries.map((e) => e.featured ?? ""))].filter(Boolean);
  const [player, setPlayer] = useState(players[0] ?? "");

  const filtered = entries
    .filter((e) => e.featured === player)
    .sort((a, b) => (b.ended ?? "").localeCompare(a.ended ?? ""));

  return (
    <div className="kifu-list">
      <div className="tabs" role="tablist" aria-label="선수 선택">
        {players.map((p) => (
          <button
            key={p}
            role="tab"
            aria-selected={p === player}
            className={`tab ${p === player ? "active" : ""}`}
            onClick={() => setPlayer(p)}
          >
            {p}
          </button>
        ))}
      </div>

      <p className="tab-hint">
        {player} 9단의 최근 실전 대국 {filtered.length}국입니다.
      </p>

      <ul className="game-list">
        {filtered.map((e) => (
          <li key={e.id}>
            <button className="game-row" onClick={() => onOpen(e)}>
              <span className="players">
                <span className="stone-dot black" aria-hidden />
                {e.black.name} <em>({e.black.rank ?? "?"})</em>
                <span className="vs">vs</span>
                <span className="stone-dot white" aria-hidden />
                {e.white.name} <em>({e.white.rank ?? "?"})</em>
              </span>
              <span className="meta">
                {resultLabel(e)}
                {e.ended && <> · {e.ended}</>}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}