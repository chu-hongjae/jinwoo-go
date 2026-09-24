import axios from "axios";
import type { KifuEntry } from "../types";

const base = import.meta.env.BASE_URL;

/** 정적 기보 파일(빌드 시 내장된 SGF) 접근 */
const staticApi = axios.create({ baseURL: base });

export async function fetchKifuIndex(): Promise<KifuEntry[]> {
  const { data } = await staticApi.get<KifuEntry[]>("kifu/index.json");
  return data;
}

export async function fetchProIndex(): Promise<KifuEntry[]> {
  try {
    const { data } = await staticApi.get<KifuEntry[]>("kifu/pro.json");
    return data;
  } catch {
    return []; // 아직 프로 기보가 없으면 빈 목록
  }
}

/** 내장 기보 SGF 본문 */
export async function fetchSgf(file: string): Promise<string> {
  const { data } = await staticApi.get<string>(`kifu/${file}`, { responseType: "text" });
  return data;
}

/** 기보 항목에 맞는 소스에서 SGF 본문을 가져온다 (내장 파일 또는 OGS 실시간) */
export async function fetchSgfForEntry(entry: KifuEntry): Promise<string> {
  if (entry.sgfUrl) return fetchOgsSgf(Number(entry.id));
  return fetchSgf(entry.file);
}

/* ── 로컬 기보 데이터 (data/kifu/…/*.json) ── */

const ogsApi = axios.create({ baseURL: "https://online-go.com/api/v1" });

export interface OgsGameListItem {
  id: number;
  ended: string | null;
  handicap: number;
  komi: number | null;
  outcome: string;
  black_lost: boolean | null;
  white_lost: boolean | null;
  rengo?: boolean;
  width: number;
  height: number;
  annulled?: boolean;
  players: {
    black: OgsPlayerInfo;
    white: OgsPlayerInfo;
  };
}

interface OgsPlayerInfo {
  id: number;
  username: string;
  ranking: number | null;
  ratings?: { overall?: { rating: number; deviation: number } };
}

interface OgsLadderPlayer {
  player: { id: number; username: string; ranking: number | null } | null;
}

/** OGS ranking → 급수 (30 = 1단 기준) */
export const kyuOf = (ranking: number) => Math.round(30 - ranking);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** 사이트 19x19 래더에서 급수 범위 플레이어를 샘플링해 찾는다 */
export async function findKyuPlayers(
  kyuMin: number,
  kyuMax: number,
  pages: number[] = [40, 60, 80, 100, 120, 140]
): Promise<{ id: number; username: string; kyu: number }[]> {
  const candidates: { id: number; username: string; kyu: number }[] = [];
  const seen = new Set<number>();
  for (const page of pages) {
    const { data } = await ogsApi.get<{ results: OgsLadderPlayer[] }>(
      `/ladders/313/players?page=${page}`
    );
    for (const entry of data.results ?? []) {
      const p = entry.player;
      if (!p || !p.username || /bot/i.test(p.username)) continue;
      if (p.ranking == null || seen.has(p.id)) continue;
      const kyu = kyuOf(p.ranking);
      if (kyu < kyuMin || kyu > kyuMax) continue;
      seen.add(p.id);
      candidates.push({ id: p.id, username: p.username, kyu });
    }
    await sleep(250);
  }
  return candidates;
}

/** 플레이어의 최근 대국 목록 */
export async function fetchPlayerGames(playerId: number): Promise<OgsGameListItem[]> {
  const { data } = await ogsApi.get<{ results: OgsGameListItem[] }>(
    `/players/${playerId}/games?page_size=25`
  );
  return data.results ?? [];
}

/** OGS 게임 SGF 본문 (브라우저에서 직접 다운로드) */
export async function fetchOgsSgf(gameId: number): Promise<string> {
  const { data } = await ogsApi.get<string>(`/games/${gameId}/sgf`, {
    responseType: "text",
  });
  return data;
}

/** 실시간 검색: 양쪽 다 급수 범위인 19x19 종료 대국을 찾는다 */
export async function findLiveKifu(
  kyuMin: number,
  kyuMax: number,
  onProgress: (found: number, done: number, total: number) => void
): Promise<KifuEntry[]> {
  const players = await findKyuPlayers(kyuMin, kyuMax);
  const found: KifuEntry[] = [];
  const seenIds = new Set<number>();
  let done = 0;

  for (const player of players) {
    if (found.length >= 40) break;
    let games: OgsGameListItem[];
    try {
      games = await fetchPlayerGames(player.id);
    } catch {
      continue;
    }
    done++;
    for (const g of games) {
      if (seenIds.has(g.id)) continue;
      if (!g.ended || g.annulled || g.outcome === "Cancellation" || g.rengo) continue;
      if (g.width !== 19 || g.height !== 19) continue;
      if (!g.players?.black?.ranking || !g.players?.white?.ranking) continue;
      if (/bot/i.test(g.players.black.username) || /bot/i.test(g.players.white.username)) continue;

      const bKyu = kyuOf(g.players.black.ranking);
      const wKyu = kyuOf(g.players.white.ranking);
      if (bKyu < kyuMin || bKyu > kyuMax || wKyu < kyuMin || wKyu > kyuMax) continue;

      const winner = g.white_lost ? "B" : g.black_lost ? "W" : null;
      if (!winner) continue;

      seenIds.add(g.id);
      found.push({
        id: g.id,
        category: "kyu",
        kyu: Math.round(30 - (g.players.black.ranking + g.players.white.ranking) / 2),
        file: "", // sgfUrl 사용
        sgfUrl: `/games/${g.id}/sgf`,
        handicap: g.handicap ?? 0,
        komi: g.komi ?? null,
        outcome: g.outcome,
        winner,
        ended: g.ended?.slice(0, 10) ?? null,
        black: { name: g.players.black.username, kyu: bKyu },
        white: { name: g.players.white.username, kyu: wKyu },
      });
    }
    onProgress(found.length, done, players.length);
    await sleep(250);
  }
  return found;
}