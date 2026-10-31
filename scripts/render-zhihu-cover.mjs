import { chromium } from '@playwright/test';
import { mkdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// 知乎专栏文章的封面图，主义和 miniprogram/assets/share-cover.png 一套色板，
// 但画布是 16:9：知乎封面按横图显示，5:4 的分享图会被裁掉上下，正好切掉底部的统计行。
//
// 条数和章节数从数据读，别写死——分享图那次就是因为印着「34 章节 · 699 条建议」
// 没人记得重跑，数字错了好几个月。
// 注意：根 package.json 是 type: module，guides.js 是 CJS 写法，
// 直接 require/import 都会被当成 ESM 而报错，所以手动执行包一层。
const guidesFile = fileURLToPath(new URL('../miniprogram/data/guides.js', import.meta.url));
const mod = { exports: {} };
new Function('module', 'exports', readFileSync(guidesFile, 'utf8'))(mod, mod.exports);
const { guides, chapters } = mod.exports;

const APP_NAME = '高性价比人生笔记';
const STATS = `${chapters.length} 章节 · ${guides.length} 条建议`;

const outDir = fileURLToPath(new URL('../docs/', import.meta.url));
mkdirSync(outDir, { recursive: true });

const html = `<!doctype html>
<html><head><meta charset="utf-8"><style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: 960px; height: 540px; }
  body {
    font-family: "PingFang SC", "Helvetica Neue", -apple-system, sans-serif;
    background: #214d3f; color: #f4f7f2;
    display: flex; flex-direction: column; justify-content: space-between;
    padding: 84px 90px;
  }
  .eyebrow { font-size: 21px; letter-spacing: 5px; color: #8fb3a2; font-weight: 600; }
  .title { font-size: 82px; font-weight: 800; line-height: 1.3; letter-spacing: 2px; }
  .title .dim { color: #cfe0d6; }
  .foot2 { display: flex; flex-direction: column; gap: 24px; }
  .foot2 .sub { font-size: 24px; color: #9dbfae; letter-spacing: 2px; }
  .row { display: flex; align-items: baseline; justify-content: space-between; }
  .brand { font-size: 26px; font-weight: 700; letter-spacing: 2px; }
  .stats { font-size: 23px; color: #8fb3a2; }
</style></head>
<body>
  <div class="eyebrow">${guides.length} 条建议 · 每条都标了出处和性价比</div>
  <div class="title">把有限的精力，<br>花在<span class="dim">值得</span>的地方。</div>
  <div class="foot2">
    <div class="sub">花掉什么 · 换回什么 · 证据有多硬</div>
    <div class="row">
      <div class="brand">${APP_NAME}</div>
      <div class="stats">${STATS}</div>
    </div>
  </div>
</body></html>`;

const browser = await chromium.launch();
try {
  // deviceScaleFactor 2：输出 1920×1080，够知乎封面用
  const page = await browser.newPage({ viewport: { width: 960, height: 540 }, deviceScaleFactor: 2 });
  await page.setContent(html);
  const out = outDir + 'zhihu-cover.png';
  await page.screenshot({ path: out });
  console.log('written', out, '(' + STATS + ')');
} finally {
  await browser.close();
}
