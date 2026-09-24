/* 실시간 검색 기능 브라우저 테스트 */
const { chromium } = require("playwright-core");
const path = require("node:path");

(async () => {
  const browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--no-sandbox"] });
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text()); });

  await page.goto("http://localhost:5173/", { waitUntil: "networkidle" });
  await page.click('button.mode-tab:has-text("실시간 검색")');
  await page.click('button:has-text("기보 검색")');
  console.log("검색 시작 — 최대 90초 대기...");
  // 결과 리스트가 나타나거나 90초 경과까지 대기
  await page.waitForSelector(".game-list li", { timeout: 90000 });
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.resolve("screenshots", "6-live-search.png") });
  const rows = await page.locator(".game-row").count();
  console.log("live search results:", rows);
  const progress = await page.textContent(".live-progress");
  console.log("progress:", progress?.trim());
  // 결과 첫 국 열어보기
  if (rows > 0) {
    await page.click(".game-row");
    await page.waitForSelector(".board-svg", { timeout: 30000 });
    for (let i = 0; i < 15; i++) await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.resolve("screenshots", "7-live-viewer.png") });
    console.log("move count:", (await page.textContent(".move-count"))?.trim());
  }
  console.log("console/page errors:", errors.length ? errors : "없음");
  await browser.close();
})().catch((e) => {
  console.error("SMOKE FAIL:", e.message);
  process.exit(1);
});