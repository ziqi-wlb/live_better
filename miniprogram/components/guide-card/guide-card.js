Component({
  properties: {
    item: {
      type: Object,
      value: {}
    }
  },
  methods: {
    onOpen() {
      // 带上 ch：详情页按章节分布在不同的分包里
      this.triggerEvent('open', { id: this.data.item.id, ch: this.data.item.ch });
    },
    onFav() {
      this.triggerEvent('fav', { id: this.data.item.id });
    },
    onAdd() {
      this.triggerEvent('add', { id: this.data.item.id, title: this.data.item.title });
    }
  }
});
