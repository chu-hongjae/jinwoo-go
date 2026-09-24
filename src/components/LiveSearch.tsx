import { useState } from "react";
import type { KifuEntry } from "../types";
import { findLiveKifu } from "../lib/api";

interface LiveSearchProps {
  onOpen: (entry: KifuEntry) => void;
}

const KYU_OPTIONS = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1];

function resultLabel(e: KifuEntry): string {
  const side = e.winner === "B" ? "흑" : "백";
  const how: Record<string, string> = { Resignation: "불계", Timeout: "시간" };
  const m = e.outcome.match(/^([\d.]+) points$/);
  const howText = m ? `${m[1]}점` : (how[e.outcome] ?? e.outcome);
  return `${side} ${howText} 승`;
}

export function LiveSearch({ onOpen }: LiveSearchProps) {
  const [kyu, setKyu] = useState(5);
  const [searching, setSearching] = useState(false);
  const [progress, setProgress] = useState("");
  const [results, setResults] = useState<KifuEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const search = async () => {
    setSearching(true);
    setResults(null);
    try {
      const found = await findLiveKifu(
        Math.max(1, kyu - 1), // 경계 근처 급수 차이는 허용
        kyu,
        (foundCount: number, done: number, total: number) => {
          setProgress(`${done}/${total}명 조회 중 — ${foundCount}국 발견`);
        }
      );
      setResults(found);
      setProgress(`검색 완료: ${found.length}국`);
    } catch (e) {
      setResults([]);
      setProgress(`검색 실패: ${e instanceof Error ? e.message : String(e)}`);
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="live-search">
      <p className="tab-hint">
        OGS(online-go.com)에 접속해 선택한 급수의 최근 실전 대국을 브라우저에서 직접 찾아옵니다.
        (약 20~30초 소요)
      </p>
      <div className="live-controls">
        <label className="opt">
          급수{" "}
          <select value={kyu} onChange={(e) => setKyu(Number(e.target.value))}>
            {KYU_OPTIONS.map((k) => (
              <option key={k} value={k}>
                {k}급
              </option>
            ))}
          </select>
        </label>
        <button className="btn primary" onClick={search} disabled={searching}>
          {searching ? "검색 중…" : "🔍 기보 검색"}
        </button>
        {progress && <span className="live-progress">{progress}</span>}
      </div>

      {error && <p className="error">{error}</p>}

      {results != null && (
        <ul className="game-list">
          {results.length === 0 && (
            <li className="none">검색 결과가 없습니다. 다시 시도해 보세요.</li>
          )}
          {results.map((e) => (
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
      )}
    </div>
  );
}