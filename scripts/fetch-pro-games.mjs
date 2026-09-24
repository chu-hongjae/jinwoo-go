/**
 * GoKifu(gokifu.com)에서 프로 기보(신진서·이세돌·이창호·조훈현)를 수집해
 * public/kifu/pro/{key}-{i}.sgf 와 public/kifu/pro.json 을 만드는 스크립트.
 *
 * 사용: npm run fetch-pro-games
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const GOKIFU = "http://gokifu.com";
const GAMES_PER_PLAYER = 8;
const REQUEST_DELAY_MS = 800;
const OUT_DIR = path.resolve("public", "kifu", "pro");

const PLAYERS = [
  { slug: "Shin+Jinseo", key: "shinjinseo", ko: "신진서", rank: "9단" },
  { slug: "Lee+Sedol", key: "leesedol", ko: "이세돌", rank: "9단" },
  { slug: "Lee+Changho", key: "leechangho", ko: "이창호", rank: "9단" },
  { slug: "Cho+Hunhyun", key: "chohoonhyun", ko: "조훈현", rank: "9단" },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchText(url, attempts = 4) {
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0", Accept: "text/html,*/*" },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = await res.arrayBuffer();
      // UTF-8이 아니면 EUC-KR(한글 페이지)로 디코딩한다.
      try {
        return new TextDecoder("utf-8", { fatal: true }).decode(buf);
      } catch {
        return new TextDecoder("euc-kr").decode(buf);
      }
    } catch (e) {
      console.log(`  재시도 ${i + 1}/${attempts} (${e.message})`);
      await sleep(4000 * (i + 1));
    }
  }
  return null;
}

/** GoKifu는 한글/한자를 이중 인코딩(UTF-8→Latin-1)해서 보내는 경우가 있어 복구한다. */
function fixUtf8Mojibake(s) {
  if (!s || [...s].some((c) => c.charCodeAt(0) > 0xff)) return s;
  try {
    return new TextDecoder("utf-8").decode(
      Uint8Array.from([...s].map((c) => c.charCodeAt(0) & 0xff))
    );
  } catch {
    return s;
  }
}

/** SGF 헤더에서 메타데이터 추출 */
function sgfMeta(sgfSrc) {
  const prop = (id) => {
    const m = sgfSrc.match(new RegExp(`${id}\\[([^\\]]*)\\]`));
    return m ? m[1] : undefined;
  };
  const rankKo = (r) => {
    if (!r) return undefined;
    const m = r.match(/(\d+)\s*[dp]/);
    return m ? `${m[1]}단` : undefined;
  };
  // RE: B+R(불계), B+T(시간), B+F(몰수), B+숫자(집 계산)
  const re = prop("RE") ?? "";
  let winner = null;
  let outcome = re;
  const rm = re.match(/^(B|W)\+(R|T|F|[\d.]+)?/);
  if (rm) {
    winner = rm[1];
    if (rm[2] === "R") outcome = "Resignation";
    else if (rm[2] === "T") outcome = "Timeout";
    else if (rm[2] === "F") outcome = "Forfeit";
    else if (rm[2]) outcome = `${rm[2]} points`;
    else outcome = re;
  }
  const dt = prop("DT");
  const komiRaw = prop("KM");
  let komi = komiRaw ? Number.parseFloat(komiRaw) : null;
  if (komi != null && komi > 100) komi /= 100; // GoKifu는 6.5를 650으로 저장
  return {
    blackName: prop("PB"),
    whiteName: prop("PW"),
    blackRank: rankKo(prop("BR")),
    whiteRank: rankKo(prop("WR")),
    winner,
    outcome,
    date: dt ? dt.slice(0, 10) : null,
    komi,
    event: fixUtf8Mojibake(prop("GN") ?? prop("EV")),
  };
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const index = [];

  for (const player of PLAYERS) {
    console.log(`[${player.ko}] 페이지 조회...`);
    const html = await fetchText(`${GOKIFU}/player/${player.slug}`);
    if (!html) {
      console.log(`  페이지를 가져오지 못했습니다. 건너뜀.`);
      continue;
    }
    const urls = [
      ...new Set(
        [...html.matchAll(/href="([^"]+\.sgf[^"]*)"/g)].map((m) => m[1])
      ),
    ];
    console.log(`  SGF 링크 ${urls.length}개 발견`);

    let saved = 0;
    const seenKeys = new Set();
    for (const url of urls) {
      if (saved >= GAMES_PER_PLAYER) break;
      const sgf = await fetchText(url, 3);
      if (!sgf || !sgf.startsWith("(")) continue;
      const meta = sgfMeta(sgf);
      if (!meta.winner) continue;
      const dedupeKey = `${meta.date}|${meta.blackName}|${meta.whiteName}`;
      if (seenKeys.has(dedupeKey)) continue;
      seenKeys.add(dedupeKey);

      // 파일 본문에도 깨진 대회명을 복구해서 저장
      const sgfFixed = sgf.replace(/G[NE]\[([^\]]*)\]/g, (m, v) =>
        m.replace(v, fixUtf8Mojibake(v))
      );

      const file = `${player.key}-${saved + 1}.sgf`;
      await writeFile(path.join(OUT_DIR, file), sgfFixed, "utf-8");
      index.push({
        id: `${player.key}-${saved + 1}`,
        category: "pro",
        featured: player.ko,
        file: `pro/${file}`,
        handicap: 0,
        komi: meta.komi,
        outcome: meta.outcome,
        winner: meta.winner,
        ended: meta.date,
        black: {
          name: meta.blackName ?? player.ko,
          rank: meta.blackRank ?? player.rank,
        },
        white: {
          name: meta.whiteName ?? "?",
          rank: meta.whiteRank ?? player.rank,
        },
      });
      saved++;
      console.log(`  저장: ${meta.blackName} vs ${meta.whiteName} (${meta.date})`);
      await sleep(REQUEST_DELAY_MS);
    }
    if (saved === 0) console.log(`  기보를 저장하지 못했습니다.`);
    await sleep(REQUEST_DELAY_MS);
  }

  const proJsonPath = path.resolve("public", "kifu", "pro.json");
  await writeFile(proJsonPath, JSON.stringify(index, null, 2), "utf-8");
  console.log(`완료: pro.json ${index.length}국`);
}

main().catch((e) => {
  console.error("수집 실패:", e);
  process.exit(1);
});