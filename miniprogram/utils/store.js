// 本地存储：收藏与行动清单（状态 + 备注）
const FAV_KEY = 'life_guide_favs';
const TODO_KEY = 'life_guide_todos';
const READ_KEY = 'life_guide_read_pos';

const STATUSES = ['准备做', '进行中', '已完成', '暂不适用'];

function read(key, fallback) {
  try {
    const v = wx.getStorageSync(key);
    return v === '' || v === null || v === undefined ? fallback : v;
  } catch (e) {
    return fallback;
  }
}

function write(key, value) {
  try {
    wx.setStorageSync(key, value);
  } catch (e) {
    // 存储失败静默处理
  }
}

function getFavs() {
  return read(FAV_KEY, []);
}

function toggleFav(id) {
  const favs = getFavs();
  const idx = favs.indexOf(id);
  let added;
  if (idx >= 0) {
    favs.splice(idx, 1);
    added = false;
  } else {
    favs.unshift(id);
    added = true;
  }
  write(FAV_KEY, favs);
  return added;
}

function getTodos() {
  return read(TODO_KEY, []);
}

function getTodo(id) {
  return getTodos().find((t) => t.id === id) || null;
}

function addTodo(id, title) {
  const todos = getTodos();
  if (todos.some((t) => t.id === id)) {
    return false;
  }
  todos.unshift({
    id,
    title,
    status: '准备做',
    note: '',
    addedAt: Date.now()
  });
  write(TODO_KEY, todos);
  return true;
}

// status 为 null 时移出行动清单
function setTodoStatus(id, status) {
  const todos = getTodos();
  if (status === null || status === undefined || status === '') {
    write(TODO_KEY, todos.filter((t) => t.id !== id));
    return;
  }
  const t = todos.find((item) => item.id === id);
  if (t) {
    t.status = status;
    if (status === '已完成' && !t.finishedAt) {
      t.finishedAt = Date.now();
    }
    if (status !== '已完成') {
      delete t.finishedAt;
    }
    write(TODO_KEY, todos);
  }
}

function setTodoNote(id, note) {
  const todos = getTodos();
  const t = todos.find((item) => item.id === id);
  if (t) {
    t.note = note || '';
    write(TODO_KEY, todos);
  }
}

function toggleTodoDone(id) {
  const t = getTodo(id);
  if (t) {
    setTodoStatus(id, t.status === '已完成' ? '准备做' : '已完成');
  }
}

function removeTodo(id) {
  write(TODO_KEY, getTodos().filter((t) => t.id !== id));
}

function hasTodo(id) {
  return getTodos().some((t) => t.id === id);
}

// 通读进度：记住上次读到哪一章，下次进入直接接着读
function getReadPos() {
  const p = read(READ_KEY, null);
  return p && typeof p === 'object' && p.chapter ? p : { chapter: 1 };
}

function setReadPos(pos) {
  write(READ_KEY, pos);
}

module.exports = {
  STATUSES,
  getFavs,
  toggleFav,
  getTodos,
  getTodo,
  addTodo,
  setTodoStatus,
  setTodoNote,
  toggleTodoDone,
  removeTodo,
  hasTodo,
  getReadPos,
  setReadPos
};
