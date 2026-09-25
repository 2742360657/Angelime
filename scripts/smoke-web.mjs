import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright-core';

// 依次尝试本机常见的 Chromium 系浏览器，可用 SMOKE_BROWSER 显式指定可执行文件路径。
const BROWSER_CANDIDATES = [
  process.env.SMOKE_BROWSER,
  '/usr/bin/microsoft-edge-stable',
  '/opt/microsoft/msedge/msedge',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].filter(Boolean);

const browserPath = BROWSER_CANDIDATES.find((candidate) => existsSync(candidate));
if (!browserPath) {
  throw new Error(
    `未找到可用的 Chromium 系浏览器，请设置 SMOKE_BROWSER 指向浏览器可执行文件。已尝试：\n${BROWSER_CANDIDATES.join('\n')}`,
  );
}

const baseUrl = process.env.SMOKE_BASE_URL ?? 'http://localhost:8081';

await mkdir('artifacts', { recursive: true });

const browser = await chromium.launch({ executablePath: browserPath, headless: true });
const context = await browser.newContext({ viewport: { width: 500, height: 900 }, hasTouch: true, isMobile: true });
const page = await context.newPage();
page.on('dialog', async (dialog) => dialog.dismiss());

try {
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await page.getByText('今天', { exact: true }).first().waitFor();
  assert.equal(await page.getByText('待办', { exact: true }).count() > 0, true);
  assert.equal(await page.getByText('习惯', { exact: true }).count() > 0, true);
  assert.equal(await page.getByText('设置', { exact: true }).count() > 0, true);

  await page.getByText('＋ 待办', { exact: true }).click();
  await page.getByPlaceholder('待办名称').fill('界面冒烟测试待办');
  await page.getByText('自定义', { exact: true }).click();
  await page.getByPlaceholder('日期').fill('6.9');
  await page.getByPlaceholder('时间').fill('下午3点');
  await page.getByText('保存', { exact: true }).click();
  await page.getByPlaceholder('待办名称').waitFor({ state: 'hidden' });
  await page.getByText('界面冒烟测试待办', { exact: true }).first().waitFor();

  await page.getByLabel('完成待办：界面冒烟测试待办').first().click();
  await page.getByText('待办已完成', { exact: true }).waitFor();
  await page.getByText('撤销', { exact: true }).click();
  await page.getByText('界面冒烟测试待办', { exact: true }).first().waitFor();

  await page.getByText('＋ 待办', { exact: true }).click();
  await page.getByPlaceholder('待办名称').fill('第二个无日期待办');
  await page.getByText('保存', { exact: true }).click();
  await page.getByPlaceholder('待办名称').waitFor({ state: 'hidden' });

  await page.getByText('＋ 待办', { exact: true }).click();
  await page.getByPlaceholder('待办名称').fill('第三个无日期待办');
  await page.getByText('保存', { exact: true }).click();
  await page.getByPlaceholder('待办名称').waitFor({ state: 'hidden' });

  await page.getByText('习惯', { exact: true }).last().click();
  await page.getByText('＋ 习惯', { exact: true }).click();
  await page.getByPlaceholder('习惯名称').fill('每周运动');
  await page.getByText('每周', { exact: true }).click();
  await page.locator('input').nth(1).fill('3');
  await page.getByText('保存', { exact: true }).click();
  await page.getByText('目标周期', { exact: true }).waitFor({ state: 'hidden' });
  await page.getByText('每周运动', { exact: true }).nth(1).waitFor();
  await page.screenshot({ path: 'artifacts/smoke-habits.png', fullPage: true });

  await page.getByText('待办', { exact: true }).last().click();
  const client = await context.newCDPSession(page);
  const thirdTodoBox = await page.getByText('第三个无日期待办', { exact: true }).last().boundingBox();
  assert.ok(thirdTodoBox, 'Third todo should be visible');
  const longPressX = thirdTodoBox.x + thirdTodoBox.width / 2;
  const longPressY = thirdTodoBox.y + thirdTodoBox.height / 2;
  await client.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x: longPressX, y: longPressY, radiusX: 4, radiusY: 4, force: 1 }],
  });
  await page.waitForTimeout(450);
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await page.getByText('调整顺序', { exact: true }).waitFor();
  await page.waitForTimeout(300);

  const thirdHandle = page.getByLabel('拖动 第三个无日期待办');
  const thirdBox = await thirdHandle.boundingBox();
  assert.ok(thirdBox, 'Third reorder handle should be visible');
  const touchX = thirdBox.x + thirdBox.width / 2;
  const touchY = thirdBox.y + thirdBox.height / 2;
  await client.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x: touchX, y: touchY, radiusX: 4, radiusY: 4, force: 1 }],
  });
  await client.send('Input.dispatchTouchEvent', {
    type: 'touchMove',
    touchPoints: [{ x: touchX, y: touchY - 74, radiusX: 4, radiusY: 4, force: 1 }],
  });
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await page.waitForTimeout(400);
  const secondBoxAfter = await page.getByLabel('拖动 第二个无日期待办').boundingBox();
  const thirdBoxAfter = await page.getByLabel('拖动 第三个无日期待办').boundingBox();
  await page.screenshot({ path: 'artifacts/smoke-reorder.png', fullPage: true });
  assert.ok(secondBoxAfter && thirdBoxAfter && thirdBoxAfter.y < secondBoxAfter.y, 'Dragged item should move above the first item');
  await page.getByText('保存', { exact: true }).click();
  await page.getByText('调整顺序', { exact: true }).waitFor({ state: 'hidden' });
  await page.screenshot({ path: 'artifacts/smoke-tasks.png', fullPage: true });

  await page.getByText('设置', { exact: true }).last().click();
  await page.getByText('个人资料', { exact: true }).click();
  await page.getByPlaceholder('用户名').fill('测试用户');
  await page.getByPlaceholder('个性签名').fill('今天也向前一点。');
  await page.getByText('保存', { exact: true }).click();
  await page.getByPlaceholder('个性签名').waitFor({ state: 'hidden' });
  await page.getByText('测试用户', { exact: true }).first().waitFor();
  await page.getByText('今天也向前一点。', { exact: true }).first().waitFor();
  await page.screenshot({ path: 'artifacts/smoke-settings.png', fullPage: true });

  process.stdout.write('Smoke test passed: flexible date/time, todo undo, habit cadence, long-press reorder, drag, and profile editing.\n');
} finally {
  await browser.close();
}
