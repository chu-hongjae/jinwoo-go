import type { Move, SgfGame } from "../types";

/**
 * SGF 파일을 파싱해 게임 정보와 메인 라인 수순을 얻는다.
 * 변화수(브랜치)는 무시하고 첫 번째 자식만 따라간다.
 */

interface SgfNode {
  props: Record<string, string[]>;
  children: SgfNode[];
}

const LETTERS = "abcdefghijklmnopqrstuvwxyz";

function parseSgf(src: string): SgfNode {
  let i = 0;
  const n = src.length;

  function skipWs() {
    while (i < n && /\s/.test(src[i])) i++;
  }

  function parseValue(): string {
    // i가 '[' 위치
    i++; // '['
    let out = "";
    while (i < n) {
      const c = src[i];
      if (c === "\\") {
        i++;
        if (i < n) {
          out += src[i];
          i++;
        }
        continue;
      }
      if (c === "]") {
        i++;
        return out;
      }
      out += c;
      i++;
    }
    return out;
  }

  function parseNode(): SgfNode {
    // i가 ';' 위치
    const props: Record<string, string[]> = {};
    i++; // ';'
    skipWs();
    while (i < n) {
      const c = src[i];
      if (!/[A-Z]/.test(c)) break;
      let id = "";
      while (i < n && /[A-Z]/.test(src[i])) {
        id += src[i];
        i++;
      }
      const values: string[] = [];
      while (true) {
        skipWs();
        if (src[i] !== "[") break;
        values.push(parseValue());
      }
      props[id] = values;
      skipWs();
    }
    const children: SgfNode[] = [];
    skipWs();
    while (i < n) {
      const c = src[i];
      if (c === ";") {
        children.push(parseNode());
        skipWs();
      } else if (c === "(") {
        i++; // '('
        children.push(parseNode());
        skipWs();
      } else if (c === ")") {
        i++;
        break;
      } else {
        break;
      }
    }
    return { props, children };
  }

  skipWs();
  if (src[i] !== "(") throw new Error("SGF 형식 오류: '(' 로 시작하지 않음");
  i++;
  const root = parseNode();
  return root;
}

/** 메인 라인: 루트에서 첫 번째 자식만 계속 따라간다. */
function mainLineNodes(root: SgfNode): SgfNode[] {
  const nodes: SgfNode[] = [root];
  let cur = root;
  while (cur.children.length > 0) {
    cur = cur.children[0];
    nodes.push(cur);
  }
  return nodes;
}

function readCoord(value: string | undefined, boardSize: number): { x: number; y: number } {
  if (!value || value.length !== 2) return { x: -1, y: -1 };
  const x = LETTERS.indexOf(value[0]);
  const y = LETTERS.indexOf(value[1]);
  if (x < 0 || y < 0 || x >= boardSize || y >= boardSize) return { x: -1, y: -1 };
  return { x, y };
}

export function parseGame(sgfSrc: string): SgfGame {
  const root = parseSgf(sgfSrc);
  const rootProps = root.props;

  const boardSize = Number(rootProps.SZ?.[0] ?? 19) || 19;
  const handicap = Number(rootProps.HA?.[0] ?? 0) || 0;

  const setup: Move[] = [];
  const moves: Move[] = [];

  const nodes = mainLineNodes(root);
  for (const node of nodes) {
    // 중간에 나오는 설정 돌도 처리 (드묾)
    for (const v of node.props.AB ?? []) {
      const p = readCoord(v, boardSize);
      if (p.x >= 0) setup.push({ color: "B", x: p.x, y: p.y });
    }
    for (const v of node.props.AW ?? []) {
      const p = readCoord(v, boardSize);
      if (p.x >= 0) setup.push({ color: "W", x: p.x, y: p.y });
    }
    if (node.props.B?.length) {
      const p = readCoord(node.props.B[0], boardSize);
      moves.push({ color: "B", x: p.x, y: p.y });
    }
    if (node.props.W?.length) {
      const p = readCoord(node.props.W[0], boardSize);
      moves.push({ color: "W", x: p.x, y: p.y });
    }
  }

  return {
    boardSize,
    handicap,
    komi: rootProps.KM?.[0],
    blackName: rootProps.PB?.[0],
    whiteName: rootProps.PW?.[0],
    blackRank: rootProps.BR?.[0],
    whiteRank: rootProps.WR?.[0],
    result: rootProps.RE?.[0],
    date: rootProps.DT?.[0],
    event: rootProps.GN?.[0] ?? rootProps.EV?.[0],
    setup,
    moves,
  };
}