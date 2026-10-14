const { chapters, guides } = require('../../data/guides');
const store = require('../../utils/store');

Page({
  data: {
    totalGuides: guides.length,
    chapterCount: chapters.length,
    favCount: 0,
    todoLeft: 0
  },

  onLoad() {
    wx.showShareMenu({ menus: ['shareAppMessage', 'shareTimeline'] });
    this.refreshCounts();
  },

  onShow() {
    this.refreshCounts();
  },

  refreshCounts() {
    const todos = store.getTodos();
    this.setData({
      favCount: store.getFavs().length,
      todoLeft: todos.filter((t) => t.status !== '已完成' && t.status !== '暂不适用').length
    });
  },

  // 主 CTA：进入指南库（搜索/筛选/排序都在那里）
  onExplore() {
    wx.navigateTo({
      url: '/pages/library/library'
    });
  },

  // 次级入口：直达收藏 / 行动清单
  onOpenTab(e) {
    wx.navigateTo({
      url: `/pages/library/library?tab=${e.currentTarget.dataset.tab}`
    });
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
