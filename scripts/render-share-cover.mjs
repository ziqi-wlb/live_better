import { chromium } from '@playwright/test';
import { mkdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// 条数和章节数直接从数据读，别再写死。
// 之前这里印着「34 章节 · 699 条建议」，数据涨到 765 后没人记得重跑脚本，
// 分享出去还是 699——数字必须单一来源。
// 注意：根 package.json 是 type: module，guides.js 是 CJS 写法，
// 直接 require/import 都会被当成 ESM 而报错，所以手动执行包一层。
const guidesFile = fileURLToPath(new URL('../miniprogram/data/guides.js', import.meta.url));
const mod = { exports: {} };
new Function('module', 'exports', readFileSync(guidesFile, 'utf8'))(mod, mod.exports);
const { guides, chapters } = mod.exports;

const APP_NAME = '高性价比人生笔记';
const STATS = `${chapters.length} 章节 · ${guides.length} 条建议`;

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
  .brand { font-size: 16px; font-weight: 700; letter-spacing: 1px; }
  .stats { font-size: 15px; color: #8fb3a2; }
</style></head>
<body>
  <div class="eyebrow">A LITTLE BETTER, EVERY DAY</div>
  <div class="title">把有限的精力，<br>花在<span class="dim">值得</span>的地方。</div>
  <div class="footer">
    <div class="brand">${APP_NAME}</div>
    <div class="stats">${STATS}</div>
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
