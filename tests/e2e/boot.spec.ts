import { test, expect, _electron as electron } from '@playwright/test';
import path from 'node:path';

test('app boots and shows bootstrap text', async () => {
  const app = await electron.launch({ args: ['.'], cwd: path.resolve(__dirname, '../..') });
  const win = await app.firstWindow();
  await expect(win.locator('text=FSN-JP')).toBeVisible({ timeout: 15000 });
  await app.close();
});
