const { chapters, guides } = require('../data/guides');

const chapterMap = {};
chapters.forEach((c) => {
  chapterMap[c.id] = c.title;
});

// 每日一条：按本地日期确定性挑选，同一天结果稳定、跨天自然轮换
// 优先从 A 级证据条目中挑（传播素材要有可信度），数量不足时回退全量
function pickDaily() {
  const pool = guides.filter((g) => g.ev === 'A');
  const list = pool.length >= 30 ? pool : guides;
  const d = new Date();
  const n = d.getFullYear() * 372 + (d.getMonth() + 1) * 31 + d.getDate();
  const g = list[n % list.length];
  const summary = g.summary.length > 90 ? `${g.summary.slice(0, 90)}…` : g.summary;
  return {
    id: g.id,
    title: g.title,
    summary,
    ev: g.ev,
    roi: g.roi,
    chapterTitle: chapterMap[g.ch] || ''
  };
}

function todayLabel() {
  const d = new Date();
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

module.exports = { pickDaily, todayLabel };
