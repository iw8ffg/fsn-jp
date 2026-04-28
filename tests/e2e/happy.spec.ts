import { test, expect, _electron as electron } from '@playwright/test';
import path from 'node:path';

const fixtureRoot = path.resolve(__dirname, 'fixtures/sample-tree').replace(/\\/g, '/');

test('boot, see scene, search finds a.txt', async () => {
  const app = await electron.launch({
    args: ['.', `--root=${fixtureRoot}`],
    cwd: path.resolve(__dirname, '../..'),
  });
  const win = await app.firstWindow();

  await expect(win.locator('text=FSN-JP').first()).toBeVisible({ timeout: 30000 });

  // canvas exists
  await expect(win.locator('canvas')).toBeVisible();

  // Toolbar (with SearchBar) only mounts after the boot root is activated;
  // wait for the search input itself before driving the keyboard shortcut.
  await expect(win.locator('input[placeholder*="Search"]')).toBeVisible({ timeout: 15000 });

  await win.keyboard.press('Control+f');
  await win.keyboard.type('a.txt');
  await expect(win.locator('text=a.txt').first()).toBeVisible({ timeout: 30000 });

  await app.close();
});
