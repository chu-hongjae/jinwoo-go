import { useEffect, useState } from "react";
import type { KifuEntry } from "./types";
import { fetchKifuIndex, fetchProIndex } from "./lib/api";
import { KifuList } from "./components/KifuList";
import { ProKifuList } from "./components/ProKifuList";
import { LiveSearch } from "./components/LiveSearch";
import { Viewer } from "./components/Viewer";

type Mode = "kyu" | "pro" | "live";

export default function App() {
  const [entries, setEntries] = useState<KifuEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<KifuEntry | null>(null);
  const [mode, setMode] = useState<Mode>("kyu");

  useEffect(() => {
    Promise.all([fetchKifuIndex(), fetchProIndex()])
      .then(([kyuData, proData]) => {
        setEntries([...proData, ...kyuData]);
      })
      .catch((e) => setError(`기보 목록을 불러올 수 없습니다: ${e.message}`));
  }, []);

  const kyuEntries = entries?.filter((e) => e.category !== "pro") ?? null;
  const proEntries = entries?.filter((e) => e.category === "pro") ?? null;

  return (
    <div className="app">
      <header className="header">
        <h1>진우 바둑 기보 공부방</h1>
        <p className="subtitle">급수별·프로 실전 기보를 한 수씩 따라가며 공부하세요</p>
      </header>

      <div className="mode-tabs">
        <button
          className={`mode-tab ${mode === "kyu" ? "active" : ""}`}
          onClick={() => setMode("kyu")}
        >
          급수 기보 (10급~1급)
        </button>
        <button
          className={`mode-tab ${mode === "pro" ? "active" : ""}`}
          onClick={() => setMode("pro")}
        >
          프로 기보 (신진서·이세돌·이창호·조훈현)
        </button>
        <button
          className={`mode-tab ${mode === "live" ? "active" : ""}`}
          onClick={() => setMode("live")}
        >
          실시간 검색 (OGS)
        </button>
      </div>

      <main>
        {error && <p className="error">{error}</p>}
        {!error && entries == null && <p className="loading">불러오는 중…</p>}
        {entries != null &&
          (selected ? (
            <Viewer key={selected.id} entry={selected} onBack={() => setSelected(null)} />
          ) : mode === "kyu" ? (
            kyuEntries && <KifuList entries={kyuEntries} onOpen={setSelected} />
          ) : mode === "pro" ? (
            <ProKifuList entries={proEntries ?? []} onOpen={setSelected} />
          ) : (
            <LiveSearch onOpen={setSelected} />
          ))}
      </main>

      <footer className="footer">
        기보 출처: OGS (online-go.com) 공개 API · GoKifu (gokifu.com)
      </footer>
    </div>
  );
}