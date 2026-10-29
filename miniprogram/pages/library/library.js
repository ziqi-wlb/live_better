const { chapters, guides, outcomes, audiences } = require('../../data/guides');
const store = require('../../utils/store');
const { detailUrl } = require('../../utils/detail-path');

const PAGE_SIZE = 50;

const chapterMap = {};
chapters.forEach((c) => {
  chapterMap[c.id] = c.title;
});

// 清单里只有 id，跳转详情需要知道它属于哪个章节（决定加载哪个分包）
const chapterOf = new Map(guides.map((g) => [g.id, g.ch]));

// 搜索历史：只存关键词本身，留在本机，用于下次少打字
const HISTORY_KEY = 'searchHistory';
const HISTORY_MAX = 6; // 最多留几条（也就是「最近在搜」显示几条）
const HISTORY_LEN = 30; // 单条最长几个字

// 读出来的东西一律当脏数据处理：storage 可能被别的版本、别的逻辑或用户
// 手动改过，里面可能有非字符串、空串、超长串、重复项，也可能超过 6 条
// （比如从旧版本升级上来）。统一在这里洗干净，保证下游拿到的永远是
// 「非空、去重、不超长、不超量」的字符串数组。
function cleanHistory(raw) {
  if (!Array.isArray(raw)) return [];
  const out = [];
  for (let i = 0; i < raw.length; i++) {
    if (typeof raw[i] !== 'string') continue;
    const t = raw[i].trim().slice(0, HISTORY_LEN);
    if (!t || out.indexOf(t) >= 0) continue;
    out.push(t);
  }
  return out.slice(0, HISTORY_MAX);
}

function getSearchHistory() {
  try {
    return cleanHistory(wx.getStorageSync(HISTORY_KEY));
  } catch (e) {
    return [];
  }
}

function addSearchHistory(kw) {
  // 输入框本身没有长度限制，不截断的话一条长文本就能占掉几十 KB
  const t = String(kw || '').trim().slice(0, HISTORY_LEN);
  if (!t) return getSearchHistory();
  // 已经搜过的提到最前，不留重复
  let list = getSearchHistory().filter((x) => x !== t);
  list.unshift(t);
  list = list.slice(0, HISTORY_MAX);
  try {
    wx.setStorageSync(HISTORY_KEY, list);
  } catch (e) {
    // 存不下（配额满等）就算了，不影响搜索本身
  }
  return list;
}

// 通读模式：全书按章组织，完全不受筛选影响（每章 7~50 条，多数一章可一次读完）
const byChapter = new Map();
guides.forEach((g) => {
  const arr = byChapter.get(g.ch) || [];
  arr.push(g);
  byChapter.set(g.ch, arr);
});
byChapter.forEach((arr) => arr.sort((a, b) => a.no - b.no));
const readChapters = chapters.map((c) => ({
  id: c.id,
  title: c.title,
  count: (byChapter.get(c.id) || []).length
}));

// 与参考项目 packages/domain/catalog.ts 同口径
const WEIGHTS = {
  money: { '0': 0, '少': 1, '多': 2 },
  time: { '少': 0, '中': 1, '多': 2 },
  effort: { '否': 0, '些': 1, '是': 2 }
};
const ROI_RANK = ['极高', '高', '一般', '未标注'];

const guideIds = new Set(guides.map((g) => g.id));

// 状态样式类（wxss 类名需 ASCII，真机编译器不支持中文类名选择器）
const STATUS_CLASS = {
  准备做: 'st-ready',
  进行中: 'st-doing',
  已完成: 'st-done',
  暂不适用: 'st-na'
};

function decorate(g, favSet, hlTerms) {
  const item = {
    id: g.id,
    ch: g.ch,
    no: g.no,
    title: g.title,
    summary: g.summary,
    chapterTitle: chapterMap[g.ch] || '',
    out: g.out,
    band: g.band,
    roi: g.roi,
    money: g.money,
    time: g.time,
    effort: g.effort,
    ev: g.ev,
    cv: g.cv,
    nv: g.nv,
    fav: favSet.has(g.id)
  };
  // 搜索时附带高亮分段与命中片段（hlTerms 含同义词，搜「炒股」也能标出「股票」）
  if (hlTerms && hlTerms.length) {
    item.titleSegs = search.highlight(g.title, hlTerms);
    item.summarySegs = search.highlight(search.snippet(g.summary, hlTerms), hlTerms);
  }
  return item;
}

function formatDate(ts) {
  const d = new Date(ts);
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

// 与参考项目 filterGuides 排序逻辑一致
function cmpGuide(a, b, q) {
  if (q.sort === 'roi') {
    const diff =
      ROI_RANK.indexOf(a.roi) - ROI_RANK.indexOf(b.roi) ||
      (WEIGHTS.money[a.money] ?? 9) - (WEIGHTS.money[b.money] ?? 9) ||
      (WEIGHTS.time[a.time] ?? 9) - (WEIGHTS.time[b.time] ?? 9) ||
      (WEIGHTS.effort[a.effort] ?? 9) - (WEIGHTS.effort[b.effort] ?? 9);
    if (diff) return diff;
  }
  if (q.sort === 'evidence') {
    const diff = a.ev.localeCompare(b.ev);
    if (diff) return diff;
  }
  return a.ch - b.ch || a.no - b.no;
}

function sortGuides(list, q) {
  return list.sort((a, b) => cmpGuide(a, b, q));
}

const search = require('../../utils/search');
const SORT_EXPLANATIONS = {
  chapter: '按章节与条目顺序。选择一种收益口径后，可按性价比排序。',
  roi: '同口径内按性价比档、钱、时间、毅力及章节排序。档位是作者判断，不是研究证据。',
  evidence: '按 A/B/C 及章节排序。A 级不意味着一定存在因果关系。'
};

Page({
  data: {
    activeTab: 'guide',
    // 收益口径
    outcomeItems: [{ key: '', label: '全部指南' }].concat(
      Object.keys(outcomes).map((k) => ({ key: k, label: outcomes[k] }))
    ),
    // picker 选项
    chapterOptions: ['全部'].concat(chapters.map((c) => `${c.id}. ${c.title}`)),
    evOptions: ['不限', 'A', 'B', 'C'],
    roiOptions: ['不限', '极高', '高', '一般'],
    moneyOptions: ['不限', '0', '少', '多'],
    timeOptions: ['不限', '少', '中', '多'],
    effortOptions: ['不限', '否', '些', '是'],
    audienceOptions: ['不限'].concat(audiences),
    // 筛选状态
    keyword: '',
    searchHistory: [],
    chapterIdx: 0,
    outcome: '',
    ev: '',
    roi: '',
    money: '',
    time: '',
    effort: '',
    audience: '',
    controversy: false,
    needsVerification: false,
    sort: 'chapter',
    // 显示标签
    chapterLabel: '全部',
    audienceLabel: '不限',
    sortLabel: '章节顺序',
    sortExplanation: SORT_EXPLANATIONS.chapter,
    // 列表
    filtered: [],
    totalCount: guides.length,
    hasMore: false,
    // 布局辅助
    scrollInto: '',
    hasActiveFilters: false,
    // 高级筛选面板（默认折叠，顶部只留搜索框）
    filterPanelOpen: false,
    activeFilterCount: 0,
    // 模糊搜索状态：'' 正常 / 'loose' 已放宽为部分匹配 / 'none' 无结果
    fuzzyMode: '',
    // 收藏与清单
    favList: [],
    todoList: [],
    favCount: 0,
    todoLeft: 0,
    todoDone: 0,
    // 通读 tab（一章一章读，不施加任何筛选）
    // toc = 目录页（进入通读先看这个），chapter = 正文
    readView: 'toc',
    readResume: null,
    readChapters,
    // 全书条数，与筛选结果 totalCount 区分：目录页必须显示全书
    bookTotal: guides.length,
    readChapterIdx: 0,
    readChapter: readChapters[0],
    readItems: [],
    readTotal: 0,
    readIsFirst: true,
    readIsLast: false,
    readChip: ''
  },

  onLoad(options) {
    const tab = options && options.tab;
    if (tab === 'fav' || tab === 'todo') {
      this.setData({ activeTab: tab });
    }
    this._shownCount = PAGE_SIZE;
    this._favSet = new Set();
    this._all = [];
    this.applyFilters();
    this.refreshState();
    this.setData({ searchHistory: getSearchHistory() });
    wx.showShareMenu({ menus: ['shareAppMessage', 'shareTimeline'] });
  },

  onShow() {
    this.refreshState();
    this.applyFilters();
    // 通读 tab 停在正文时，收藏状态可能刚在详情页改过，回到本页要同步
    if (this.data.activeTab === 'read' && this.data.readView === 'chapter') {
      this.buildReader();
    }
  },

  refreshState() {
    const favs = store.getFavs();
    const favSet = new Set(favs);
    this._favSet = favSet;

    const guideMap = {};
    guides.forEach((g) => {
      guideMap[g.id] = g;
    });

    const todoList = store.getTodos().map((t) => ({
      id: t.id,
      title: t.title,
      status: t.status || '准备做',
      stClass: STATUS_CLASS[t.status] || 'st-ready',
      note: t.note || '',
      hasGuide: guideIds.has(t.id),
      dateText: formatDate(t.addedAt)
    }));

    const favList = favs
      .map((id) => guideMap[id])
      .filter(Boolean)
      .map((g) => decorate(g, favSet));

    this.setData({
      favList,
      todoList,
      favCount: favs.length,
      todoLeft: todoList.filter((t) => t.status !== '已完成' && t.status !== '暂不适用').length,
      todoDone: todoList.filter((t) => t.status === '已完成').length
    });
  },

  applyFilters() {
    const q = {
      keyword: this.data.keyword,
      chapter: this.data.chapterIdx === 0 ? 0 : chapters[this.data.chapterIdx - 1].id,
      outcome: this.data.outcome,
      ev: this.data.ev,
      roi: this.data.roi,
      money: this.data.money,
      time: this.data.time,
      effort: this.data.effort,
      audience: this.data.audience,
      controversy: this.data.controversy,
      needsVerification: this.data.needsVerification,
      sort: this.data.sort
    };
    const terms = search.tokenize(q.keyword);
    const kw = (q.keyword || '').trim();

    // 除关键词外的结构化筛选
    const baseFilter = (g) => {
      if (q.outcome && g.out !== q.outcome) return false;
      if (q.chapter !== 0 && g.ch !== q.chapter) return false;
      if (q.ev && g.ev !== q.ev) return false;
      if (q.roi && g.roi !== q.roi) return false;
      if (q.money && g.money !== q.money) return false;
      if (q.time && g.time !== q.time) return false;
      if (q.effort && g.effort !== q.effort) return false;
      if (q.audience && !g.aud.some((group) => group.indexOf(q.audience) >= 0)) return false;
      if (q.controversy && !g.cv) return false;
      if (q.needsVerification && !g.nv) return false;
      return true;
    };

    let list;
    let fuzzyMode = '';

    if (terms.length) {
      const pool = guides.filter(baseFilter);
      const hl = search.expandTerms(terms);
      // 第一阶段：每个词都命中（原词 / 同义词 / 模糊）
      let scored = [];
      pool.forEach((g) => {
        const m = search.matchGuide(g, terms, chapterMap);
        if (m.all) scored.push({ g, m });
      });
      // 第二阶段：完全无结果时放宽为「命中任一词」，按相关度排序
      if (!scored.length) {
        pool.forEach((g) => {
          const m = search.matchGuide(g, terms, chapterMap);
          if (m.any) scored.push({ g, m });
        });
        fuzzyMode = scored.length ? 'loose' : 'none';
      }
      scored.sort((a, b) => {
        if (b.m.score !== a.m.score) return b.m.score - a.m.score;
        return cmpGuide(a.g, b.g, q);
      });
      list = scored.map((x) => decorate(x.g, this._favSet, hl));
    } else {
      list = sortGuides(guides.filter(baseFilter), q).map((g) => decorate(g, this._favSet));
    }

    this._all = list;
    this._shownCount = PAGE_SIZE;
    const shown = list.slice(0, this._shownCount);
    const hasActiveFilters = !!(
      kw ||
      q.outcome ||
      q.chapter ||
      q.ev ||
      q.roi ||
      q.money ||
      q.time ||
      q.effort ||
      q.audience ||
      q.controversy ||
      q.needsVerification ||
      q.sort !== 'chapter'
    );
    const activeFilterCount =
      (kw ? 1 : 0) +
      [q.outcome, q.chapter, q.ev, q.roi, q.money, q.time, q.effort, q.audience, q.controversy, q.needsVerification].filter(
        Boolean
      ).length;
    this.setData({
      filtered: shown,
      totalCount: list.length,
      hasMore: list.length > shown.length,
      hasActiveFilters,
      activeFilterCount,
      fuzzyMode
    });
  },

  // 从列表深处一键回到顶部筛选区（并展开面板）
  onBackToFilter() {
    this.setData({ filterPanelOpen: true, scrollInto: '' });
    setTimeout(() => {
      this.setData({ scrollInto: 'lib-top' });
    }, 60);
  },

  onLoadMore() {
    if (!this.data.hasMore || this._loading) return;
    this._loading = true;
    this._shownCount += PAGE_SIZE;
    const shown = this._all.slice(0, this._shownCount);
    this.setData(
      {
        filtered: shown,
        hasMore: this._all.length > shown.length
      },
      () => {
        this._loading = false;
      }
    );
  },

  /* ---------------- 通读模式：一章一章读 ---------------- */

  // 正文 -> 目录
  onOpenToc() {
    this.setData({ readView: 'toc', scrollInto: 'read-top' });
  },

  // 目录页的「上次读到」
  onResumeRead() {
    const r = this.data.readResume;
    if (!r) return;
    this.setData({ readChapterIdx: r.index, readView: 'chapter' }, () => this.buildReader());
  },

  // 构建当前章的阅读视图
  buildReader() {
    const idx = Math.max(0, Math.min(this.data.readChapterIdx, readChapters.length - 1));
    const ch = readChapters[idx];
    const all = byChapter.get(ch.id) || [];
    // 通读是一次读完一整章，不做分页：最长一章 50 条，一次渲染没问题
    this.setData({
      readChapterIdx: idx,
      readChapter: ch,
      readItems: all.map((g) => decorate(g, this._favSet)),
      readTotal: all.length,
      readIsFirst: idx === 0,
      readIsLast: idx === readChapters.length - 1,
      readChip: `chip-${ch.id}`,
      // 换章后回到本章开头
      scrollInto: 'read-top'
    });
    store.setReadPos({ chapter: ch.id });
  },

  // 目录页 / 顶部章节条：点击进正文
  onPickChapter(e) {
    const idx = Number(e.currentTarget.dataset.idx);
    if (!Number.isFinite(idx)) return;
    if (idx === this.data.readChapterIdx && this.data.readView === 'chapter') return;
    this.setData({ readChapterIdx: idx, readView: 'chapter' }, () => this.buildReader());
  },

  onPrevChapter() {
    if (this.data.readIsFirst) return;
    this.setData(
      { readChapterIdx: this.data.readChapterIdx - 1, readView: 'chapter' },
      () => this.buildReader()
    );
  },

  onNextChapter() {
    if (this.data.readIsLast) return;
    this.setData(
      { readChapterIdx: this.data.readChapterIdx + 1, readView: 'chapter' },
      () => this.buildReader()
    );
  },

    onSwitchTab(e) {
    const tab = e.currentTarget.dataset.tab;
    if (tab === 'read') {
      // 进通读先落目录页；上次读到哪章在这里标出来，方便接着读
      const pos = store.getReadPos();
      const found = readChapters.findIndex((c) => c.id === pos.chapter);
      const resume =
        found >= 0 ? { index: found, chapter: pos.chapter, title: readChapters[found].title } : null;
      this.setData({
        activeTab: 'read',
        readView: 'toc',
        readResume: resume,
        scrollInto: 'read-top'
      });
      return;
    }
    this.setData({ activeTab: tab });
  },

  onKeyword(e) {
    const value = e.detail.value;
    this.setData({ keyword: value });
    // 输入即时筛选（bindinput 自动触发），加 300ms 防抖避免逐键重算列表
    if (this._kwTimer) {
      clearTimeout(this._kwTimer);
    }
    this._kwTimer = setTimeout(() => {
      this._kwTimer = null;
      this.applyFilters();
      // 停稳后记入历史；单字太泛，没有复用价值
      if (value.trim().length >= 2) {
        this.setData({ searchHistory: addSearchHistory(value) });
      }
    }, 300);
  },

  // 点历史词直接搜，不用再手打
  onPickHistory(e) {
    const kw = e.currentTarget.dataset.kw || '';
    if (this._kwTimer) {
      clearTimeout(this._kwTimer);
      this._kwTimer = null;
    }
    this.setData({ keyword: kw, searchHistory: addSearchHistory(kw) });
    this.applyFilters();
  },

  onClearHistory() {
    try {
      wx.setStorageSync(HISTORY_KEY, []);
    } catch (e) {
      // 忽略
    }
    this.setData({ searchHistory: [] });
  },

  // 展开/收起高级筛选面板
  onFilterPanel() {
    this.setData({ filterPanelOpen: !this.data.filterPanelOpen });
  },

  // 收益口径：选口径后默认性价比排序（与参考项目一致）
  onOutcome(e) {
    const outcome = e.currentTarget.dataset.key;
    this.setData({
      outcome,
      sort: outcome ? 'roi' : 'chapter',
      sortLabel: outcome ? '性价比优先' : '章节顺序',
      sortExplanation: SORT_EXPLANATIONS[outcome ? 'roi' : 'chapter']
    });
    this.applyFilters();
  },

  onPick(e) {
    const field = e.currentTarget.dataset.field;
    const idx = Number(e.detail.value);
    const patch = {};
    if (field === 'sort') {
      const value = ['章节顺序', '性价比优先', '证据优先'][idx];
      const sortKey = { 章节顺序: 'chapter', 性价比优先: 'roi', 证据优先: 'evidence' }[value];
      if (sortKey === 'roi' && !this.data.outcome) {
        // 性价比排序需要先选口径，与参考项目一致
        wx.showToast({ title: '请先选择收益口径', icon: 'none' });
        return;
      }
      patch.sort = sortKey;
      patch.sortLabel = value;
      patch.sortExplanation = SORT_EXPLANATIONS[sortKey];
    } else {
      const optionsMap = {
        chapter: this.data.chapterOptions,
        ev: this.data.evOptions,
        roi: this.data.roiOptions,
        money: this.data.moneyOptions,
        time: this.data.timeOptions,
        effort: this.data.effortOptions,
        audience: this.data.audienceOptions
      };
      const keys = {
        chapter: 'chapterIdx',
        ev: 'ev',
        roi: 'roi',
        money: 'money',
        time: 'time',
        effort: 'effort',
        audience: 'audience'
      };
      const raw = optionsMap[field][idx];
      const value = raw === '不限' || raw === '全部' ? '' : raw;
      if (field === 'chapter') {
        patch.chapterIdx = idx;
        patch.chapterLabel = raw;
      } else {
        patch[keys[field]] = value;
      }
      if (field === 'audience') {
        patch.audienceLabel = raw;
      }
    }
    this.setData(patch);
    this.applyFilters();
  },

  onToggleControversy() {
    this.setData({ controversy: !this.data.controversy });
    this.applyFilters();
  },

  onToggleNeedsVerification() {
    this.setData({ needsVerification: !this.data.needsVerification });
    this.applyFilters();
  },

  onResetFilters() {
    this.setData({
      keyword: '',
      chapterIdx: 0,
      chapterLabel: '全部',
      outcome: '',
      ev: '',
      roi: '',
      money: '',
      time: '',
      effort: '',
      audience: '',
      audienceLabel: '不限',
      controversy: false,
      needsVerification: false,
      sort: 'chapter',
      sortLabel: '章节顺序',
      sortExplanation: SORT_EXPLANATIONS.chapter
    });
    this.applyFilters();
  },

  // 首次进某个详情分包要下载并解析 1MB 多，慢的时候中间有几秒空窗。
  // 延迟 200ms 才出 loading：跳得快不闪，跳得慢用户能看到在加载。
  openDetailPage(url) {
    let shown = false;
    const timer = setTimeout(() => {
      shown = true;
      wx.showLoading({ title: '加载中', mask: true });
    }, 200);
    const done = () => {
      clearTimeout(timer);
      if (shown) wx.hideLoading();
    };
    wx.navigateTo({ url, success: done, fail: done });
  },

  onOpenDetail(e) {
    this.openDetailPage(detailUrl(e.detail.id, e.detail.ch));
  },

  onToggleFav(e) {
    store.toggleFav(e.detail.id);
    this.refreshState();
    this.applyFilters();
  },

  onAddTodo(e) {
    const { id, title } = e.detail;
    const ok = store.addTodo(id, title);
    wx.showToast({
      title: ok ? '已加入清单（准备做）' : '已在清单中',
      icon: 'none'
    });
    this.refreshState();
  },

  onToggleDone(e) {
    store.toggleTodoDone(e.currentTarget.dataset.id);
    this.refreshState();
  },

  onRemoveTodo(e) {
    store.removeTodo(e.currentTarget.dataset.id);
    this.refreshState();
  },

  onOpenFromTodo(e) {
    const { id, hasGuide } = e.currentTarget.dataset;
    if (hasGuide) {
      this.openDetailPage(detailUrl(id, chapterOf.get(id)));
    }
  },

  onOpenAgreement(e) {
    wx.navigateTo({
      url: `/pages/agreement/agreement?type=${e.currentTarget.dataset.type}`
    });
  },

  // 分享落地到主页（好友先看到宣言，再进入指南库）
  onShareAppMessage() {
    return {
      title: '把有限的精力，花在值得的地方｜高性价比人生笔记',
      path: '/pages/index/index',
      imageUrl: '/assets/share-cover.png'
    };
  },

  onShareTimeline() {
    return {
      title: '把有限的精力，花在值得的地方｜高性价比人生笔记',
      query: '',
      imageUrl: '/assets/share-cover.png'
    };
  }
});
