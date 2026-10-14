const { chapters, guides } = require('../../data/guides');
const store = require('../../utils/store');
const { pickDaily, pickRandom, todayLabel } = require('../../utils/daily');

// 圆角矩形
function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// 按像素宽度折行（先设字体再测量）
function wrapText(ctx, text, maxW, font) {
  ctx.font = font;
  const lines = [];
  let line = '';
  for (const ch of text) {
    if (line && ctx.measureText(line + ch).width > maxW) {
      lines.push(line);
      line = ch;
    } else {
      line += ch;
    }
  }
  if (line) lines.push(line);
  return lines;
}

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

  // 查看今日一条的全文
  onOpenDaily(e) {
    wx.navigateTo({
      url: `/packageDetail/pages/detail/detail?id=${e.currentTarget.dataset.id}`
    });
  },

  // 生成分享图并保存到相册（绿底 + 一条结论 + 证据等级 + 出处）
  onSavePoster() {
    const daily = this.data.daily;
    if (!daily) return;
    const W = 750;
    const H = 1050;
    let canvas;
    try {
      canvas = wx.createOffscreenCanvas({ type: '2d', width: W, height: H });
    } catch (e) {
      wx.showToast({ title: '当前环境不支持生成图片', icon: 'none' });
      return;
    }
    const ctx = canvas.getContext('2d');
    const PAD = 64;
    const maxW = W - PAD * 2;

    // 背景
    ctx.fillStyle = '#214d3f';
    ctx.fillRect(0, 0, W, H);

    // 眉题 + 日期
    ctx.font = '22px sans-serif';
    ctx.fillStyle = '#8fb3a2';
    ctx.fillText('A LITTLE BETTER, EVERY DAY', PAD, 110);
    ctx.font = '26px sans-serif';
    ctx.fillText(`今日一条 · ${this.data.todayLabel}`, PAD, 166);

    // 标题（最多 4 行）
    let y = 250;
    const titleLines = wrapText(ctx, daily.title, maxW, 'bold 46px sans-serif').slice(0, 4);
    titleLines.forEach((l) => {
      ctx.font = 'bold 46px sans-serif';
      ctx.fillStyle = '#f4f7f2';
      ctx.fillText(l, PAD, y);
      y += 66;
    });

    // 分隔短线
    y += 10;
    ctx.strokeStyle = '#3c6b57';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(PAD, y);
    ctx.lineTo(PAD + 90, y);
    ctx.stroke();
    y += 64;

    // 结论（最多 9 行，超长截断）
    const bodyLines = wrapText(ctx, daily.summary, maxW, '28px sans-serif').slice(0, 9);
    ctx.font = '28px sans-serif';
    ctx.fillStyle = '#cfe0d6';
    bodyLines.forEach((l) => {
      ctx.fillText(l, PAD, y);
      y += 48;
    });

    // 证据徽章
    const roiPart = daily.roi && daily.roi !== '未标注' ? ` · ${daily.roi}性价比` : '';
    const badge = `证据 ${daily.ev}${roiPart}`;
    ctx.font = '24px sans-serif';
    const bw = ctx.measureText(badge).width + 48;
    const by = H - 300;
    rr(ctx, PAD, by, bw, 56, 28);
    ctx.fillStyle = '#faf0d9';
    ctx.fill();
    ctx.fillStyle = '#956e27';
    ctx.fillText(badge, PAD + 24, by + 38);

    // 章节
    ctx.font = '24px sans-serif';
    ctx.fillStyle = '#8fb3a2';
    ctx.fillText(daily.chapterTitle, PAD, by + 110);

    // 页脚
    ctx.font = 'bold 30px sans-serif';
    ctx.fillStyle = '#f4f7f2';
    ctx.fillText('人生指南', PAD, H - 110);
    ctx.font = '22px sans-serif';
    ctx.fillStyle = '#8fb3a2';
    const stats = `${this.data.chapterCount} 章节 · ${this.data.totalGuides} 条建议`;
    ctx.fillText(stats, W - PAD - ctx.measureText(stats).width, H - 110);
    ctx.font = '20px sans-serif';
    ctx.fillStyle = '#5f8f7b';
    ctx.fillText('内容来自《高性价比人生指南》· CC BY 4.0 · 作者 eternity4719', PAD, H - 58);

    wx.canvasToTempFilePath({
      canvas,
      success: (res) => {
        wx.saveImageToPhotosAlbum({
          filePath: res.tempFilePath,
          success: () => wx.showToast({ title: '已保存，去分享吧', icon: 'success' }),
          fail: (err) => {
            const msg = (err && err.errMsg) || '';
            if (msg.indexOf('auth') >= 0 || msg.indexOf('deny') >= 0) {
              wx.showModal({
                title: '需要相册权限',
                content: '保存分享图需要「保存到相册」权限，请在设置中开启',
                confirmText: '去设置',
                success: (r) => {
                  if (r.confirm) {
                    wx.openSetting();
                  }
                }
              });
            } else {
              wx.showToast({ title: '已取消保存', icon: 'none' });
            }
          }
        });
      },
      fail: () => wx.showToast({ title: '生成图片失败', icon: 'none' })
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
