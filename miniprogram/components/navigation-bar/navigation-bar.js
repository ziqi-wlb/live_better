Component({
  options: {
    multipleSlots: true
  },
  properties: {
    title: {
      type: String,
      value: ''
    },
    background: {
      type: String,
      value: '#ffffff'
    },
    color: {
      type: String,
      value: '#000000'
    },
    back: {
      type: Boolean,
      value: true
    },
    loading: {
      type: Boolean,
      value: false
    },
    animated: {
      type: Boolean,
      value: true
    },
    show: {
      type: Boolean,
      value: true,
      observer: '_showChange'
    },
    delta: {
      type: Number,
      value: 1
    }
  },
  data: {
    displayStyle: '',
    statusBarHeight: 20,
    navHeight: 44,
    leftWidth: '',
    innerPaddingRight: ''
  },
  lifetimes: {
    attached() {
      let rect = { top: 48, height: 32, left: 278 };
      try {
        rect = wx.getMenuButtonBoundingClientRect();
      } catch (e) {
        // 工具窗未就绪时使用兜底值
      }
      let winInfo = { statusBarHeight: 20, windowWidth: 375 };
      try {
        winInfo = wx.getWindowInfo();
      } catch (e) {
        try {
          winInfo = wx.getSystemInfoSync();
        } catch (e2) {
          // 忽略
        }
      }
      const statusBarHeight = winInfo.statusBarHeight || 20;
      const navHeight = Math.max(44, (rect.top - statusBarHeight) * 2 + rect.height);
      this.setData({
        statusBarHeight,
        navHeight,
        innerPaddingRight: `padding-right: ${winInfo.windowWidth - rect.left}px`,
        leftWidth: `width: ${winInfo.windowWidth - rect.left}px`
      });
    }
  },
  methods: {
    _showChange(show) {
      const displayStyle = this.data.animated
        ? `opacity: ${show ? 1 : 0};transition: opacity 0.5s;`
        : `display: ${show ? '' : 'none'}`;
      this.setData({ displayStyle });
    },
    back() {
      if (this.data.delta) {
        wx.navigateBack({
          delta: this.data.delta
        });
      }
      this.triggerEvent('back', { delta: this.data.delta }, {});
    }
  }
});
