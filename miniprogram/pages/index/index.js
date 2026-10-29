const { chapters, guides } = require('../../data/guides');
const store = require('../../utils/store');
const { pickDaily, pickRandom, todayLabel } = require('../../utils/daily');
const { detailUrl } = require('../../utils/detail-path');

Page({
  data: {
    totalGuides: guides.length,
    chapterCount: chapters.length,
    favCount: 0,
    todoLeft: 0,
    daily: null,
    todayLabel: ''
  },

  onLoad() {
    wx.showShareMenu({ menus: ['shareAppMessage', 'shareTimeline'] });
    this.refreshCounts();
    this._dailyShuffled = false;
    this.setData({ daily: pickDaily(), todayLabel: todayLabel() });
    // preloadRule 里首页只预下载 packageDetail（单页限额 2M），
    // 这里再补上另一个分包，覆盖第 12 章以后的条目
    if (typeof wx.preloadSubpackage === 'function') {
      wx.preloadSubpackage({ name: 'packageDetail2' });
    }
  },

  onShow() {
    this.refreshCounts();
    // 手动换过的条目保留，返回主页不重置
    if (!this._dailyShuffled) {
      this.setData({ daily: pickDaily(), todayLabel: todayLabel() });
    }
  },

  // 换一条：随机切换
  onShuffleDaily() {
    this._dailyShuffled = true;
    const current = this.data.daily && this.data.daily.id;
    this.setData({ daily: pickRandom(current) });
  },

  refreshCounts() {
    const todos = store.getTodos();
    this.setData({
      favCount: store.getFavs().length,
      todoLeft: todos.filter((t) => t.status !== '已完成' && t.status !== '暂不适用').length
    });
  },

  // navigateTo 失败默认完全静默（看起来就是"点了没反应"），这里补一个可见反馈。
  // 首次进详情页要下载并解析 1MB 多的详情分包，慢的时候中间有几秒空窗，
  // 所以延迟 200ms 才出 loading：跳得快就不会闪，跳得慢用户能看到在加载。
  nav(url) {
    let shown = false;
    const timer = setTimeout(() => {
      shown = true;
      wx.showLoading({ title: '加载中', mask: true });
    }, 200);
    const done = () => {
      clearTimeout(timer);
      if (shown) wx.hideLoading();
    };
    wx.navigateTo({
      url,
      success: done,
      fail: (err) => {
        done();
        console.error('[nav fail]', url, err);
        wx.showToast({ title: '打开失败，请重试', icon: 'none' });
      }
    });
  },

  // 主 CTA：进入指南库（搜索/筛选/排序都在那里）
  onExplore() {
    this.nav('/pages/library/library');
  },

  // 次级入口：直达收藏 / 行动清单
  onOpenTab(e) {
    this.nav(`/pages/library/library?tab=${e.currentTarget.dataset.tab}`);
  },

  // 查看今日一条的全文
  onOpenDaily(e) {
    const id = e.currentTarget.dataset.id;
    const daily = this.data.daily;
    let ch = daily ? daily.ch : undefined;
    // 兜底：万一 daily 没带 ch，回源查一次，避免算出错误的分包
    if (ch === undefined || ch === null) {
      const found = guides.find((g) => g.id === id);
      ch = found ? found.ch : 1;
    }
    this.nav(detailUrl(id, ch));
  },

  onOpenAgreement(e) {
    wx.navigateTo({
      url: `/pages/agreement/agreement?type=${e.currentTarget.dataset.type}`
    });
  },

  // 首页分享：右上角「···」和页面内 button open-type=share 都会走这里。
  // 带条目标题比一句口号点击率高，故优先用 daily 的标题。
  onShareAppMessage() {
    const daily = this.data.daily;
    const t = daily && daily.title ? daily.title : '';
    return {
      title: t
        ? `${t.length > 20 ? `${t.slice(0, 20)}…` : t}｜高性价比人生笔记`
        : '把有限的精力，花在值得的地方｜高性价比人生笔记',
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
