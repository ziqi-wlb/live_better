import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const outDir = fileURLToPath(new URL('../miniprogram/assets/', import.meta.url));
mkdirSync(outDir, { recursive: true });

const html = `<!doctype html>
<html><head><meta charset="utf-8"><style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: 500px; height: 400px; }
  body {
    font-family: "PingFang SC", "Helvetica Neue", -apple-system, sans-serif;
    background: #214d3f;
    color: #f4f7f2;
    display: flex; flex-direction: column; justify-content: space-between;
    padding: 52px 48px;
  }
  .eyebrow { font-size: 15px; letter-spacing: 3px; color: #8fb3a2; font-weight: 600; }
  .title { font-size: 46px; font-weight: 800; line-height: 1.34; letter-spacing: 1px; }
  .title .dim { color: #cfe0d6; }
  .footer { display: flex; align-items: baseline; justify-content: space-between; }
  .brand { font-size: 18px; font-weight: 700; letter-spacing: 2px; }
  .stats { font-size: 15px; color: #8fb3a2; }
</style></head>
<body>
  <div class="eyebrow">A LITTLE BETTER, EVERY DAY</div>
  <div class="title">把有限的精力，<br>花在<span class="dim">值得</span>的地方。</div>
  <div class="footer">
    <div class="brand">人生指南</div>
    <div class="stats">34 章节 · 699 条建议</div>
  </div>
</body></html>`;

const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 500, height: 400 }, deviceScaleFactor: 2 });
  await page.setContent(html);
  await page.screenshot({ path: outDir + 'share-cover.png' });
  console.log('written', outDir + 'share-cover.png');
} finally {
  await browser.close();
}
