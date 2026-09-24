import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { KifuEntry } from "../types";
import { parseGame } from "../lib/sgf";
import { positionAfter } from "../lib/board";
import { fetchSgfForEntry } from "../lib/api";
import { Board } from "./Board";

function fmtOutcome(entry: KifuEntry): string {
  const side = entry.winner === "B" ? "흑" : "백";
  const how: Record<string, string> = {
    Resignation: "불계승",
    Timeout: "시간승",
    "Refunding All Games": "무효",
    Forfeit: "몰수승",
  };
  const m = entry.outcome.match(/^([\d.]+) points$/);
  const howText = m ? `${m[1]}점 승` : (how[entry.outcome] ?? entry.outcome);
  return `${side} ${howText}`;
}

interface ViewerProps {
  entry: KifuEntry;
  onBack: () => void;
}

export function Viewer({ entry, onBack }: ViewerProps) {
  const [sgfSrc, setSgfSrc] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [moveIndex, setMoveIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1.5); // 초/수
  const [showCoords, setShowCoords] = useState(true);
  const [showNumbers, setShowNumbers] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchSgfForEntry(entry)
      .then((text) => {
        if (!cancelled) setSgfSrc(text);
      })
      .catch((e) => {
        if (!cancelled) setLoadError(`기보 파일을 불러올 수 없습니다: ${e.message}`);
      });
    return () => {
      cancelled = true;
    };
  }, [entry]);

  // 파싱 실패는 렌더 시에 판단한다 (setState 없이)
  const game = useMemo(() => {
    if (!sgfSrc) return null;
    try {
      return parseGame(sgfSrc);
    } catch {
      return null;
    }
  }, [sgfSrc]);
  const parseError = sgfSrc != null && game == null;

  const totalMoves = game?.moves.length ?? 0;

  const go = useCallback(
    (delta: number) => {
      setMoveIndex((i) => Math.max(0, Math.min(totalMoves, i + delta)));
    },
    [totalMoves]
  );

  // 자동재생
  useEffect(() => {
    if (!playing) return;
    const t = setTimeout(() => {
      if (moveIndex + 1 >= totalMoves) {
        setPlaying(false); // 마지막 수에서 정지
      }
      setMoveIndex((i) => Math.min(totalMoves, i + 1));
    }, speed * 1000);
    return () => clearTimeout(t);
  }, [playing, moveIndex, totalMoves, speed]);

  // 키보드 조작
  const lastKey = useRef<string>("");
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === lastKey.current && e.repeat) return;
      lastKey.current = e.key;
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        go(-1);
      } else if (e.key === "ArrowRight" || e.key === "ArrowDown" || e.key === " ") {
        e.preventDefault();
        go(1);
      } else if (e.key === "Home") {
        e.preventDefault();
        setMoveIndex(0);
      } else if (e.key === "End") {
        e.preventDefault();
        setMoveIndex(totalMoves);
      } else if (e.key === "p" || e.key === "P") {
        setPlaying((p) => !p);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, totalMoves]);

  const position = useMemo(
    () => (game ? positionAfter(game, moveIndex) : null),
    [game, moveIndex]
  );

  const loadFailed = loadError != null;
  if (loadFailed || parseError) {
    return (
      <div className="viewer">
        <button className="btn back" onClick={onBack}>
          ← 목록으로
        </button>
        <p className="error">{loadError ?? "SGF 파싱에 실패했습니다."}</p>
      </div>
    );
  }

  const handicapText = entry.handicap > 0 ? `+${entry.handicap}점` : "무핸디캡";

  return (
    <div className="viewer">
      <div className="viewer-top">
        <button className="btn back" onClick={onBack}>
          ← 목록으로
        </button>
        <span className="badge kyu">{entry.category === "pro" ? `${entry.featured} 프로 기보` : `${entry.kyu}급 기보`}</span>
      </div>

      <div className="viewer-body">
        <div className="board-area">
          {position ? (
            <Board
              size={game!.boardSize}
              position={position}
              showCoords={showCoords}
              showNumbers={showNumbers}
            />
          ) : (
            <div className="board-loading">불러오는 중…</div>
          )}

          <div className="controls">
            <button className="btn" onClick={() => { setMoveIndex(0); setPlaying(false); }} title="처음 (Home)">
              ⏮
            </button>
            <button className="btn" onClick={() => { setPlaying(false); go(-1); }} title="이전 수 (←)">
              ◀
            </button>
            <button
              className="btn primary"
              onClick={() => setPlaying((p) => !p)}
              title="자동재생 (p)"
            >
              {playing ? "⏸ 정지" : "▶ 재생"}
            </button>
            <button className="btn" onClick={() => { setPlaying(false); go(1); }} title="다음 수 (→)">
              ▶
            </button>
            <button className="btn" onClick={() => { setMoveIndex(totalMoves); setPlaying(false); }} title="마지막 (End)">
              ⏭
            </button>
            <span className="move-count">
              수 {moveIndex} / {totalMoves}
            </span>
          </div>

          <div className="controls sub">
            <label className="opt">
              <input type="range" min={0.3} max={5} step={0.1} value={speed}
                onChange={(e) => setSpeed(Number(e.target.value))} />
              재생속도 {speed.toFixed(1)}초/수
            </label>
            <label className="opt">
              <input type="checkbox" checked={showNumbers} onChange={(e) => setShowNumbers(e.target.checked)} />
              수 번호
            </label>
            <label className="opt">
              <input type="checkbox" checked={showCoords} onChange={(e) => setShowCoords(e.target.checked)} />
              좌표
            </label>
            <input
              className="seek"
              type="range"
              min={0}
              max={totalMoves}
              value={moveIndex}
              onChange={(e) => { setPlaying(false); setMoveIndex(Number(e.target.value)); }}
              aria-label="수순 이동"
            />
          </div>
        </div>

        <aside className="info-panel">
          <h2>대국 정보</h2>
          <table className="info">
            <tbody>
              <tr>
                <th>흑</th>
                <td>{entry.black.name} ({entry.black.rank ?? `${entry.black.kyu}급`})</td>
              </tr>
              <tr>
                <th>백</th>
                <td>{entry.white.name} ({entry.white.rank ?? `${entry.white.kyu}급`})</td>
              </tr>
              <tr>
                <th>결과</th>
                <td>{fmtOutcome(entry)}</td>
              </tr>
              {game?.event && (
                <tr>
                  <th>대회</th>
                  <td>{game.event}</td>
                </tr>
              )}
              <tr>
                <th>핸디캡</th>
                <td>{handicapText}</td>
              </tr>
              <tr>
                <th>공짜</th>
                <td>{entry.komi ?? game?.komi ?? "-"}</td>
              </tr>
              <tr>
                <th>날짜</th>
                <td>{entry.ended ?? game?.date ?? "-"}</td>
              </tr>
              <tr>
                <th>잡은 돌</th>
                <td>
                  흑 {position?.capturedByB ?? 0} · 백 {position?.capturedByW ?? 0}
                </td>
              </tr>
            </tbody>
          </table>
          <p className="tip">💡 ←/→ 키로 수순을 넘겨볼 수 있어요. [수 번호]를 켜면 돌에 착수 순서가 표시됩니다.</p>
        </aside>
      </div>
    </div>
  );
}