/**
 * OGS(online-go.com) 공개 API에서 10급~1급 아마추어 대국 기보를 수집해
 * public/kifu/{k}k/game-{id}.sgf 와 public/kifu/index.json 을 만드는 스크립트.
 *
 * OGS ranking 값: 30 = 1단 기준. 급수 k = round(30 - ranking).
 * - 10급 ≈ ranking 20, 1급 ≈ ranking 29
 *
 * 사용: npm run fetch-games
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const API = "https://online-go.com/api/v1";
const LADDER_ID = 313; // Site 19x19 Ladder (약 30급~6단, 강함 순 정렬)
const KYU_MIN = 1; // 1급
const KYU_MAX = 10; // 10급
const GAMES_PER_KYU = 6; // 급수당 목표 국수
const MAX_GAMES_PER_PLAYER = 3; // 한 플레이어가 차지할 수 있는 최대 국수 (다양성 확보)
const REQUEST_DELAY_MS = 300;
const OUT_DIR = path.resolve("public", "kifu");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const kyuOf = (ranking) => Math.round(30 - ranking);

async function apiGet(url, attempts = 3) {
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url, { headers: { Accept: "application/json" } });
      if (res.status === 429) {
        console.log("  429 rate-limited, 3초 대기 후 재시도...");
        await sleep(3000);
        continue;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      if (i === attempts - 1) throw e;
      await sleep(1000 * (i + 1));
    }
  }
}

const delay = () => sleep(REQUEST_DELAY_MS);

/** 래더 플레이어 페이지를 샘플링해 10급~1급대 플레이어 후보를 모은다. */
async function collectCandidatePlayers() {
  const candidates = [];
  const seen = new Set();
  // 전체 3652명 / 25명 = 147페이지. 강함 순이므로 30쪽부터 끝쪽까지 샘플링.
  const probePages = [];
  for (let p = 30; p <= 146; p += 6) probePages.push(p);

  let lastInfo = "";
  for (const page of probePages) {
    const res = await apiGet(`${API}/ladders/${LADDER_ID}/players?page=${page}`);
    const players = res.results ?? [];
    if (players.length === 0) break;
    let found = 0;
    for (const entry of players) {
      const p = entry.player;
      if (!p || !p.username || /bot/i.test(p.username)) continue;
      const ranking = p.ranking;
      if (ranking == null) continue;
      const kyu = kyuOf(ranking);
      if (kyu < KYU_MIN || kyu > KYU_MAX) continue;
      if (seen.has(p.id)) continue;
      seen.add(p.id);
      candidates.push({ id: p.id, username: p.username, ranking, kyu });
      found++;
    }
    const sample = players[Math.floor(players.length / 2)]?.player;
    const info = `page ${page}: +${found}명 (대표 ranking ${sample?.ranking?.toFixed?.(1) ?? "?"})`;
    if (info !== lastInfo) console.log(info);
    lastInfo = info;
    await delay();
  }
  return candidates;
}

/** 후보 플레이어들의 최근 대국 중 양쪽 다 10~1급인 19x19 종료 대국을 모은다. */
async function collectGames(candidates) {
  const games = [];
  const seenIds = new Set();
  const perPlayerCount = new Map();

  for (const cand of candidates) {
    let res;
    try {
      res = await apiGet(`${API}/players/${cand.id}/games?page_size=25`);
    } catch (e) {
      console.log(`  기보 목록 조회 실패 (${cand.username}): ${e.message}`);
      continue;
    }
    for (const g of res.results ?? []) {
      if (seenIds.has(g.id)) continue;
      if (!g.ended || g.annulled) continue;
      if (g.outcome === "Cancellation") continue;
      if (g.rengo) continue;
      if (g.width !== 19 || g.height !== 19) continue;
      if (!g.players?.black?.ranking || !g.players?.white?.ranking) continue;
      if (/bot/i.test(g.players.black.username) || /bot/i.test(g.players.white.username)) continue;

      const bKyu = kyuOf(g.players.black.ranking);
      const wKyu = kyuOf(g.players.white.ranking);
      if (bKyu < KYU_MIN || bKyu > KYU_MAX || wKyu < KYU_MIN || wKyu > KYU_MAX) continue;

      const kyu = Math.round(30 - (g.players.black.ranking + g.players.white.ranking) / 2);
      const winner = g.white_lost ? "B" : g.black_lost ? "W" : null;
      if (!winner) continue;

      // 한 플레이어당 국수 제한
      const ids = [g.players.black.id, g.players.white.id];
      if (ids.some((id) => (perPlayerCount.get(id) ?? 0) >= MAX_GAMES_PER_PLAYER)) continue;
      for (const id of ids) perPlayerCount.set(id, (perPlayerCount.get(id) ?? 0) + 1);

      seenIds.add(g.id);
      games.push({
        id: g.id,
        kyu,
        handicap: g.handicap ?? 0,
        komi: g.komi,
        outcome: g.outcome,
        winner,
        ended: g.ended?.slice(0, 10) ?? null,
        black: { name: g.players.black.username, kyu: bKyu },
        white: { name: g.players.white.username, kyu: wKyu },
      });
    }
    const filled = games.length;
    console.log(`  ${cand.username} (${cand.kyu}급): 누적 후보 ${filled}국`);
    await delay();
    if (enoughPerKyu(games)) break;
  }
  return games;
}

function countPerKyu(games) {
  const c = new Map();
  for (const g of games) c.set(g.kyu, (c.get(g.kyu) ?? 0) + 1);
  return c;
}

function enoughPerKyu(games) {
  const c = countPerKyu(games);
  for (let k = KYU_MIN; k <= KYU_MAX; k++) {
    if ((c.get(k) ?? 0) < GAMES_PER_KYU) return false;
  }
  return true;
}

/** 급수별로 GAMES_PER_KYU개씩 잘라 SGF를 내려받는다. */
async function downloadSgfs(games) {
  const chosen = new Map(); // kyu -> games[]
  for (const g of games) {
    const list = chosen.get(g.kyu) ?? [];
    if (list.length < GAMES_PER_KYU) {
      list.push(g);
      chosen.set(g.kyu, list);
    }
  }

  const index = [];
  for (let k = KYU_MIN; k <= KYU_MAX; k++) {
    const list = chosen.get(k) ?? [];
    const dir = path.join(OUT_DIR, `${k}k`);
    await mkdir(dir, { recursive: true });
    for (const g of list) {
      let sgf;
      try {
        const res = await fetch(`${API}/games/${g.id}/sgf`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        sgf = new TextDecoder("utf-8").decode(await res.arrayBuffer());
      } catch (e) {
        console.log(`  SGF 다운로드 실패 (${g.id}): ${e.message}`);
        continue;
      }
      const file = path.join(`${k}k`, `game-${g.id}.sgf`);
      await writeFile(path.join(OUT_DIR, file), sgf, "utf-8");
      index.push({ ...g, file });
      console.log(`  ${k}급 #${g.id} 저장 (${g.black.name} ${g.black.kyu}급 vs ${g.white.name} ${g.white.kyu}급)`);
      await delay();
    }
  }
  return index;
}

async function main() {
  console.log("1/3  래더에서 10~1급 플레이어 후보 수집...");
  const candidates = await collectCandidatePlayers();
  if (candidates.length === 0) {
    console.error("후보 플레이어를 찾지 못했습니다. 래더 페이지 범위를 확인하세요.");
    process.exit(1);
  }
  console.log(`  → 후보 ${candidates.length}명`);

  console.log("2/3  플레이어별 최근 대국에서 10~1급 대국 필터링...");
  const games = await collectGames(candidates);
  const c = countPerKyu(games);
  console.log(
    "  → 급수별 후보: " +
      [...Array(KYU_MAX - KYU_MIN + 1)]
        .map((_, i) => `${KYU_MAX - i}급:${c.get(KYU_MAX - i) ?? 0}`)
        .join(" ")
  );

  console.log("3/3  SGF 다운로드...");
  const index = await downloadSgfs(games);
  index.sort((a, b) => b.kyu - a.kyu || a.id - b.id);
  await writeFile(path.join(OUT_DIR, "index.json"), JSON.stringify(index, null, 2), "utf-8");
  console.log(`완료: index.json ${index.length}국`);
}

main().catch((e) => {
  console.error("수집 실패:", e);
  process.exit(1);
});