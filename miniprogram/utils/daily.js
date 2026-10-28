const { chapters, guides } = require('../data/guides');

const chapterMap = {};
chapters.forEach((c) => {
  chapterMap[c.id] = c.title;
});

function decorate(g) {
  const summary = g.summary.length > 90 ? `${g.summary.slice(0, 90)}…` : g.summary;
  return {
    id: g.id,
    // ch 必须带出去：详情页按章节分在两个分包里，
    // 没有 ch 就会算错分包，导致「未找到该建议」
    ch: g.ch,
    title: g.title,
    summary,
    ev: g.ev,
    roi: g.roi,
    chapterTitle: chapterMap[g.ch] || ''
  };
}

// 优先从 A 级证据条目中挑（传播素材要有可信度），数量不足时回退全量
function poolList() {
  const pool = guides.filter((g) => g.ev === 'A');
  return pool.length >= 30 ? pool : guides;
}

// 每日一条：按本地日期确定性挑选，同一天结果稳定、跨天自然轮换
function pickDaily() {
  const list = poolList();
  const d = new Date();
  const n = d.getFullYear() * 372 + (d.getMonth() + 1) * 31 + d.getDate();
  return decorate(list[n % list.length]);
}

// 换一条：随机挑一条（尽量避开当前这条）
function pickRandom(excludeId) {
  const list = poolList();
  let g = list[Math.floor(Math.random() * list.length)];
  let guard = 0;
  while (g.id === excludeId && guard < 10) {
    g = list[Math.floor(Math.random() * list.length)];
    guard += 1;
  }
  return decorate(g);
}

function todayLabel() {
  const d = new Date();
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

module.exports = { pickDaily, pickRandom, todayLabel };
