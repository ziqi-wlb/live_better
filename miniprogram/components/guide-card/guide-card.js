Component({
  properties: {
    item: {
      type: Object,
      value: {}
    }
  },
  methods: {
    onOpen() {
      this.triggerEvent('open', { id: this.data.item.id });
    },
    onFav() {
      this.triggerEvent('fav', { id: this.data.item.id });
    },
    onAdd() {
      this.triggerEvent('add', { id: this.data.item.id, title: this.data.item.title });
    }
  }
});
