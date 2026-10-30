import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

// 详情内容按章节切成两个分包（packageDetail / packageDetail2），但页面是同一套。
// 页面文件此前只靠手工 cp 同步，改一份忘了另一份没有任何机制能发现——
// 这两个测试就是把「改了没同步」变成一次红灯。
const ROOT = 'miniprogram';
const PAGE_FILES = ['detail.js','detail.wxml','detail.wxss','detail.json'];

test('两个分包的页面文件逐字节一致', () => {
  for (const f of PAGE_FILES) {
    const a = readFileSync(`${ROOT}/packageDetail/pages/detail/${f}`, 'utf8');
    const b = readFileSync(`${ROOT}/packageDetail2/pages/detail/${f}`, 'utf8');
    assert.equal(a, b, `${f} 在两包之间不一致——改动需要同步到两个分包`);
  }
});

test('两个分包的数据来自同一次导入', () => {
  // 只取文件开头几 KB，不用读完 1MB 多的正文
  const head = (p: string) => readFileSync(p, 'utf8').slice(0, 4096);
  const commit = (p: string) => {
    const m = head(p).match(/sourceCommit\s*:\s*["']([0-9a-f]{7,40})["']/);
    return m ? m[1] : '';
  };
  const a = commit(`${ROOT}/packageDetail/data/details.js`);
  const b = commit(`${ROOT}/packageDetail2/data/details.js`);
  assert.ok(a && b, '两份 details.js 里都应能读到 sourceCommit');
  assert.equal(a, b, '两个分包的数据不是同一次导入生成的，需要重新跑 gen_data.py');
});

test('两包引用的通用模块都存在', () => {
  // 分包路径比主包深一层，相对路径容易写错，而缺少文件只在运行时才炸
  for (const pkg of ['packageDetail','packageDetail2']) {
    const src = readFileSync(`${ROOT}/${pkg}/pages/detail/detail.js`, 'utf8');
    const reqs = [...src.matchAll(/require\(['"](\.[^'"]+)['"]\)/g)].map((m) => m[1]);
    assert.ok(reqs.length > 0, `${pkg} 的 detail.js 里应能读到 require`);
  }
  for (const f of ['utils/nav.js','utils/store.js','utils/detail-path.js','data/guides.js']) {
    assert.doesNotThrow(() => readFileSync(`${ROOT}/${f}`, 'utf8'), `缺少通用模块 ${f}`);
  }
});
