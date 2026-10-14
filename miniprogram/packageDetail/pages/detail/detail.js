const { chapters, guides } = require('../../../data/guides.js');
const details = require('../../data/details.js');
const store = require('../../../utils/store');

const chapterMap = {};
chapters.forEach((c) => {
  chapterMap[c.id] = c.title;
});

const ACTION_OPTIONS = ['准备做', '进行中', '已完成', '暂不适用', '移出行动'];
const evidenceDesc = {
  A: '可核对数字及原始研究或官方文件',
  B: '研究支持但有限',
  C: '经验或公认做法'
};

Page({
  data: {
    item: null,
    navTitle: '建议详情',
    fav: false,
    inTodo: false,
    actionLabel: '加入行动清单',
    note: '',
    actionOptions: ACTION_OPTIONS,
    audienceText: '',
    evidenceDescText: '',
    hasNotes: false,
    fixedSourceUrl: ''
  },

  onLoad(options) {
    const fail = () => {
      wx.showToast({ title: '未找到该建议', icon: 'none' });
      setTimeout(() => wx.navigateBack(), 600);
    };
    if (!options || !options.id) return fail();
    const info = details.items[options.id];
    const meta = guides.find((g) => g.id === options.id);
    if (!info || !meta) return fail();

    const chapterTitle = chapterMap[meta.ch] || '';
    const audience = info.audienceGroups || [];
    const audienceText = audience.length
      ? audience.map((group) => group.join(' 且 ')).join(' 或 ')
      : '未标注，请以正文为准';
    const fixedSourceUrl = info.sourcePath
      ? `https://github.com/eternity4719/HowToLiveBetter/blob/${details.sourceCommit}/${info.sourcePath}`
      : '';

    this.setData({
      item: {
        id: meta.id,
        ch: meta.ch,
        no: meta.no,
        title: meta.title,
        chapterTitle,
        roi: meta.roi,
        band: meta.band,
        ev: meta.ev,
        cv: meta.cv,
        nv: meta.nv,
        text: info.text,
        costText: info.costText,
        benefitText: info.benefitText,
        notes: info.notes,
        source: info.source,
        links: info.links || []
      },
      navTitle: chapterTitle || '建议详情',
      evidenceDescText: evidenceDesc[meta.ev] || '',
      hasNotes: !!(info.notes && info.notes.length),
      audienceText,
      fixedSourceUrl
    });
    this.refreshState();
  },

  onShow() {
    this.refreshState();
  },

  refreshState() {
    if (!this.data.item) return;
    const id = this.data.item.id;
    const todo = store.getTodo(id);
    this.setData({
      fav: store.getFavs().indexOf(id) >= 0,
      inTodo: !!todo,
      actionLabel: todo ? todo.status : '加入行动清单',
      note: todo ? todo.note || '' : this.data.note || ''
    });
  },

  onToggleFav() {
    store.toggleFav(this.data.item.id);
    this.refreshState();
    wx.showToast({
      title: this.data.fav ? '已收藏' : '已取消收藏',
      icon: 'none'
    });
  },

  onAddTodo() {
    const { id, title } = this.data.item;
    const ok = store.addTodo(id, title);
    wx.showToast({ title: ok ? '已加入行动清单（准备做）' : '已在清单中', icon: 'none' });
    this.refreshState();
  },

  onPickAction(e) {
    const idx = Number(e.detail.value);
    const value = ACTION_OPTIONS[idx];
    const { id, title } = this.data.item;
    if (value === '移出行动') {
      store.setTodoStatus(id, null);
      this.setData({ note: '' });
    } else {
      if (!store.hasTodo(id)) {
        store.addTodo(id, title);
      }
      store.setTodoStatus(id, value);
    }
    this.refreshState();
    wx.showToast({ title: value === '移出行动' ? '已移出清单' : `状态：${value}`, icon: 'none' });
  },

  onNoteInput(e) {
    this.setData({ note: e.detail.value });
  },

  onSaveNote() {
    const todo = store.getTodo(this.data.item.id);
    if (!todo) {
      wx.showToast({ title: '请先加入行动清单', icon: 'none' });
      return;
    }
    store.setTodoNote(this.data.item.id, this.data.note);
    wx.showToast({ title: '备注已保存', icon: 'none' });
  },

  onCopyFixedSource() {
    if (!this.data.fixedSourceUrl) return;
    wx.setClipboardData({ data: this.data.fixedSourceUrl });
  },

  onCopyLink(e) {
    wx.setClipboardData({ data: e.currentTarget.dataset.link });
  },

  onShareAppMessage() {
    const item = this.data.item;
    return {
      title: item ? item.title : '人生指南',
      path: `/packageDetail/pages/detail/detail?id=${item ? item.id : ''}`
    };
  }
});
