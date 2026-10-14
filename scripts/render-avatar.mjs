import { chromium } from '@playwright/test';
import { readFileSync } from 'node:fs';

const browser = await chromium.launch({ channel: 'chrome' });
try {
  const page = await browser.newPage({ viewport: { width: 512, height: 512 }, deviceScaleFactor: 1 });
  const svg = readFileSync(new URL('../assets/brand/avatar.svg', import.meta.url), 'utf8');
  await page.setContent(`<html><body style="margin:0">${svg}</body></html>`);
  await page.screenshot({ path: 'assets/brand/avatar.png', omitBackground: false });
} finally {
  await browser.close();
}
