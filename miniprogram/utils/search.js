/**
 * 离线模糊搜索：不依赖后端、不依赖分词库。
 * 策略：多关键词「且」匹配 + 同义词扩展 + 2-gram 相似度兜底 + 相关度打分 + 命中高亮。
 */

const { alternatives, expandTerms } = require('./synonyms');

const PUNCT = /[\s,，、;；/。.！!？?：:（）()「」【】]/g;

// 关键词切分：空格 / 逗号 / 顿号 / 分号 / 斜杠，多词之间为「且」
function tokenize(kw) {
  return (kw || '')
    .toLowerCase()
    .split(/[\s,，、;；/]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

// 2-gram 集合，用于衡量两个字符串的相似度
function bigrams(s) {
  const t = (s || '').replace(PUNCT, '');
  const set = new Set();
  if (!t) return set;
  if (t.length === 1) {
    set.add(t);
    return set;
  }
  for (let i = 0; i < t.length - 1; i += 1) {
    set.add(t.slice(i, i + 2));
  }
  return set;
}

// 模糊相似度：term 的 2-gram 有多少落在 text 里（0~1）
function fuzzyCover(term, text) {
  const tb = bigrams(term);
  if (!tb.size) return 0;
  const hb = bigrams(text);
  let hit = 0;
  tb.forEach((b) => {
    if (hb.has(b)) hit += 1;
  });
  return hit / tb.size;
}

const FUZZY_THRESHOLD = 0.6;
// 同义词命中权重：低于原词，保证「原词命中」排在「同义词命中」前面
const SYN_WEIGHT = 0.6;

function fieldWeight(alt, title, summary, chapter, extra) {
  if (title.indexOf(alt) >= 0) return title === alt ? 20 : 12;
  if (summary.indexOf(alt) >= 0) return 5;
  if (chapter.indexOf(alt) >= 0) return 4;
  if (extra.indexOf(alt) >= 0) return 3;
  return 0;
}

/**
 * 单条打分：标题 > 摘要 > 章节 > 人群/口径；
 * 每个查询词先试自身，再试同义词（降权），最后试 2-gram 模糊；
 * 都不中时退到「单字命中」——记为 weak，只在放宽阶段计入。
 */
function matchGuide(g, terms, chapterMap) {
  const title = (g.title || '').toLowerCase();
  const summary = (g.summary || '').toLowerCase();
  const chapter = ((chapterMap && chapterMap[g.ch]) || '').toLowerCase();
  const extra = `${(g.aud || []).join(' ')} ${g.out || ''} ${g.band || ''}`.toLowerCase();
  const hay = `${title} ${summary} ${chapter} ${extra}`;

  let score = 0;
  let strict = 0;
  let fuzzy = 0;

  terms.forEach((term) => {
    const alts = alternatives(term);
    let best = 0;
    let bestFuzzy = false;

    for (let i = 0; i < alts.length; i += 1) {
      const w = fieldWeight(alts[i], title, summary, chapter, extra);
      if (!w) continue;
      // i === 0 为原词；同义词降权，且越靠后的同义词亲缘越远，权重再递减
      const decay = i === 0 ? 1 : SYN_WEIGHT * Math.max(0.35, 1 - (i - 1) * 0.06);
      const s = w * decay;
      if (s > best) {
        best = s;
        bestFuzzy = false;
      }
    }

    if (!best && fuzzyCover(term, hay) >= FUZZY_THRESHOLD) {
      best = 1;
      bestFuzzy = true;
    }

    if (best) {
      score += best;
      if (bestFuzzy) fuzzy += 1;
      else strict += 1;
    }
    // 到此仍未命中即放弃该词：中文单字回退命中面太广（如「存不下钱」会命中数百条
    // 无关条目），宁可返回空结果并提示换个说法，也不展示噪音。
  });

  const hit = strict + fuzzy;
  return {
    all: hit === terms.length, // 每个词都有命中（原词/同义/模糊）
    strict: strict === terms.length, // 每个词都精确命中原词或同义词
    any: hit > 0,
    score
  };
}

// 摘出命中位置附近的片段，避免关键词被长摘要埋掉
function snippet(text, terms, len) {
  const size = len || 72;
  if (!text) return '';
  if (text.length <= size) return text;
  const lower = text.toLowerCase();
  let pos = -1;
  for (let i = 0; i < terms.length; i += 1) {
    const idx = lower.indexOf(terms[i]);
    if (idx >= 0) {
      pos = idx;
      break;
    }
  }
  if (pos < 0) return `${text.slice(0, size)}…`;
  const start = Math.max(0, pos - Math.floor(size / 3));
  const end = Math.min(text.length, start + size);
  return `${start > 0 ? '…' : ''}${text.slice(start, end)}${end < text.length ? '…' : ''}`;
}

// 生成高亮分段：[{ t: 文本, h: 是否命中 }]
function highlight(text, terms) {
  if (!text) return [];
  if (!terms.length) return [{ t: text, h: false }];
  const lower = text.toLowerCase();
  const marks = new Array(text.length).fill(false);
  terms.forEach((term) => {
    let from = 0;
    for (;;) {
      const idx = lower.indexOf(term, from);
      if (idx < 0) break;
      for (let i = idx; i < idx + term.length; i += 1) marks[i] = true;
      from = idx + term.length;
    }
  });
  const segs = [];
  let buf = '';
  let cur = marks[0];
  for (let i = 0; i < text.length; i += 1) {
    if (marks[i] === cur) {
      buf += text[i];
    } else {
      if (buf) segs.push({ t: buf, h: cur });
      buf = text[i];
      cur = marks[i];
    }
  }
  if (buf) segs.push({ t: buf, h: cur });
  return segs;
}

module.exports = {
  tokenize,
  bigrams,
  fuzzyCover,
  matchGuide,
  snippet,
  highlight,
  expandTerms,
  FUZZY_THRESHOLD,
  SYN_WEIGHT
};
