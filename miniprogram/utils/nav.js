// 页面跳转的唯一入口。
//
// wx.navigateTo 失败时默认完全静默——用户点下去没有任何反馈，看起来就是
// 「点了没反应」。之前全站 7 处跳转里只有 1 处带失败提示，其余 6 处是裸调用，
// 而失败概率最高的恰恰是「进详情页」（要下载并解析 1MB 多的分包）。
//
// 把这件事收成一份实现，所有页面都调它，免得再长出第二套语义。

// 普通跳转：失败弹一个可见提示
function navigate(url) {
  wx.navigateTo({
    url,
    fail: (err) => {
      console.error('[nav fail]', url, err);
      wx.showToast({ title: '打开失败，请重试', icon: 'none' });
    }
  });
}

// 跳详情页用这个：首次进某个分包要下载并解析 1MB 多，慢的时候中间有几秒空窗。
// 延迟 200ms 才出 loading——跳得快不闪，跳得慢用户能看到在加载。
function navigateWithLoading(url) {
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
}

module.exports = { navigate, navigateWithLoading };
