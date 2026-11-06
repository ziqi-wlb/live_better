// app.js
App({
  onLaunch() {
    this.watchForUpdate();
  },

  // 静默更新的「立刻生效」按钮。
  // 微信本身会在冷启动时检查并下载新版本，但下载完要等下一次冷启动才用上，
  // 用户体感就是「明明更新了还是旧界面」。这里补一个提示，让他能当场重启。
  // 没有这段也不影响更新，只是慢一拍 —— 所以任何异常都不能拦住启动。
  watchForUpdate() {
    if (!wx.canIUse('getUpdateManager')) return;
    let updateManager;
    try {
      updateManager = wx.getUpdateManager();
    } catch (err) {
      return;
    }

    updateManager.onUpdateReady(() => {
      wx.showModal({
        title: '新版本已就绪',
        content: '重启后使用新版本。收藏与清单都存在本机，不会丢失。',
        confirmText: '立即重启',
        cancelText: '稍后',
        success: (res) => {
          if (res.confirm) updateManager.applyUpdate();
        }
      });
    });

    // onUpdateFailed 故意不弹窗：下载失败时微信会在下次冷启动自己重试。
    // 也绝不能提示「删除小程序后重新搜索打开」——那会把本机收藏与清单一起清掉。
  }
});
