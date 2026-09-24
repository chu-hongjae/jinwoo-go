/* 화면 전환 페이드 동작 확인 */
const { chromium } = require("playwright-core");
const path = require("node:path");

(async () => {
  const browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--no-sandbox"] });
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const ok = (name, cond) => console.log(`${cond ? "PASS" : "FAIL"} — ${name}`);

  await page.goto("http://localhost:5199/", { waitUntil: "networkidle" });
  await page.waitForSelector(".tab.active");

  // 헤더 제거 확인
  ok("헤더 제거", (await page.locator(".header").count()) === 0);
  ok("푸터 유지", (await page.locator(".footer").count()) === 1);

  // 페이드: 전환 구간(약 0.3s out + 0.42s in) 동안 opacity 샘플링
  await page.click(".game-row");
  let minOpacity = 1;
  for (let i = 0; i < 12; i++) {
    const o = await page.evaluate(() => {
      const el = document.querySelector(".view-fade");
      return el ? parseFloat(getComputedStyle(el).opacity) : 1;
    });
    minOpacity = Math.min(minOpacity, o);
    await page.waitForTimeout(60);
  }
  ok(`페이드 전환 중 (최소 opacity ${minOpacity})`, minOpacity < 1);

  await page.waitForSelector(".viewer-top");
  await page.waitForTimeout(600); // in 애니메이션(0.42s) 완료 대기
  const settledOpacity = await page.evaluate(() => getComputedStyle(document.querySelector(".view-fade")).opacity);
  ok("페이드 완료 (opacity = 1)", settledOpacity === "1");

  // 자동재생: 진입 후 몇 초면 수순이 흘러야 한다
  await page.waitForTimeout(3600);
  const moveText = await page.locator(".move-count").textContent();
  const moved = /수 [1-9]\d*\s*\//.test(moveText ?? "");
  ok(`자동재생 (수 ${moveText?.trim()})`, moved);

  await page.screenshot({ path: path.resolve("screenshots", "fade-viewer.png") });

  // 모바일 스와이프 — 정지 후 좌스와이프 = 다음 수
  await page.click('button.btn:has-text("정지")').catch(() => {});
  await page.waitForTimeout(200);
  const moveBefore = await page.locator(".move-count").textContent();
  await page.evaluate(() => {
    const el = document.querySelector(".board-svg");
    const mk = (type, x) =>
      new TouchEvent(type, {
        bubbles: true,
        cancelable: true,
        touches: type === "touchend" ? [] : [new Touch({ identifier: 1, target: el, clientX: x, clientY: 300 })],
        changedTouches: [new Touch({ identifier: 1, target: el, clientX: x, clientY: 300 })],
      });
    el.dispatchEvent(mk("touchstart", 300));
    el.dispatchEvent(mk("touchend", 200));
  });
  await page.waitForTimeout(200);
  const moveAfter = await page.locator(".move-count").textContent();
  const beforeN = Number(/수 (\d+) \//.exec(moveBefore ?? "")?.[1] ?? 0);
  const afterN = Number(/수 (\d+) \//.exec(moveAfter ?? "")?.[1] ?? 0);
  ok(`스와이프 → 다음 수 (${moveBefore?.trim()} → ${moveAfter?.trim()})`, afterN === beforeN + 1);

  // 뒤로가기 → 목록 페이드
  await page.goBack();
  await page.waitForTimeout(700);
  ok("목록 복귀", (await page.locator(".tab.active").count()) === 1);
  ok("컨솔 에러 없음", errors.length === 0);
  if (errors.length) console.log("errors:", errors);

  await browser.close();
})();
