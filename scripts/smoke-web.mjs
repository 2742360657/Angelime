import assert from 'node:assert/strict';
import { existsSync, mkdirSync } from 'node:fs';
import { chromium } from 'playwright-core';

const candidates = [process.env.SMOKE_BROWSER, '/usr/bin/microsoft-edge-stable', '/usr/bin/google-chrome-stable', '/usr/bin/chromium'].filter(Boolean);
const browserPath = candidates.find(existsSync);
if (!browserPath) throw new Error('未找到 Chromium 系浏览器，请设置 SMOKE_BROWSER。');
const baseUrl = process.env.SMOKE_BASE_URL ?? 'http://localhost:8081';
mkdirSync('artifacts', { recursive: true });
const browser = await chromium.launch({ executablePath: browserPath, headless: true });
const context = await browser.newContext({ viewport: { width: 500, height: 900 }, hasTouch: true, isMobile: true });
const page = await context.newPage();
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
page.on('console', (message) => message.type() === 'error' && errors.push(message.text()));
const client = await context.newCDPSession(page);
async function openDrawer() {
  await page.reload({ waitUntil: 'networkidle' });
  await page.getByLabel('新建待办').waitFor();
  await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 70, y: 100 }] });
  for (let x = 90; x <= 280; x += 25) { await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: 100 }] }); await page.waitForTimeout(20); }
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await page.getByLabel('关闭侧边栏').waitFor();
}
try {
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await page.getByLabel('新建待办').waitFor();
  assert.equal(await page.getByLabel('关闭侧边栏').count(), 0);

  await page.getByLabel('新建待办').click();
  await page.getByPlaceholder('待办名称').fill('冒烟待办');
  await page.getByText('保存', { exact: true }).click();
  await page.getByText('冒烟待办', { exact: true }).waitFor();
  await page.getByLabel('完成待办：冒烟待办').click();
  await page.getByText('待办已完成', { exact: true }).waitFor();
  await page.getByText('撤销', { exact: true }).click();

  await openDrawer();
  await page.getByLabel('习惯', { exact: true }).click();
  await page.getByLabel('新建习惯').click();
  await page.getByPlaceholder('习惯名称').fill('冒烟习惯');
  await page.getByText('保存', { exact: true }).click();
  await page.getByText('冒烟习惯', { exact: true }).waitFor();
  await page.getByText('+1', { exact: true }).click();
  await page.getByText('已记录一次打卡', { exact: true }).waitFor();

  await openDrawer();
  await page.getByLabel('设置', { exact: true }).click();
  await page.getByText('个人资料', { exact: true }).click();
  await page.getByPlaceholder('用户名').fill('冒烟用户');
  await page.getByText('保存', { exact: true }).click();
  await page.getByText('冒烟用户', { exact: true }).first().waitFor();
  assert.deepEqual(errors, []);
  await page.screenshot({ path: 'artifacts/smoke-current.png', fullPage: true });
  process.stdout.write('Smoke test passed: navigation, todo undo, habit check-in, and profile editing.\n');
} finally { await browser.close(); }
