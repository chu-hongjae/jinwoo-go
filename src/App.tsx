import { useEffect, useState } from "react";
import type { KifuEntry } from "./types";
import { KifuList } from "./components/KifuList";
import { Viewer } from "./components/Viewer";

const base = import.meta.env.BASE_URL;

export default function App() {
  const [entries, setEntries] = useState<KifuEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<KifuEntry | null>(null);

  useEffect(() => {
    fetch(`${base}kifu/index.json`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => setEntries(data as KifuEntry[]))
      .catch((e) => setError(`기보 목록을 불러올 수 없습니다: ${e.message}`));
  }, []);

  return (
    <div className="app">
      <header className="header">
        <h1>진우 바둑 기보 공부방</h1>
        <p className="subtitle">급수별 실전 기보를 한 수씩 따라가며 공부하세요</p>
      </header>

      <main>
        {error && <p className="error">{error}</p>}
        {!error && entries == null && <p className="loading">불러오는 중…</p>}
        {entries != null &&
          (selected ? (
            <Viewer key={selected.id} entry={selected} onBack={() => setSelected(null)} />
          ) : (
            <KifuList entries={entries} onOpen={setSelected} />
          ))}
      </main>

      <footer className="footer">
        기보 출처: OGS (online-go.com) 공개 API · 10급~1급 아마추어 실전 대국
      </footer>
    </div>
  );
}