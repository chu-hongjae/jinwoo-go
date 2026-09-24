import { useEffect, useRef, useState, type ReactNode } from "react";
import type { KifuEntry } from "./types";
import { fetchKifuIndex, fetchProIndex } from "./lib/api";
import { KifuList } from "./components/KifuList";
import { ProKifuList } from "./components/ProKifuList";
import { LiveSearch } from "./components/LiveSearch";
import { Viewer } from "./components/Viewer";

type Mode = "kyu" | "pro" | "live";

/* 화면 전환 페이드 — 나가는 화면이 사라진 뒤 들어오는 화면이 나타남 */
function FadeView({ k, children }: { k: string; children: ReactNode }) {
  const [current, setCurrent] = useState<{ k: string; children: ReactNode }>({
    k,
    children,
  });
  const [leaving, setLeaving] = useState(false);
  const latest = useRef({ k, children });
  latest.current = { k, children };

  useEffect(() => {
    if (k === current.k) return;
    setLeaving(true);
    const t = setTimeout(() => {
      setCurrent(latest.current);
      setLeaving(false);
    }, 300);
    return () => clearTimeout(t);
  }, [k, current.k]);

  return (
    <div className={`view-fade ${leaving ? "view-fade-out" : ""}`}>
      {k === current.k && !leaving ? children : current.children}
    </div>
  );
}

export default function App() {
  const [entries, setEntries] = useState<KifuEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<KifuEntry | null>(null);
  const [mode, setMode] = useState<Mode>("kyu");

  // 브라우저 뒤로가기 버튼도 목록으로 돌아오게 — hash에 기보 id를 남긴다
  const openKifu = (e: KifuEntry) => {
    setSelected(e);
    const hash = `#/kifu/${e.id}`;
    if (window.location.hash !== hash) window.location.hash = hash;
  };

  const closeKifu = () => {
    if (window.location.hash) {
      window.history.back(); // hashchange로 상태가 정리된다
    } else {
      setSelected(null);
    }
  };

  // 상세 화면에서 상단 메뉴를 누르면 해당 모드 목록으로 이동
  const switchMode = (m: Mode) => {
    setMode(m);
    if (selected) closeKifu();
  };

  useEffect(() => {
    const onHash = () => {
      const m = window.location.hash.match(/^#\/kifu\/(.+)$/);
      if (!m) {
        setSelected(null);
        return;
      }
      // id는 JSON에서 숫자로 올 수 있으니 문자열로 통일해 비교
      const id = decodeURIComponent(m[1]);
      setSelected((cur) =>
        cur && String(cur.id) === id
          ? cur
          : (entries?.find((e) => String(e.id) === id) ?? null)
      );
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, [entries]);

  useEffect(() => {
    Promise.all([fetchKifuIndex(), fetchProIndex()])
      .then(([kyuData, proData]) => {
        setEntries([...proData, ...kyuData]);
      })
      .catch((e) => setError(`기보 목록을 불러올 수 없습니다: ${e.message}`));
  }, []);

  const kyuEntries = entries?.filter((e) => e.category !== "pro") ?? null;
  const proEntries = entries?.filter((e) => e.category === "pro") ?? null;
  const viewKey = selected ? `v-${selected.id}` : `m-${mode}`;

  return (
    <div className="app">
      <div className="mode-tabs">
        <button
          className={`mode-tab ${mode === "kyu" ? "active" : ""}`}
          onClick={() => switchMode("kyu")}
        >
          급수 기보 (10급~1급)
        </button>
        <button
          className={`mode-tab ${mode === "pro" ? "active" : ""}`}
          onClick={() => switchMode("pro")}
        >
          프로 기보 (신진서·이세돌·이창호·조훈현)
        </button>
        <button
          className={`mode-tab ${mode === "live" ? "active" : ""}`}
          onClick={() => switchMode("live")}
        >
          실시간 검색 (OGS)
        </button>
      </div>

      <main>
        {error && <p className="error">{error}</p>}
        <FadeView k={viewKey}>
          {!error && entries == null && <p className="loading">불러오는 중…</p>}
          {entries != null &&
            (selected ? (
              <Viewer key={selected.id} entry={selected} onBack={closeKifu} />
            ) : mode === "kyu" ? (
              kyuEntries && <KifuList entries={kyuEntries} onOpen={openKifu} />
            ) : mode === "pro" ? (
              <ProKifuList entries={proEntries ?? []} onOpen={openKifu} />
            ) : (
              <LiveSearch onOpen={openKifu} />
            ))}
        </FadeView>
      </main>

      <footer className="footer">
        기보 출처: OGS (online-go.com) 공개 API · GoKifu (gokifu.com)
      </footer>
    </div>
  );
}
