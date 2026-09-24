# 진우 바둑 기보 공부방

10급~1급 급수별 실전 바둑 기보를 보여주는 학습용 웹 사이트입니다.
기보 데이터는 OGS(online-go.com) 공개 API에서 가져온 아마추어 실전 대국입니다.

## 실행 방법

```bash
npm install
npm run dev        # http://localhost:5173 에서 열림
```

빌드 및 배포:

```bash
npm run build      # dist/ 에 정적 파일 생성 — 아무 정적 호스팅에 올리면 됨
npm run preview
```

## 기보 데이터 갱신 (`npm run fetch-games`)

OGS의 19x19 사이트 래더(약 30급~6단 플레이어)에서 10급~1급 플레이어를 찾아,
양쪽 플레이어 모두 10~1급인 19x19 종료 대국을 급수당 6국씩 내려받습니다.

- 결과: `public/kifu/{k}k/game-{id}.sgf` + `public/kifu/index.json`
- 재실행하면 새 기보가 추가 수집되며(덮어쓰지 않음) `index.json`은 전체를 다시 생성합니다.
- 요청 간 300ms 대기로 OGS 서버에 예의 바르게 동작합니다.
- 급수당 국수/범위를 바꾸려면 `scripts/fetch-games.mjs` 상단의 상수를 수정하세요
  (`GAMES_PER_KYU`, `KYU_MIN`, `KYU_MAX`, `GAMES_PER_KYU`).

## 구조

- `scripts/fetch-games.mjs` — OGS 공개 API에서 기보 수집 (빌드 타임 실행, CORS 불필요)
- `public/kifu/` — 수집된 SGF 기보와 메타데이터(`index.json`)
- `src/lib/sgf.ts` — SGF 파서 (메인 라인만)
- `src/lib/board.ts` — 수순 재생(착수·포석·단순 패)
- `src/components/Board.tsx` — SVG 바둑판
- `src/components/Viewer.tsx` — 기보 뷰어(재생 컨트롤, 자동재생, 수 번호 표시)
- `src/components/KifuList.tsx` — 급수 탭 + 기보 목록

## 키보드 조작

- `←`/`→`: 이전/다음 수 · `Space`: 다음 수 · `Home`/`End`: 처음/마지막 · `p`: 자동재생 토글

## 이후 확장 후보

- 수순 맞히기(예측) 모드, 변화수 표시, 즐겨찾기/진도 저장, 13x13/9x9 지원