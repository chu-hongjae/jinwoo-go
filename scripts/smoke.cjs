/* 앱 스모크 테스트: 목록 → 기보 열기 → 수순 진행 → 스크린샷 */
const { chromium } = require("playwright-core");
const path = require("node:path");

(async () => {
  const browser = await chromium.launch({
    channel: "chrome",
    headless: true,
    args: ["--no-sandbox"],
  });
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push("console: " + m.text());
  });

  const out = (f) => path.resolve("screenshots", f);

  // 1) 목록
  await page.goto("http://localhost:5173/", { waitUntil: "networkidle" });
  await page.waitForSelector(".tab.active");
  await page.screenshot({ path: out("1-list.png") });
  console.log("list OK: title =", await page.title());

  // 2) 1급 탭
  await page.click('button.tab:has-text("1급")');
  await page.waitForTimeout(200);
  await page.screenshot({ path: out("2-tab-1k.png") });

  // 3) 프로 기보 모드 → 이세돌 탭 → 기보 열기
  await page.click('button.mode-tab:has-text("프로 기보")');
  await page.waitForSelector('button.tab:has-text("이세돌")');
  await page.click('button.tab:has-text("이세돌")');
  await page.waitForTimeout(200);
  await page.screenshot({ path: out("2b-pro-list.png") });
  await page.click(".game-row");
  await page.waitForSelector(".board-svg");
  await page.waitForTimeout(300);
  await page.screenshot({ path: out("3b-pro-viewer.png") });
  await page.click('button.btn.back');

  // 4) 급수 기보 첫 기보 열기
  await page.click('button.mode-tab:has-text("급수 기보")');
  await page.click(".game-row");
  await page.waitForSelector(".board-svg");
  await page.waitForTimeout(300);
  await page.screenshot({ path: out("3-viewer-initial.png") });

  // 4) 다음 수 여러 번 진행
  for (let i = 0; i < 30; i++) await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(200);
  await page.screenshot({ path: out("4-viewer-move30.png") });

  // 5) 수 번호 토글 + 마지막 수로
  await page.click('label.opt:has-text("수 번호") input[type="checkbox"]');
  await page.click('button[title="마지막 (End)"]');
  await page.waitForTimeout(300);
  await page.screenshot({ path: out("5-viewer-final.png") });

  const moveCount = await page.textContent(".move-count");
  console.log("move count:", moveCount?.trim());

  console.log("console/page errors:", errors.length ? errors : "없음");
  await browser.close();
})().catch((e) => {
  console.error("SMOKE FAIL:", e);
  process.exit(1);
});