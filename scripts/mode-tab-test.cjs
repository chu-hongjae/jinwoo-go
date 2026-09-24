/* 상세 화면에서 상단 모드 탭 클릭 시 목록 이동 확인 */
const { chromium } = require("playwright-core");

(async () => {
  const browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--no-sandbox"] });
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
  const ok = (name, cond) => console.log(`${cond ? "PASS" : "FAIL"} — ${name}`);

  await page.goto("http://localhost:5199/", { waitUntil: "networkidle" });
  await page.waitForSelector(".tab.active");

  // 1) 기보 열기 → 상세 화면
  await page.click(".game-row");
  await page.waitForSelector(".viewer-top");
  ok("상세 화면 진입", (await page.locator(".viewer-top").count()) === 1);

  // 2) 상세 화면에서 '프로 기보' 탭 클릭
  await page.click('button.mode-tab:has-text("프로 기보")');
  await page.waitForTimeout(400);
  const viewerGone = (await page.locator(".viewer-top").count()) === 0;
  const proTabActive = await page
    .locator('button.mode-tab:has-text("프로 기보")')
    .evaluate((el) => el.classList.contains("active"));
  ok("상세→프로 탭 클릭: 뷰어 종료", viewerGone);
  ok("상세→프로 탭 클릭: 프로 탭 활성", proTabActive);
  ok("상세→프로 탭 클릭: hash 정리", (await page.evaluate(() => location.hash)) === "");

  // 3) '급수 기보' 탭 클릭 → 급수 목록
  await page.click('button.mode-tab:has-text("급수 기보")');
  await page.waitForTimeout(400);
  const kyuListBack = (await page.locator(".tab").count()) > 0;
  ok("프로→급수 탭 클릭: 급수 탭 표시", kyuListBack);

  // 4) 상세 화면에서 다시 열렸을 때 '실시간 검색' 탭
  await page.click(".game-row");
  await page.waitForSelector(".viewer-top");
  await page.click('button.mode-tab:has-text("실시간 검색")');
  await page.waitForTimeout(400);
  ok("상세→실시간 탭 클릭: 뷰어 종료", (await page.locator(".viewer-top").count()) === 0);
  ok("상세→실시간 탭 클릭: 검색 UI 표시", (await page.locator(".live-search").count()) === 1);

  await browser.close();
})();
