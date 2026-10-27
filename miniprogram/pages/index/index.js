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

  // navigateTo 失败默认完全静默（看起来就是"点了没反应"），这里补一个可见反馈
  nav(url) {
    wx.navigateTo({
      url,
      fail: (err) => {
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
    const ch = this.data.daily && this.data.daily.ch;
    this.nav(detailUrl(e.currentTarget.dataset.id, ch));
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
