const { chapters, guides, outcomes, audiences } = require('../../data/guides');
const store = require('../../utils/store');

const PAGE_SIZE = 50;

const chapterMap = {};
chapters.forEach((c) => {
  chapterMap[c.id] = c.title;
});

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

function decorate(g, favSet) {
  return {
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
}

function formatDate(ts) {
  const d = new Date(ts);
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

// 与参考项目 filterGuides 排序逻辑一致
function sortGuides(list, q) {
  const cmp = (a, b) => {
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
  };
  return list.sort(cmp);
}

const SORT_EXPLANATIONS = {
  chapter: '按章节与条目顺序。选择一种收益口径后，可按性价比排序。',
  roi: '同口径内按性价比档、钱、时间、毅力及章节排序。档位是作者判断，不是研究证据。',
  evidence: '按 A/B/C 及章节排序。A 级不意味着一定存在因果关系。'
};

Page({
  data: {
    activeTab: 'guide',
    totalGuides: guides.length,
    chapterCount: chapters.length,
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
    totalCount: 0,
    hasMore: false,
    // 布局辅助
    scrollInto: '',
    hasActiveFilters: false,
    // 高级筛选面板（默认折叠，指南库只留搜索框）
    filterPanelOpen: false,
    activeFilterCount: 0,
    // 收藏与清单
    favList: [],
    todoList: [],
    favCount: 0,
    todoLeft: 0,
    todoDone: 0
  },

  onLoad() {
    this._shownCount = PAGE_SIZE;
    this._favSet = new Set();
    this._all = [];
    this.applyFilters();
    this.refreshState();
    wx.showShareMenu({ menus: ['shareAppMessage', 'shareTimeline'] });
  },

  onShow() {
    this.refreshState();
    this.applyFilters();
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
    const kw = (q.keyword || '').trim().toLowerCase();

    let list = guides.filter((g) => {
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
      if (kw) {
        const hay = `${g.title} ${g.summary} ${chapterMap[g.ch] || ''}`.toLowerCase();
        if (hay.indexOf(kw) < 0) return false;
      }
      return true;
    });

    list = sortGuides(list, q).map((g) => decorate(g, this._favSet));

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
      activeFilterCount
    });
  },

  // 落地页「开始探索」：平滑滚动到指南库
  onExplore() {
    this.setData({ scrollInto: '' });
    setTimeout(() => {
      this.setData({ scrollInto: 'lib-top' });
    }, 60);
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

  onSwitchTab(e) {
    this.setData({ activeTab: e.currentTarget.dataset.tab });
  },

  onKeyword(e) {
    this.setData({ keyword: e.detail.value });
    // 输入即时筛选（bindinput 自动触发），加 300ms 防抖避免逐键重算列表
    if (this._kwTimer) {
      clearTimeout(this._kwTimer);
    }
    this._kwTimer = setTimeout(() => {
      this._kwTimer = null;
      this.applyFilters();
    }, 300);
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

  onOpenDetail(e) {
    wx.navigateTo({
      url: `/packageDetail/pages/detail/detail?id=${e.detail.id}`
    });
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
      wx.navigateTo({
        url: `/packageDetail/pages/detail/detail?id=${id}`
      });
    }
  },

  onOpenAgreement(e) {
    wx.navigateTo({
      url: `/pages/agreement/agreement?type=${e.currentTarget.dataset.type}`
    });
  },

  onShareAppMessage() {
    return {
      title: '把有限的精力，花在值得的地方｜人生指南',
      path: '/pages/index/index',
      imageUrl: '/assets/share-cover.png'
    };
  },

  onShareTimeline() {
    return {
      title: '把有限的精力，花在值得的地方｜人生指南',
      query: '',
      imageUrl: '/assets/share-cover.png'
    };
  }
});
