/* 브라우저 뒤로가기 버튼 동작 확인 */
const { chromium } = require("playwright-core");

(async () => {
  const browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--no-sandbox"] });
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
  await page.goto("http://localhost:5199/", { waitUntil: "networkidle" });
  await page.waitForSelector(".tab.active");

  // 1) 기보 열기
  await page.click(".game-row");
  await page.waitForSelector(".viewer-top");
  const hashInViewer = page.url();
  console.log("viewing:", hashInViewer);

  // 2) 브라우저 뒤로가기
  await page.goBack();
  await page.waitForTimeout(300);
  const backTo = await page.evaluate(() => location.hash);
  const listVisible = await page.waitForSelector(".tab.active", { timeout: 3000 }).then(() => true).catch(() => false);
  console.log("after back — hash:", JSON.stringify(backTo), "| list visible:", listVisible);

  // 3) "← 목록으로" 버튼도 여전히 동작
  await page.click(".game-row");
  await page.waitForSelector(".viewer-top");
  await page.click(".btn.back");
  await page.waitForTimeout(300);
  const btnWorks = await page.waitForSelector(".tab.active", { timeout: 3000 }).then(() => true).catch(() => false);
  console.log("after 목록으로 button — list visible:", btnWorks);

  await browser.close();
})();
