/* ============================================================
   🐰 开心肖笑乐 · 全部交互逻辑
   数据持久化：localStorage
   ============================================================ */

// ==================== 通用工具 ====================
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}
function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}
function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function weekKey() {
  const d = new Date();
  return `${d.getFullYear()}-W${getWeekNumber(d)}`;
}
function getWeekNumber(d) {
  const date = new Date(d.getTime());
  date.setHours(0,0,0,0);
  date.setDate(date.getDate() + 4 - (date.getDay() || 7));
  const yearStart = new Date(date.getFullYear(),0,1);
  return Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
}
function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : JSON.parse(JSON.stringify(fallback));
  } catch (e) {
    return JSON.parse(JSON.stringify(fallback));
  }
}
function saveJSON(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {}
}
function fmtTime(ts) {
  const d = new Date(ts);
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
function fmtDate(d) {
  const wk = ['日','一','二','三','四','五','六'];
  return `${d.getFullYear()}年${d.getMonth()+1}月${d.getDate()}日 星期${wk[d.getDay()]}`;
}
function isTodayKey(key) {
  return key === todayKey();
}

// ==================== 页面元信息 ====================
const PAGE_TITLES = {
  plan:      { title: '每日计划',   desc: '今日事今日毕，每天都是新的开始～' },
  body:      { title: '身体塑形',   desc: '跟着视频一起练，雕刻更好的自己' },
  exam:      { title: '教资',       desc: '笔试题库 + 面试视频，一起上岸' },
  reading:   { title: '今日读书',   desc: '每天读一点，时间会给你答案' },
  dailylife: { title: 'Daily Life', desc: '记录生活里的小确幸与碎碎念' },
  english:   { title: '英语学习',   desc: 'Every word brings you closer to fluency!' },
  podcast:   { title: '播客',       desc: '通勤、做饭、做家务时听一听' },
  news:      { title: '每日新闻',   desc: '关注天下事，做个有格局的人' },
  beauty:    { title: '变美技巧',   desc: '穿搭 · 化妆 · 饰品，发现更美的自己' },
  job:       { title: '就业信息',   desc: '考公考编倒计时 + 山东省就业招聘信息' },
  food:      { title: '今日食谱',   desc: '好好吃饭，是对自己最基本的温柔' },
  grad:      { title: '研究生日常', desc: '文献阅读 · 科研进度 · 导师沟通 · 课程笔记' },
  finance:   { title: '理财',       desc: '记账 · 存钱 · 慢慢变富，从大学开始' },
};

const QUOTES = [
  { zh: '愿你成为自己的太阳，无需凭借谁的光。', en: 'May you become your own sun, needing no one else light.' },
  { zh: '生活明朗，万物可爱。', en: 'Life is bright and everything is lovely.' },
  { zh: '不慌不忙，闪闪发光。', en: 'Shine bright, without rush.' },
  { zh: '今天的努力，是明天的底气。', en: 'Today\'s effort is tomorrow\'s confidence.' },
  { zh: '慢慢来，谁还没有一个努力的过程。', en: 'Take your time, everyone has a process of working hard.' },
];

// ==================== 打卡系统 ====================
const CALENDAR_KEY = 'workbuddy.calendar.checkin.v1';
let checkinData = loadJSON(CALENDAR_KEY, {});
let currentCalDate = new Date();

function dateKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function computeStreak() {
  let streak = 0;
  const d = new Date();
  // If not checked in today, start from yesterday
  if (!checkinData[dateKey(d)]) d.setDate(d.getDate() - 1);
  while (checkinData[dateKey(d)]) {
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}
function renderCalendar() {
  const grid = document.getElementById('calendarGrid');
  const title = document.getElementById('calendarMonth');
  if (!grid || !title) return;
  const year = currentCalDate.getFullYear(), month = currentCalDate.getMonth();
  title.textContent = `${year}年${month + 1}月`;
  const weekdays = Array.from(grid.querySelectorAll('.cal-weekday'));
  grid.innerHTML = '';
  weekdays.forEach(el => grid.appendChild(el));
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startOffset = firstDay.getDay();
  const daysInMonth = lastDay.getDate();
  const today = new Date();
  for (let i = 0; i < startOffset; i++) {
    const blank = document.createElement('div'); blank.className = 'cal-day blank'; grid.appendChild(blank);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d);
    const key = dateKey(date);
    const isToday = isSameDay(date, today);
    const checked = !!checkinData[key];
    const cell = document.createElement('div');
    cell.className = 'cal-day' + (isToday ? ' is-today' : '') + (checked ? ' checked' : '');
    cell.dataset.date = key;
    cell.innerHTML = `<span class="cal-num">${d}</span>${checked ? '<i class="cal-dot"></i>' : ''}`;
    cell.title = `${key} ${checked ? '已打卡' : '未打卡'}，点击切换`;
    grid.appendChild(cell);
  }
}
function toggleCheckin(key) {
  if (checkinData[key]) delete checkinData[key]; else checkinData[key] = 1;
  saveJSON(CALENDAR_KEY, checkinData);
  renderCalendar();
  renderCheckinPills();
}
function renderCheckinPills() {
  const streak = computeStreak();
  const todayChecked = !!checkinData[todayKey()];
  ['planCheckin'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.querySelector('.checkin-streak').textContent = streak;
    el.classList.toggle('checked', todayChecked);
    const btnText = el.querySelector('.checkin-btn span:last-child');
    if (btnText) btnText.textContent = todayChecked ? '已打卡' : '今日打卡';
  });
}
function bindCalendarEvents() {
  const grid = document.getElementById('calendarGrid');
  if (grid) grid.addEventListener('click', e => {
    const cell = e.target.closest('.cal-day[data-date]');
    if (cell) toggleCheckin(cell.dataset.date);
  });
  const prev = document.getElementById('calPrev'), next = document.getElementById('calNext'), todayBtn = document.getElementById('calToday');
  if (prev) prev.addEventListener('click', () => { currentCalDate.setMonth(currentCalDate.getMonth() - 1); renderCalendar(); });
  if (next) next.addEventListener('click', () => { currentCalDate.setMonth(currentCalDate.getMonth() + 1); renderCalendar(); });
  if (todayBtn) todayBtn.addEventListener('click', () => { currentCalDate = new Date(); renderCalendar(); });
}
function bindCheckinPills() {
  ['planCheckin'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('click', () => toggleCheckin(todayKey()));
  });
}

// ==================== 每日计划 · 任务管理 ====================
const PAGE_LINKS = {
  '':         '无链接',
  reading:    '今日读书',
  dailylife:  'Daily Life',
  body:       '身体塑形',
  exam:       '教资',
  english:    '英语学习',
  podcast:    '播客',
  news:       '每日新闻',
  beauty:     '变美技巧',
  job:        '就业信息',
  food:       '今日食谱',
  grad:       '研究生日常',
};
const DEFAULT_TASKS = {
  personal: [
    { id: 'p1', name: '普拉提 1 小时',       done: false, link: 'body' },
    { id: 'p2', name: '小提琴练习 1 小时',   done: false },
    { id: 'p3', name: '英语练习 30 分钟',    done: false, link: 'exam' },
  ],
  creative: [
    { id: 'c1', name: '趁热打铁三连击',      done: false },
  ],
};
const TASK_KEY = 'workbuddy.tasks.v1';
let tasks = loadJSON(TASK_KEY, DEFAULT_TASKS);
// 一次性清理：移除已废弃的「运营例行」默认任务
(function purgeYunying() {
  let changed = false;
  for (const col of ['personal', 'creative']) {
    const before = tasks[col].length;
    tasks[col] = tasks[col].filter(t => !(t.id === 'c2' || t.name === '运营例行'));
    if (tasks[col].length !== before) changed = true;
  }
  if (changed) saveJSON(TASK_KEY, tasks);
})();
(function mergeTaskLinks() {
  let changed = false;
  ['personal', 'creative'].forEach(col => {
    // Migrate old 'teacher' link to 'exam'
    tasks[col].forEach(t => { if (t.link === 'teacher') { t.link = 'exam'; changed = true; } });
  });
  if (changed) saveJSON(TASK_KEY, tasks);
})();
let deleteTarget = null;

function renderTasks() {
  ['personal', 'creative'].forEach(col => {
    const list = document.getElementById(col === 'personal' ? 'listPersonal' : 'listCreative');
    list.innerHTML = '';
    tasks[col].forEach((task, idx) => {
      const isFirst = idx === 0;
      const isLast = idx === tasks[col].length - 1;
      const t = document.createElement('div');
      t.className = 'task' + (task.done ? ' done' : '');
      t.dataset.id = task.id;
      t.innerHTML = `
        <div class="checkbox ${task.done ? 'checked' : ''}" data-action="toggle">
          <svg viewBox="0 0 24 24" fill="none"><path d="M5 12l4 4L19 6" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </div>
        <div class="task-name" data-action="toggle">${escapeHtml(task.name)}</div>
        ${task.link ? `<button class="link-btn" data-action="link" title="跳转到「${(PAGE_TITLES[task.link]||{}).title || task.link}」"><svg viewBox="0 0 24 24" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>` : ''}
        <button class="move-btn" data-action="up" title="上移" ${isFirst ? 'disabled' : ''}>
          <svg viewBox="0 0 24 24" fill="none"><path d="M6 15l6-6 6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
        <button class="move-btn" data-action="down" title="下移" ${isLast ? 'disabled' : ''}>
          <svg viewBox="0 0 24 24" fill="none"><path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
        <button class="edit-btn" data-action="edit" title="编辑任务">
          <svg viewBox="0 0 24 24" fill="none"><path d="M4 20h4L18 10l-4-4L4 16v4Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M14 6l4 4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
        </button>
        <button class="del-btn" data-action="delete" title="删除任务">
          <svg viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
        </button>`;
      list.appendChild(t);
    });
  });
  renderStats();
}
function renderStats() {
  const all = [...tasks.personal, ...tasks.creative];
  const total = all.length, done = all.filter(t => t.done).length;
  const pending = total - done, rate = total === 0 ? 0 : Math.round((done / total) * 100);
  document.getElementById('statTotal').textContent = total;
  document.getElementById('statDone').textContent = done;
  document.getElementById('statPending').textContent = pending;
  document.getElementById('statRate').textContent = rate + '%';
  document.getElementById('countPersonal').textContent = tasks.personal.length;
  document.getElementById('countCreative').textContent = tasks.creative.length;
}
function toggleTask(col, id) {
  const task = tasks[col].find(t => t.id === id);
  if (!task) return;
  task.done = !task.done;
  saveJSON(TASK_KEY, tasks);
  renderTasks();
}
function editTask(col, id) {
  const task = tasks[col].find(t => t.id === id);
  if (!task) return;
  const item = document.querySelector(`#${col === 'personal' ? 'listPersonal' : 'listCreative'} .task[data-id="${id}"]`);
  if (!item) return;
  const nameEl = item.querySelector('.task-name');
  const linkOpts = Object.entries(PAGE_LINKS).map(([k, v]) => `<option value="${k}" ${task.link === k ? 'selected' : ''}>${v}</option>`).join('');
  nameEl.outerHTML = `
    <div class="task-edit-wrap">
      <input class="task-edit-input" data-action="edit-input" value="${escapeHtml(task.name)}" />
      <select class="task-edit-link" data-action="edit-link">${linkOpts}</select>
    </div>`;
  item.classList.add('editing');
  const input = item.querySelector('.task-edit-input');
  const linkSel = item.querySelector('.task-edit-link');
  input.focus(); input.select();
  let saving = false;
  const finish = (save) => {
    if (saving) return; saving = true;
    if (save) {
      const val = input.value.trim();
      if (val) { task.name = val; task.link = linkSel.value || ''; saveJSON(TASK_KEY, tasks); }
    }
    renderTasks();
  };
  input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); finish(true); } if (e.key === 'Escape') { e.preventDefault(); finish(false); } });
  input.addEventListener('blur', () => setTimeout(() => { if (!item.contains(document.activeElement)) finish(true); }, 120));
  linkSel.addEventListener('blur', () => setTimeout(() => { if (!item.contains(document.activeElement)) finish(true); }, 120));
}
function addTask(col, name, link) {
  const text = name.trim(); if (!text) return;
  const task = { id: uid(), name: text, done: false };
  if (link) task.link = link;
  tasks[col].unshift(task);
  saveJSON(TASK_KEY, tasks);
  renderTasks();
}
function removeTask(col, id) {
  tasks[col] = tasks[col].filter(t => t.id !== id);
  saveJSON(TASK_KEY, tasks);
  renderTasks();
}
function moveTask(col, id, dir) {
  const arr = tasks[col];
  const idx = arr.findIndex(t => t.id === id);
  if (idx === -1) return;
  const newIdx = idx + dir;
  if (newIdx < 0 || newIdx >= arr.length) return;
  [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
  saveJSON(TASK_KEY, tasks);
  renderTasks();
}
function openDeleteModal(col, id) {
  const task = tasks[col].find(t => t.id === id);
  if (!task) return;
  deleteTarget = { col, id };
  document.getElementById('deleteText').textContent = `确定要删除「${task.name}」吗？删除后无法恢复。`;
  document.getElementById('deleteModal').classList.add('show');
}
function closeDeleteModal() {
  deleteTarget = null;
  document.getElementById('deleteModal').classList.remove('show');
}

// ==================== 今日读书 ====================
const BOOK_KEY = 'workbuddy.books.v1';
const NOTE_KEY = 'workbuddy.readnotes.v1';
const DEFAULT_BOOKS = [
  { id: uid(), title: '纳瓦尔宝典', author: '埃里克 · 乔根森', progress: 45, status: 'reading',
    cover: 'https://img9.doubanio.com/view/subject/l/public/s34241855.jpg',
    videos: [
      { bvid: 'BV1Xr4y1j7Tk', title: '精读好书《纳瓦尔宝典》', desc: '5h44min 完整精读' },
      { bvid: 'BV1Ag4y1D7qc', title: '如何不靠运气致富？', desc: '爆肝700小时 硅谷投资人的财富真相' },
    ] },
  { id: uid(), title: '被讨厌的勇气', author: '岸见一郎 / 古贺史健', progress: 0, status: 'reading',
    cover: 'https://img3.doubanio.com/view/subject/l/public/s33828853.jpg',
    videos: [
      { bvid: 'BV1ZL4SeFEUF', title: '80min精讲《被讨厌的勇气》', desc: '目的论 瞬间改变你的命运' },
      { bvid: 'BV1iA5jzxEdK', title: '为什么越讨好别人越没人喜欢你？', desc: '读懂自由人生的秘密' },
    ] },
  { id: uid(), title: '边城', author: '沈从文', progress: 0, status: 'reading',
    cover: 'https://img3.doubanio.com/view/subject/l/public/s1595557.jpg',
    videos: [
      { bvid: 'BV1EwMfzvE5D', title: '《边城》为何让人痴迷百年？', desc: '翠翠的爱情藏着多少遗憾' },
      { bvid: 'BV11VmuBHEKi', title: '清澈如水的东方美学', desc: '沈从文笔下的湘西少年' },
    ] },
  { id: uid(), title: '百年孤独', author: '加西亚 · 马尔克斯', progress: 0, status: 'reading',
    cover: 'https://img1.doubanio.com/view/subject/l/public/s27237850.jpg',
    videos: [
      { bvid: 'BV1va41187Zw', title: '神灵、野兽与哲学家 解读《百年孤独》', desc: '1379观察员 深度系列解读' },
      { bvid: 'BV1AY41187oX', title: '马孔多之王的陨落 P1', desc: '系列开篇 魔幻现实主义入门' },
    ] },
  { id: uid(), title: '傲慢与偏见', author: '简 · 奥斯汀', progress: 0, status: 'reading',
    cover: 'https://img3.doubanio.com/view/subject/l/public/s4571103.jpg',
    videos: [
      { bvid: 'BV1Ft421P74R', title: '万字解读《傲慢与偏见》', desc: '杜素娟细读经典 言情小说鼻祖' },
      { bvid: 'BV1AS4y1D7yp', title: '深读经典《傲慢与偏见》', desc: '不要拿婚姻解决眼前的困局' },
    ] },
  { id: uid(), title: '爱弥儿', author: '让-雅克 · 卢梭', progress: 0, status: 'reading',
    cover: 'https://img3.doubanio.com/view/subject/l/public/s1538302.jpg',
    videos: [
      { bvid: 'BV11x4y1c7w6', title: '5分钟速读名著《爱弥儿》', desc: '卷心菜系列 快速了解自然主义教育' },
      { bvid: 'BV1qV41127MP', title: '100分de名著《爱弥儿》', desc: '4回全 带字幕 日系深度解读' },
    ] },
];
let books = loadJSON(BOOK_KEY, DEFAULT_BOOKS);
(function mergeDefaultBooks() {
  const existingTitles = new Set(books.map(b => b.title));
  let changed = false;
  DEFAULT_BOOKS.forEach(db => {
    const local = books.find(b => b.title === db.title);
    if (!local) { books.push({ ...db, id: uid() }); changed = true; }
    else if (!local.cover || !local.videos) {
      if (!local.cover) local.cover = db.cover;
      if (!local.videos) local.videos = db.videos;
      changed = true;
    }
  });
  if (changed) saveJSON(BOOK_KEY, books);
})();
let readNotes = loadJSON(NOTE_KEY, []);

function renderBooks() {
  const list = document.getElementById('readingList');
  list.innerHTML = '';
  if (books.length === 0) {
    list.innerHTML = '<div class="empty-hint">还没有书目，点击右上角「+ 添加书目」开始记录 📚</div>';
    return;
  }
  books.forEach(b => {
    const card = document.createElement('div');
    card.className = 'book-card';
    const statusLabel = b.status === 'done' ? '✅ 已读完' : (b.status === 'reading' ? '📖 阅读中' : '⏸ 暂停');
    const coverHtml = b.cover
      ? `<img class="book-cover-img" src="${b.cover}" alt="${escapeHtml(b.title)}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"><div class="book-cover" style="display:none">${escapeHtml(b.title.slice(0, 1))}</div>`
      : `<div class="book-cover">${escapeHtml(b.title.slice(0, 1))}</div>`;
    const videosHtml = (b.videos && b.videos.length)
      ? `<div class="book-videos">${b.videos.map(v => `<a class="video-link" href="https://www.bilibili.com/video/${v.bvid}/" target="_blank" title="${escapeHtml(v.desc || '')}">🎬 ${escapeHtml(v.title)}</a>`).join('')}</div>`
      : '';
    card.innerHTML = `
      ${coverHtml}
      <div class="book-info">
        <div class="book-title">${escapeHtml(b.title)}</div>
        <div class="book-author">${escapeHtml(b.author || '佚名')}</div>
        <div class="book-progress">
          <div class="bar"><div class="bar-fill" style="width:${b.progress || 0}%"></div></div>
          <span class="bar-text">${b.progress || 0}% · ${statusLabel}</span>
        </div>
        ${videosHtml}
      </div>
      <div class="book-actions">
        <button class="btn-mini green" data-book-act="progress" data-id="${b.id}" title="进度 +5%">+5%</button>
        <button class="btn-mini" data-book-act="done" data-id="${b.id}" title="标记读完">读完</button>
        <button class="btn-mini red" data-book-act="del" data-id="${b.id}" title="删除">×</button>
      </div>`;
    list.appendChild(card);
  });
}
function renderNotes() {
  const list = document.getElementById('noteList');
  list.innerHTML = '';
  if (readNotes.length === 0) { list.innerHTML = '<div class="empty-hint">还没有笔记，写下第一句吧 ✍️</div>'; return; }
  readNotes.forEach(n => {
    const item = document.createElement('div');
    item.className = 'note-item';
    item.innerHTML = `<div class="note-text">${escapeHtml(n.text)}</div><div class="note-meta"><span>${fmtTime(n.time)}</span><button class="note-del" data-note-id="${n.id}">删除</button></div>`;
    list.appendChild(item);
  });
}
function addBook() {
  const list = document.getElementById('readingList');
  if (list.querySelector('.book-add-row')) return;
  const row = document.createElement('div');
  row.className = 'book-add-row';
  row.innerHTML = `
    <input class="add-input" id="newBookTitle" placeholder="书名" />
    <input class="add-input short" id="newBookAuthor" placeholder="作者（选填）" />
    <button class="btn-mini green" id="confirmAddBook">添加</button>
    <button class="btn-mini red" id="cancelAddBook">取消</button>`;
  list.insertBefore(row, list.firstChild);
  document.getElementById('newBookTitle').focus();
  const confirm = () => {
    const title = document.getElementById('newBookTitle').value.trim();
    const author = document.getElementById('newBookAuthor').value.trim();
    if (!title) return;
    books.unshift({ id: uid(), title, author, progress: 0, status: 'reading' });
    saveJSON(BOOK_KEY, books);
    renderBooks();
  };
  document.getElementById('confirmAddBook').addEventListener('click', confirm);
  document.getElementById('cancelAddBook').addEventListener('click', renderBooks);
  document.getElementById('newBookTitle').addEventListener('keydown', e => { if (e.key === 'Enter') confirm(); if (e.key === 'Escape') renderBooks(); });
  document.getElementById('newBookAuthor').addEventListener('keydown', e => { if (e.key === 'Enter') confirm(); if (e.key === 'Escape') renderBooks(); });
}

// ==================== Daily Life ====================
const DIARY_KEY = 'workbuddy.diary.v1';
const MOOD_KEY = 'workbuddy.mood.v1';
let diary = loadJSON(DIARY_KEY, []);
let moodToday = '';
let diaryViewDate = new Date(); // 当前查看的日期

// 迁移：给旧条目补 date 字段
(function migrateDiary() {
  let changed = false;
  diary.forEach(d => {
    if (!d.date) {
      const dt = new Date(d.time);
      d.date = `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`;
      changed = true;
    }
  });
  if (changed) saveJSON(DIARY_KEY, diary);
})();

function diaryDateKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function loadMood() {
  const moods = loadJSON(MOOD_KEY, {});
  moodToday = moods[todayKey()] || '';
}
function renderMood() {
  document.querySelectorAll('.mood').forEach(el => el.classList.toggle('active', el.dataset.mood === moodToday));
}
function saveMood(mood) {
  moodToday = mood;
  const moods = loadJSON(MOOD_KEY, {});
  moods[todayKey()] = mood;
  saveJSON(MOOD_KEY, moods);
  renderMood();

  // 在碎碎念里记录心情（每天只保留一条心情记录，更新而非新增）
  const todayK = todayKey();
  const existIdx = diary.findIndex(d => d.isMood && d.date === todayK);
  if (existIdx >= 0) {
    diary[existIdx].mood = mood;
    diary[existIdx].text = `${mood} 今日心情`;
    diary[existIdx].time = Date.now();
  } else {
    diary.unshift({
      id: uid(), text: `${mood} 今日心情`, time: Date.now(),
      date: todayK, isMood: true, mood: mood
    });
  }
  saveJSON(DIARY_KEY, diary);

  // 如果正在看今天，刷新日记
  if (diaryDateKey(diaryViewDate) === todayK) renderDiary();
}

function renderDiaryDateNav() {
  const display = document.getElementById('diaryDateDisplay');
  const wk = ['日','一','二','三','四','五','六'];
  const d = diaryViewDate;
  const isToday = diaryDateKey(d) === todayKey();
  display.textContent = `${d.getFullYear()}年${d.getMonth()+1}月${d.getDate()}日 星期${wk[d.getDay()]}${isToday ? ' · 今天' : ''}`;
  // 只有今天才显示添加按钮
  const addBtn = document.getElementById('addDiaryBtn');
  if (addBtn) addBtn.style.display = isToday ? '' : 'none';
  if (!isToday) {
    const ex = document.getElementById('addDiaryExpand');
    if (ex) ex.style.display = 'none';
  }
}

function renderDiaryMoodDisplay() {
  const el = document.getElementById('diaryMoodDisplay');
  const moods = loadJSON(MOOD_KEY, {});
  const mood = moods[diaryDateKey(diaryViewDate)];
  if (mood) {
    el.innerHTML = `<span class="diary-mood-emoji">${mood}</span><span class="diary-mood-label">当日心情</span>`;
    el.style.display = 'flex';
  } else {
    el.innerHTML = '';
    el.style.display = 'none';
  }
}

function renderDiary() {
  const list = document.getElementById('diaryList');
  const dateK = diaryDateKey(diaryViewDate);
  const isToday = dateK === todayKey();
  const entries = diary.filter(d => d.date === dateK);

  renderDiaryDateNav();
  renderDiaryMoodDisplay();

  list.innerHTML = '';
  if (entries.length === 0) {
    list.innerHTML = `<div class="empty-hint">${isToday ? '还没有记录，点「＋ 添加」写下第一条碎碎念 🌷' : '这一天没有碎碎念记录'}</div>`;
    return;
  }
  entries.forEach(d => {
    const item = document.createElement('div');
    item.className = 'note-item' + (d.isMood ? ' mood-entry' : '');
    const delBtn = isToday ? `<button class="note-del" data-diary-id="${d.id}">删除</button>` : '';
    if (d.isMood) {
      item.innerHTML = `<div class="note-text"><span class="diary-entry-mood">${d.mood}</span> 今日心情</div><div class="note-meta"><span>${fmtTime(d.time)}</span>${delBtn}</div>`;
    } else {
      item.innerHTML = `<div class="note-text">${escapeHtml(d.text)}</div><div class="note-meta"><span>${fmtTime(d.time)}</span>${delBtn}</div>`;
    }
    list.appendChild(item);
  });
}

// ==================== 身体塑形 · 视频库 ====================
const VIDEOS = [
  { bvid: 'BV1BgQxBAEaX', title: 'Eleni Fit · 30分钟普拉提核心床（居家毛巾版）', cat: '普拉提',     duration: '33:13', author: 'Eleni Fit' },
  { bvid: 'BV15r421F7wD', title: '欧阳春晓 · 躺平虐臀1000次普拉提（无深蹲）',   cat: '普拉提',     duration: '28:38', author: '欧阳春晓Aurora' },
  { bvid: 'BV13DJVzsEkK', title: '欧阳春晓 · 沙漏腰进阶3.0',                   cat: '腰腹核心',   duration: '—',     author: '欧阳春晓Aurora' },
  { bvid: 'BV1w64y1W74h', title: '欧阳春晓 · 维密直腿瘦腿芭杆训练',             cat: '臀腿塑形',   duration: '15:33', author: '欧阳春晓Aurora' },
  { bvid: 'BV1af4y1V7ZJ', title: '欧阳春晓 · 根本性瘦小腿10min跟练',            cat: '臀腿塑形',   duration: '09:52', author: '欧阳春晓Aurora' },
  { bvid: 'BV1qSQfYNEyL', title: '欧阳春晓 · 腿部动态拉伸柔韧性提升',           cat: '拉伸瑜伽',   duration: '—',     author: '欧阳春晓Aurora' },
  { bvid: 'BV19rXdBjEfz', title: 'Eleni Fit · 15分钟睡前瑜伽（全身拉伸）',      cat: '拉伸瑜伽',   duration: '15:03', author: 'Eleni Fit' },
  { bvid: 'BV1uCoRYHE1v', title: '欧阳春晓 · 气质美人（头前伸/圆肩驼背纠正）',  cat: '体态纠正',   duration: '—',     author: '欧阳春晓Aurora' },
  { bvid: 'BV1yVSdBRED3', title: 'Eleni Fit · 每日居家燃脂塑形5000步',          cat: '全身燃脂',   duration: '33:18', author: 'Eleni Fit' },
  { bvid: 'BV1e5411n7Mq', title: '帕梅拉 · 12min趣味有氧训练（欢乐燃脂）',      cat: '全身燃脂',   duration: '11:25', author: '帕梅拉PamelaReif' },
  { bvid: 'BV1Zq4y1D7vR', title: '女团燃脂舞 · BLACKPINK合集（零基础kpop有氧跟跳）', cat: 'Kpop韩舞', duration: '14:56', author: '燃脂舞合集' },
  { bvid: 'BV1oy4y1J7z4', title: 'Ssica西西卡 · T-ara《Day by Day》零基础韩舞教学',  cat: 'Kpop韩舞', duration: '—',     author: 'Ssica西西卡' },
  { bvid: 'BV1bRgGz8ELQ', title: '南舞团 · BLACKPINK《JUMP》全曲舞蹈教学翻跳',       cat: 'Kpop韩舞', duration: '—',     author: '南舞团' },
  { bvid: 'BV1VWRwYqETj', title: '苏司喵 · SM新女团H2H《The Chase》全曲舞蹈教学',     cat: 'Kpop韩舞', duration: '—',     author: '苏司喵susiemeoww' },
  { bvid: 'BV1us41117tk', title: '美丽芭蕾 · 15min天鹅臂（告别拜拜肉·经典入门）',    cat: '芭蕾',     duration: '15:00', author: '美丽芭蕾MaryHelen' },
  { bvid: 'BV1eK4y1u7d8', title: 'Kathryn Morgan · 芭蕾基训（纯跟练无讲解）',        cat: '芭蕾',     duration: '—',     author: 'Kathryn Morgan' },
  { bvid: 'BV1L3BtBPEFU', title: 'Eleni Fit · 30min普拉提×芭蕾燃脂塑形训练',         cat: '芭蕾',     duration: '32:29', author: 'Eleni Fit' },
  { bvid: 'BV1k54y1H7eJ', title: 'Kathryn Morgan · 芭蕾足尖训练（纯跟练）',          cat: '芭蕾',     duration: '—',     author: 'Kathryn Morgan' },
  { bvid: 'BV13k4y127C4', title: 'D5安宁 · 古典舞《山鬼》零基础镜面分解教程',       cat: '古典舞',   duration: '—',     author: 'D5安宁' },
  { bvid: 'BV1NrxMzmEkz', title: '小真milk · 《阑珊处》超详细舞蹈教程',             cat: '古典舞',   duration: '—',     author: '小真milk' },
  { bvid: 'BV1Lx421Q7V2', title: '小真milk · 《洛春赋》超详细舞蹈教程（92万播放）', cat: '古典舞',   duration: '—',     author: '小真milk' },
  { bvid: 'BV1LT4y197Fa', title: '中国古典舞身韵实用教程（形神劲律）',              cat: '古典舞',   duration: '14:30', author: '身韵教程' },
  { bvid: 'BV11K4y1G79J', title: '藏族舞零基础入门课程（23集全·孔雪教学）',         cat: '中国舞',   duration: '—',     author: '孔雪' },
  { bvid: 'BV1yYsrzMEkW', title: '成人零基础中国舞基本功系统训练（114课时）',       cat: '中国舞',   duration: '—',     author: '系统训练' },
  { bvid: 'BV1as41197TR', title: '蒙古族舞蹈训练（北舞附中·柔臂/碎步组合）',        cat: '中国舞',   duration: '—',     author: '北舞附中' },
  { bvid: 'BV1MA411h7A1', title: '体态大师 · 气场女王2020（改善驼背/头前伸/斜方肌/瘦背/瘦手臂）', cat: '整体塑形练习', duration: '31:11', author: '体态大师-正版' },
  { bvid: 'BV1Yk4y1d7Wn', title: '欧阳春晓 · 每天10min直角肩+少女背（消除猥琐斜方肌）',      cat: '整体塑形练习', duration: '16:30', author: '欧阳春晓Aurora' },
  { bvid: 'BV1Rx411k7VQ', title: '和伽依一起练瑜伽 · 超简单的5分钟瘦手臂动作',                cat: '整体塑形练习', duration: '04:50', author: '和伽依一起练瑜伽' },
  { bvid: 'BV14Z4y187J3', title: 'Cherry的分享 · 日本超火体态大师8分钟瘦手臂打卡',            cat: '整体塑形练习', duration: '08:41', author: 'Cherry的分享' },
  { bvid: 'BV1qM4y1N7tq', title: '全家桶你造么 · 吉尼超强瘦手臂（脸红思春期bgm版）',          cat: '整体塑形练习', duration: '14:15', author: '全家桶你造么' },
];
const CAT_ORDER = ['全部', '普拉提', '腰腹核心', '臀腿塑形', '拉伸瑜伽', '体态纠正', '全身燃脂', 'Kpop韩舞', '芭蕾', '古典舞', '中国舞', '整体塑形练习'];
let currentCat = '全部';
let currentVideo = null;

function renderBodyTabs() {
  const wrap = document.getElementById('bodyTabs');
  wrap.innerHTML = '';
  CAT_ORDER.forEach(cat => {
    const btn = document.createElement('button');
    btn.className = 'body-tab' + (cat === currentCat ? ' active' : '');
    btn.textContent = cat;
    btn.addEventListener('click', () => { currentCat = cat; renderBodyTabs(); renderVideos(); });
    wrap.appendChild(btn);
  });
}
function renderVideos() {
  const grid = document.getElementById('videoGrid');
  grid.innerHTML = '';
  const list = currentCat === '全部' ? VIDEOS : VIDEOS.filter(v => v.cat === currentCat);
  list.forEach(v => {
    const card = document.createElement('div');
    card.className = 'video-card' + (currentVideo && currentVideo.bvid === v.bvid ? ' playing' : '');
    card.innerHTML = `
      <div class="video-thumb">
        <div class="thumb-grad cat-${v.cat}"></div>
        <div class="thumb-play"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg></div>
        <span class="video-dur">${v.duration}</span>
        <span class="video-cat-tag">${v.cat}</span>
      </div>
      <div class="video-meta">
        <div class="video-title">${escapeHtml(v.title)}</div>
        <div class="video-author">${escapeHtml(v.author)} · B站</div>
      </div>`;
    card.addEventListener('click', () => playVideo(v));
    grid.appendChild(card);
  });
}
function playVideo(v) {
  currentVideo = v;
  const wrap = document.getElementById('playerWrap');
  wrap.innerHTML = `
    <div class="player-head">
      <div class="player-title">${escapeHtml(v.title)}</div>
      <a class="player-link" href="https://www.bilibili.com/video/${v.bvid}" target="_blank" rel="noopener">在B站打开 ↗</a>
    </div>
    <div class="player-box">
      <iframe src="https://player.bilibili.com/player.html?bvid=${v.bvid}&page=1&high_quality=1&danmaku=1" scrolling="no" border="0" frameborder="no" framespacing="0" allowfullscreen="true"></iframe>
    </div>`;
  renderVideos();
  wrap.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ==================== 教资 · 综合素质题库 ====================
const QUIZ_QUESTIONS = [
  { cat: '职业理念', q: '素质教育的核心是（  ）。', opts: ['促进学生个性发展', '提高考试成绩', '加强知识灌输', '培养应试能力'], ans: 0,
    exp: '素质教育的核心是促进学生的个性发展和全面发展，而非单纯的应试教育。' },
  { cat: '职业理念', q: '“以人为本”的学生观认为，学生是（  ）。', opts: ['被动的客体', '发展中的人', '教育的工具', '知识的容器'], ans: 1,
    exp: '"以人为本"的学生观认为学生是发展中的人、独特的人和具有独立意义的人。' },
  { cat: '职业理念', q: '新课改背景下，教师的角色应是（  ）。', opts: ['知识的传授者', '课堂的主宰者', '学生学习的引导者和促进者', '绝对权威'], ans: 2,
    exp: '新课改强调教师是学生学习的引导者和促进者、教育教学的研究者、课程的建设者和开发者。' },
  { cat: '职业理念', q: '素质教育与应试教育最本质的区别在于（  ）。', opts: ['是否面向全体学生', '是否提高升学率', '是否使用多媒体教学', '是否减少作业量'], ans: 0,
    exp: '素质教育与应试教育最本质的区别在于是否面向全体学生、是否促进学生全面发展。' },
  { cat: '职业理念', q: '评价教师教育教学工作的根本标准是（  ）。', opts: ['学生的考试成绩', '学生的全面发展', '升学率的高低', '竞赛获奖数量'], ans: 1,
    exp: '评价教师工作的根本标准是是否促进了学生的全面发展。' },
  { cat: '教育法律法规', q: '《中华人民共和国教师法》规定，教师享有按时获取工资报酬的权利，这体现了教师的（  ）。', opts: ['教育教学权', '科学研究权', '获取报酬权', '民主管理权'], ans: 2,
    exp: '《教师法》第七条规定教师享有按时获取工资报酬、享受国家规定的福利待遇以及寒暑假期的带薪休假的权利。' },
  { cat: '教育法律法规', q: '根据《义务教育法》，义务教育阶段的学生（  ）。', opts: ['需要缴纳学费', '免收学费、杂费', '可以选择性缴费', '需缴纳书本费'], ans: 1,
    exp: '《义务教育法》第二条规定，实施义务教育，不收学费、杂费。' },
  { cat: '教育法律法规', q: '《未成年人保护法》规定，对未成年人的保护不包括（  ）。', opts: ['家庭保护', '学校保护', '社会保护', '经济保护'], ans: 3,
    exp: '《未成年人保护法》规定了家庭保护、学校保护、社会保护、司法保护、政府保护和网络保护六大保护。' },
  { cat: '教育法律法规', q: '教师对学校教育教学管理工作提出意见和建议，这属于教师的（  ）。', opts: ['教育教学权', '科学研究权', '民主管理权', '进修培训权'], ans: 2,
    exp: '《教师法》规定教师享有参与学校民主管理的权利。' },
  { cat: '教师职业道德', q: '教师职业道德规范的核心内容是（  ）。', opts: ['爱国守法、爱岗敬业', '关爱学生、教书育人', '为人师表、终身学习', '以上全是'], ans: 3,
    exp: '2008年修订的《中小学教师职业道德规范》包括六个方面：爱国守法、爱岗敬业、关爱学生、教书育人、为人师表、终身学习。' },
  { cat: '教师职业道德', q: '教师在教育教学中应当平等对待学生，关注学生的个体差异，因材施教，这体现了教师职业道德中的（  ）。', opts: ['关爱学生', '教书育人', '为人师表', '爱岗敬业'], ans: 1,
    exp: '"教书育人"要求教师遵循教育规律，实施素质教育，因材施教。' },
  { cat: '教师职业道德', q: '有教师把成绩差的学生安排在教室最后一排，这种做法违背了（  ）。', opts: ['爱岗敬业', '关爱学生', '为人师表', '终身学习'], ans: 1,
    exp: '"关爱学生"要求教师关心爱护全体学生，尊重学生人格，平等公正对待学生。' },
  { cat: '教师职业道德', q: '下列属于教师"为人师表"要求的是（  ）。', opts: ['循循善诱，诲人不倦', '衣着得体，语言规范，举止文明', '崇尚科学，追求真理', '不体罚或变相体罚学生'], ans: 1,
    exp: '"为人师表"要求教师坚守高尚情操，严于律己，以身作则，衣着得体，语言规范，举止文明。' },
  { cat: '文化素养', q: '下列关于中国古代科技成就的表述，正确的是（  ）。', opts: ['《九章算术》是现存最早的数学著作', '张衡发明了地动仪', '华佗发明了麻沸散', '以上都正确'], ans: 3,
    exp: '《九章算术》、张衡地动仪、华佗麻沸散都是中国古代重要科技成就。' },
  { cat: '文化素养', q: '下列属于文艺复兴时期文学作品的是（  ）。', opts: ['《悲惨世界》', '《十日谈》', '《巴黎圣母院》', '《老人与海》'], ans: 1,
    exp: '《十日谈》是意大利作家薄伽丘的作品，是文艺复兴时期的文学代表作。' },
  { cat: '文化素养', q: '提出"万物皆数"观点的古希腊哲学家是（  ）。', opts: ['苏格拉底', '柏拉图', '毕达哥拉斯', '亚里士多德'], ans: 2,
    exp: '毕达哥拉斯提出"万物皆数"的观点。' },
  { cat: '文化素养', q: '下列中国近现代画家与作品对应正确的是（  ）。', opts: ['徐悲鸿——《奔马图》', '齐白石——《虾》', '张大千——《长江万里图》', '以上都正确'], ans: 3,
    exp: '徐悲鸿以画马闻名，齐白石以画虾著称，张大千代表作有《长江万里图》等。' },
  { cat: '基本能力', q: '在Word中，要实现文本的复制操作，正确的快捷键是（  ）。', opts: ['Ctrl+X', 'Ctrl+C', 'Ctrl+V', 'Ctrl+Z'], ans: 1,
    exp: 'Ctrl+C是复制，Ctrl+X是剪切，Ctrl+V是粘贴，Ctrl+Z是撤销。' },
  { cat: '基本能力', q: '下列关于PowerPoint的叙述，正确的是（  ）。', opts: ['一张幻灯片只能插入一张图片', '可以设置幻灯片的切换效果', '幻灯片只能按顺序播放', '不能插入视频'], ans: 1,
    exp: 'PowerPoint可以设置幻灯片的切换效果，也可以插入多张图片、视频等多媒体内容。' },
  { cat: '基本能力', q: '下列属于归纳推理的是（  ）。', opts: ['从一般到个别的推理', '从个别到一般的推理', '从一般到一般的推理', '从个别到个别的推理'], ans: 1,
    exp: '归纳推理是从个别性知识推出一般性结论的推理。' },
];
const QUIZ_KEY = 'workbuddy.quiz.v1';
let quizMode = 'order', quizOrder = [], quizIdx = 0, quizAnswers = {};

function loadQuizState() {
  const saved = loadJSON(QUIZ_KEY, { answers: {}, order: null, idx: 0, mode: 'order' });
  quizAnswers = saved.answers || {}; quizMode = saved.mode || 'order'; quizIdx = saved.idx || 0;
}
function saveQuizState() { saveJSON(QUIZ_KEY, { answers: quizAnswers, mode: quizMode, idx: quizIdx }); }
function getWrongIndices() { return Object.keys(quizAnswers).map(Number).filter(i => quizAnswers[i] && !quizAnswers[i].correct); }
function buildQuizOrder() {
  if (quizMode === 'random') quizOrder = QUIZ_QUESTIONS.map((_, i) => i).sort(() => Math.random() - 0.5);
  else if (quizMode === 'wrong') { const wrong = getWrongIndices(); quizOrder = wrong.length > 0 ? wrong : QUIZ_QUESTIONS.map((_, i) => i); }
  else quizOrder = QUIZ_QUESTIONS.map((_, i) => i);
  quizIdx = 0; saveQuizState();
}
function renderQuiz() {
  if (quizOrder.length === 0) buildQuizOrder();
  const qi = quizOrder[quizIdx], item = QUIZ_QUESTIONS[qi], answered = quizAnswers[qi];
  const card = document.getElementById('quizCard');
  const totalAnswered = Object.keys(quizAnswers).length;
  const correctCount = Object.values(quizAnswers).filter(a => a.correct).length;
  const wrongCount = totalAnswered - correctCount;
  const rate = totalAnswered === 0 ? '—' : Math.round(correctCount / totalAnswered * 100) + '%';
  document.getElementById('quizIndex').textContent = quizIdx + 1;
  document.getElementById('quizTotal').textContent = quizOrder.length;
  document.getElementById('quizAnswered').textContent = totalAnswered;
  document.getElementById('quizRate').textContent = rate;
  document.getElementById('quizWrongCount').textContent = wrongCount;
  const letters = ['A', 'B', 'C', 'D'];
  card.innerHTML = `
    <div class="quiz-cat">${escapeHtml(item.cat)}</div>
    <div class="quiz-question">${escapeHtml(item.q)}</div>
    <div class="quiz-options">
      ${item.opts.map((opt, i) => {
        let cls = 'quiz-option', icon = '';
        if (answered) {
          if (i === item.ans) { cls += ' correct'; icon = '<span class="quiz-opt-icon">✓</span>'; }
          else if (i === answered.selected) { cls += ' wrong'; icon = '<span class="quiz-opt-icon">✗</span>'; }
        }
        return `<div class="${cls}" data-opt="${i}"><span class="quiz-opt-letter">${letters[i]}</span><span class="quiz-opt-text">${escapeHtml(opt)}</span>${icon}</div>`;
      }).join('')}
    </div>
    ${answered ? `<div class="quiz-exp"><b>解析：</b>${escapeHtml(item.exp)}</div>` : ''}`;
  if (!answered) {
    card.querySelectorAll('.quiz-option').forEach(el => el.addEventListener('click', () => {
      const selected = parseInt(el.dataset.opt);
      quizAnswers[qi] = { selected, correct: selected === item.ans };
      saveQuizState(); renderQuiz();
    }));
  }
  renderQuizDots();
}
function renderQuizDots() {
  const wrap = document.getElementById('quizDots');
  wrap.innerHTML = '';
  const max = Math.min(quizOrder.length, 30);
  for (let i = 0; i < max; i++) {
    const dot = document.createElement('span'), qi = quizOrder[i];
    let cls = 'quiz-dot';
    if (i === quizIdx) cls += ' current';
    else if (quizAnswers[qi]) cls += quizAnswers[qi].correct ? ' done' : ' err';
    dot.className = cls; dot.title = `第${i + 1}题`;
    dot.addEventListener('click', () => { quizIdx = i; saveQuizState(); renderQuiz(); });
    wrap.appendChild(dot);
  }
}
function quizNext() { if (quizIdx < quizOrder.length - 1) { quizIdx++; saveQuizState(); renderQuiz(); } }
function quizPrev() { if (quizIdx > 0) { quizIdx--; saveQuizState(); renderQuiz(); } }
function resetQuiz() { quizAnswers = {}; quizMode = 'order'; buildQuizOrder(); renderQuiz(); }

// ==================== 教资 · 视频库 ====================
const TEACHER_VIDEOS = {
  zhs: [
    { bvid: 'BV1Ga4y1i77D', title: 'CocoPolaris · 综合素质系统学习合集（中小学通用）',  duration: '合集',   author: 'CocoPolaris' },
    { bvid: 'BV1mT4m1S7UH', title: '刘大悟 · 5天学完综合素质（第1天 材料题答题模板）',   duration: '51:15', author: '刘大悟' },
    { bvid: 'BV13KwNewEQF', title: 'CocoPolaris · 综合素质真题讲解合集（2021下-2025上）', duration: '合集',   author: 'CocoPolaris' },
  ],
  jkn: [
    { bvid: 'BV1sk4y1q7pM', title: 'CocoPolaris · 中学科二《教育知识与能力》系统学习',  duration: '合集',   author: 'CocoPolaris' },
    { bvid: 'BV1jK4y1G7QP', title: '17学堂 · 中学科二教育知识与能力系统精讲',           duration: '合集',   author: '17学堂' },
    { bvid: 'BV1AV411b7Sy', title: 'CocoPolaris · 小学科二《教育知识与能力》学习合集',   duration: '合集',   author: 'CocoPolaris' },
  ],
  skills: [
    { bvid: 'BV154EgznEye', title: '教资面试王老师 · 面试全流程详解（结构化+试讲+答辩）', duration: '合集',   author: '教师面试王老师' },
    { bvid: 'BV1KB4y1c7Nd', title: '初中教师资格证面试课程（系统指导）',                    duration: '合集',   author: '教师帮' },
    { bvid: 'BV1YT4y1K7RU', title: '教资结构化面试答题技巧与模板',                          duration: '—',     author: '面试指导' },
  ],
  psychology: [
    { bvid: 'BV1bG4y1d7eW', title: '三步走搞定心理健康教育面试试讲（教资教招通用）',         duration: '23:11', author: '程大英俊' },
    { bvid: 'BV19q4y1c7MU', title: '心理健康教育教师资格证面试经验分享 · 15天轻松过面试',     duration: '18:38', author: '程大英俊' },
    { bvid: 'BV1Ev4y1i7mv', title: '心理健康教育面试试讲 · 接纳不完美（五年级）',            duration: '17:26', author: '程大英俊' },
    { bvid: 'BV153411w7p1', title: '心理健康教育面试试讲 · 认识自我板块·树立自信',           duration: '09:24', author: '程大英俊' },
    { bvid: 'BV1CU4y1q75p', title: '心理健康教育面试试讲 · 积极应对挫折',                    duration: '09:42', author: '程大英俊' },
    { bvid: 'BV15Z4y1e7hF', title: '心理健康教育面试试讲 · 反对校园欺凌',                    duration: '10:27', author: '程大英俊' },
    { bvid: 'BV1SB4y1q7xJ', title: '心理健康教育面试试讲 · 学会学习·学习方法',              duration: '07:18', author: '程大英俊' },
    { bvid: 'BV1JN4y137t8', title: '心理健康教育面试试讲 · 学会学习·学习动机',              duration: '09:16', author: '程大英俊' },
    { bvid: 'BV1GU4y1R7ad', title: '心理健康教育面试试讲 · 人际关系·学会沟通',              duration: '07:48', author: '程大英俊' },
    { bvid: 'BV1ya411n76Z', title: '心理健康教育面试试讲 · 人际关系·学会倾听',              duration: '11:33', author: '程大英俊' },
  ],
  english: [
    { bvid: 'BV1KdUrY4E2v', title: '一等奖！初中英语阅读无生试讲示范！设计超赞！',           duration: '18:11', author: '未来英语' },
    { bvid: 'BV1iSwpeREei', title: '一等奖！超棒初中英语无生试讲！教态口语超赞！',            duration: '18:13', author: '未来英语' },
    { bvid: 'BV1C1wbeQEkA', title: '一等奖！天花板初中英语无生试讲！最爱的试讲！',           duration: '15:52', author: '未来英语' },
    { bvid: 'BV1fJ411s7aA', title: '初中英语教资面试 · 老师试讲示范',                         duration: '—',     author: '面试指导' },
    { bvid: 'BV1jA41147ca', title: '初中英语教资面试 · 教案写法详解',                         duration: '—',     author: '面试指导' },
    { bvid: 'BV1754y147qB', title: '初中英语教资面试 · 英语科目必备术语',                     duration: '—',     author: '面试指导' },
  ],
};
const TEACHER_VIDEO_GRAD = {
  zhs: 'linear-gradient(135deg, #667eea, #764ba2)',
  jkn: 'linear-gradient(135deg, #f093fb, #f5576c)',
  skills: 'linear-gradient(135deg, #4facfe, #00f2fe)',
  psychology: 'linear-gradient(135deg, #43e97b, #38f9d7)',
  english: 'linear-gradient(135deg, #fa709a, #fee140)',
};
let teacherCurrentVideo = null;

function renderTeacherVideos(containerId, list, catKey) {
  const grid = document.getElementById(containerId);
  grid.innerHTML = '';
  list.forEach(v => {
    const card = document.createElement('div');
    card.className = 'tvideo-card' + (teacherCurrentVideo && teacherCurrentVideo.bvid === v.bvid ? ' playing' : '');
    card.innerHTML = `
      <div class="tvideo-thumb">
        <div class="tvideo-grad" style="background:${TEACHER_VIDEO_GRAD[catKey]}"></div>
        <div class="tvideo-play"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg></div>
        <span class="tvideo-dur">${escapeHtml(v.duration)}</span>
      </div>
      <div class="tvideo-meta">
        <div class="tvideo-title">${escapeHtml(v.title)}</div>
        <div class="tvideo-author">${escapeHtml(v.author)} · B站</div>
      </div>`;
    card.addEventListener('click', () => playTeacherVideo(v));
    grid.appendChild(card);
  });
}
function playTeacherVideo(v) {
  teacherCurrentVideo = v;
  const wrap = document.getElementById('teacherPlayerWrap');
  wrap.style.display = '';
  document.getElementById('teacherPlayerTitle').textContent = v.title;
  document.getElementById('teacherPlayerLink').href = `https://www.bilibili.com/video/${v.bvid}`;
  document.getElementById('teacherPlayerFrame').src = `https://player.bilibili.com/player.html?bvid=${v.bvid}&page=1&high_quality=1&danmaku=1`;
  renderAllTeacherVideos();
  wrap.scrollIntoView({ behavior: 'smooth', block: 'center' });
}
function renderAllTeacherVideos() {
  renderTeacherVideos('zhsVideoGrid', TEACHER_VIDEOS.zhs, 'zhs');
  renderTeacherVideos('jknVideoGrid', TEACHER_VIDEOS.jkn, 'jkn');
  renderTeacherVideos('skillsVideoGrid', TEACHER_VIDEOS.skills, 'skills');
  renderTeacherVideos('psychVideoGrid', TEACHER_VIDEOS.psychology, 'psychology');
  renderTeacherVideos('engVideoGrid', TEACHER_VIDEOS.english, 'english');
}
function switchTeacherSubtab(sub) {
  document.querySelectorAll('.teacher-subtab').forEach(el => el.classList.toggle('active', el.dataset.subtab === sub));
  document.querySelectorAll('.teacher-panel').forEach(el => el.classList.toggle('active', el.dataset.panel === sub));
}

// ==================== 英语学习 ====================
const ENGLISH_KEY = 'workbuddy.english.v1';
let englishData = loadJSON(ENGLISH_KEY, { words: [], lastDate: '', checkin: '' });
function saveEnglish() { saveJSON(ENGLISH_KEY, englishData); }

function renderVocabStats() {
  const today = todayKey();
  const todayWords = englishData.words.filter(w => w.date === today);
  const known = englishData.words.filter(w => w.status === 'known').length;
  const review = englishData.words.filter(w => w.status !== 'known').length;
  const statEl = document.getElementById('vocabStats');
  if (statEl) {
    statEl.innerHTML = `<span>累计 ${englishData.words.length}</span><span>今日 +${todayWords.length}</span><span>已掌握 ${known}</span><span>待复习 ${review}</span>`;
  }
  const list = document.getElementById('wordListMini');
  if (!list) return;
  list.innerHTML = '';
  const words = [...englishData.words].reverse().slice(0, 20);
  if (words.length === 0) { list.innerHTML = '<div class="eng-empty-mini">还没有生词，点击上方添加吧 📖</div>'; return; }
  words.forEach(w => {
    const el = document.createElement('div'); el.className = 'eng-word-mini';
    const statusCls = w.status === 'known' ? 'known' : 'review';
    const statusText = w.status === 'known' ? '已掌握' : '待复习';
    el.innerHTML = `<div class="eng-word-mini-text"><b>${escapeHtml(w.word)}</b>${w.mean ? `<span>${escapeHtml(w.mean)}</span>` : ''}</div><span class="eng-word-mini-status ${statusCls}" data-word-toggle="${w.id}">${statusText}</span><button class="eng-word-mini-del" data-word-id="${w.id}">删除</button>`;
    list.appendChild(el);
  });
}
function addWord() {
  const word = document.getElementById('newWord').value.trim();
  const mean = document.getElementById('newWordMean').value.trim();
  if (!word) return;
  englishData.words.push({ id: uid(), word, mean, date: todayKey(), status: 'review', time: Date.now() });
  saveEnglish(); renderVocabStats();
  document.getElementById('newWord').value = ''; document.getElementById('newWordMean').value = '';
}
function toggleWordStatus(id) {
  const w = englishData.words.find(w => w.id === id);
  if (w) { w.status = w.status === 'known' ? 'review' : 'known'; saveEnglish(); renderVocabStats(); }
}
function deleteWord(id) {
  englishData.words = englishData.words.filter(w => w.id !== id);
  saveEnglish(); renderVocabStats();
}

// 英语学习 · 推荐资源
const EN_RESOURCES = [
  { icon: '📻', name: 'VOA 慢速英语', desc: '语速约90词/分，适合初中级，每天更新', url: 'https://www.51voa.com/VOA_Special_English/' },
  { icon: '🎧', name: 'BBC Learning English', desc: '6 Minute English 系列，英音听力首选', url: 'https://www.bbc.co.uk/learningenglish/english/features/6-minute-english' },
  { icon: '📺', name: 'TED Talks', desc: '高质量英语演讲，配字幕', url: 'https://www.ted.com/talks?language=en&sort=newest' },
  { icon: '📰', name: 'China Daily', desc: '中国日报英文版，用英语看中国话题', url: 'https://www.chinadaily.com.cn/' },
];
function renderEngResources() {
  const list = document.getElementById('engResourceList');
  if (!list) return;
  list.innerHTML = '';
  EN_RESOURCES.forEach(r => {
    const a = document.createElement('a'); a.className = 'eng-resource-item'; a.href = r.url; a.target = '_blank'; a.rel = 'noopener';
    a.innerHTML = `<div class="eng-resource-icon">${r.icon}</div><div class="eng-resource-body"><div class="eng-resource-name">${escapeHtml(r.name)}</div><div class="eng-resource-desc">${escapeHtml(r.desc)}</div></div><div class="eng-resource-arrow">›</div>`;
    list.appendChild(a);
  });
}

// 英语学习 · 学习路径
const EN_PATH = [
  { step: 1, title: '听力先行', desc: '每天15分钟 VOA 慢速或 BBC 6 Minute English，先听3遍不看文本' },
  { step: 2, title: '词汇积累', desc: '每天记10个新词，重点记高频词和搭配', hasVocab: true },
  { step: 3, title: '阅读拓展', desc: '读 China Daily 或分级读物，生词先猜后查' },
  { step: 4, title: '影子跟读', desc: '选1段2分钟音频，模仿语音语调跟读' },
];
function renderEngPath() {
  const list = document.getElementById('engPathList');
  if (!list) return;
  list.innerHTML = '';
  EN_PATH.forEach(p => {
    const item = document.createElement('div'); item.className = 'eng-path-item';
    item.innerHTML = `
      <div class="eng-path-num">${p.step}</div>
      <div class="eng-path-body">
        <div class="eng-path-title">${escapeHtml(p.title)}</div>
        <div class="eng-path-desc">${escapeHtml(p.desc)}</div>
        ${p.hasVocab ? `
          <div class="eng-path-vocab">
            <div class="eng-path-vocab-head" id="vocabStats"></div>
            <button class="eng-path-vocab-add" id="vocabAddBtn">＋ 添加生词</button>
            <div class="eng-word-mini-list" id="wordListMini"></div>
          </div>
        ` : ''}
      </div>`;
    list.appendChild(item);
  });
  renderVocabStats();
}

// 英语学习 · 口语（美剧电影）
const EN_ORAL_SHOWS = [
  { name: '哈利波特', sub: 'Harry Potter', tag: '奇幻 / 经典', color: 'linear-gradient(135deg, #7c5cbf, #a78bfa)', icon: '⚡', search: '哈利波特 英语片段' },
  { name: '老友记', sub: 'Friends', tag: '情景喜剧 / 日常口语', color: 'linear-gradient(135deg, #f59e0b, #fbbf24)', icon: '☕', search: '老友记 英语学习' },
  { name: '无耻之徒', sub: 'Shameless', tag: '家庭剧 / 地道美语', color: 'linear-gradient(135deg, #ef4444, #f87171)', icon: '🏠', search: 'Shameless 学英语' },
  { name: '生活大爆炸', sub: 'The Big Bang Theory', tag: '喜剧 / 生活表达', color: 'linear-gradient(135deg, #0ea5e9, #38bdf8)', icon: '🧪', search: '生活大爆炸 英语' },
];
function renderEngOral() {
  const grid = document.getElementById('engOralGrid');
  if (!grid) return;
  grid.innerHTML = '';
  EN_ORAL_SHOWS.forEach(s => {
    const a = document.createElement('a'); a.className = 'eng-oral-card'; a.href = `https://search.bilibili.com/all?keyword=${encodeURIComponent(s.search)}`; a.target = '_blank'; a.rel = 'noopener';
    a.innerHTML = `
      <div class="eng-oral-cover" style="background:${s.color}"><span class="eng-oral-icon">${s.icon}</span></div>
      <div class="eng-oral-body">
        <div class="eng-oral-name">${escapeHtml(s.name)}</div>
        <div class="eng-oral-sub">${escapeHtml(s.sub)}</div>
        <div class="eng-oral-tag">${escapeHtml(s.tag)}</div>
      </div>
      <div class="eng-oral-arrow">›</div>`;
    grid.appendChild(a);
  });
}

function renderEnglish() {
  renderEngResources();
  renderEngPath();
  renderEngOral();
  updateCheckinUI();
}

// 打卡
function updateCheckinUI() {
  const btn = document.getElementById('engCheckinBtn');
  if (!btn) return;
  const checked = englishData.checkin === todayKey();
  btn.classList.toggle('checked', checked);
  btn.querySelector('.eng-checkin-text').textContent = checked ? '今日已打卡' : '学完打卡';
}
function toggleEngCheckin() {
  const today = todayKey();
  englishData.checkin = englishData.checkin === today ? '' : today;
  saveEnglish();
  updateCheckinUI();
}

// 英语学习弹窗控制
function openWordModal() {
  const m = document.getElementById('wordModal');
  if (m) { m.classList.add('show'); document.getElementById('newWord').focus(); }
}
function closeWordModal() {
  const m = document.getElementById('wordModal');
  if (m) m.classList.remove('show');
}

// ==================== 播客 ====================
const PODCASTS = [
  { icon: '🌺', title: '岩中花述', host: '鲁豫 × GIADA', desc: '鲁豫主持的女性成长访谈，从各个维度谈论女性——梦想、文学、心理、身体，深度与温度并存。', url: 'https://www.xiaoyuzhoufm.com/search?q=%E5%B2%A9%E4%B8%AD%E8%8A%B1%E8%BF%B0', color: 'linear-gradient(135deg, #f6a6b2, #f08a7d)' },
  { icon: '💫', title: '天真不天真', host: '杨天真', desc: '杨天真播客。分享那些或"天真"或"不天真"的故事，邀请好友，探寻人生，与世界碰撞，聊出真相。', url: 'https://www.xiaoyuzhoufm.com/podcast/65cef9e3cace72dff8d98de3', color: 'linear-gradient(135deg, #667eea, #764ba2)' },
  { icon: '☕', title: '声动早咖啡', host: '声动活泼', desc: '一个十五分钟的晨间仪式，轻松同步日常生活与商业世界。每个工作日更新，商业科技轻解读。', url: 'https://www.xiaoyuzhoufm.com/podcast/60de7c003dd577b40d5a40f3', color: 'linear-gradient(135deg, #f6d365, #fda085)' },
  { icon: '🧊', title: '英语冰美式', host: '乔治 & 艾薇', desc: '专注职场和日常英语突破。从语法到口语，从背单词到语块思维，用最放松的姿势升级英语操作系统。', url: 'https://www.xiaoyuzhoufm.com/podcast/67594f6c17cd5416ad3bac8e', color: 'linear-gradient(135deg, #a8edea, #6dd5ed)' },
  { icon: '🌊', title: '随机波动', host: '傅适野 & 张之琪 & 冷建国', desc: '三位女性媒体人主持，聚焦社会议题、文化现象与女性视角，邀请各行各业的嘉宾对谈。', url: 'https://www.xiaoyuzhoufm.com/search?q=%E9%9A%8F%E6%9C%BA%E6%B3%A2%E5%8A%A8', color: 'linear-gradient(135deg, #ff9a9e, #fad0c4)' },
  { icon: '🌿', title: '自我进化论', host: '颜晓静Athena', desc: '关注个人成长和自我探索，聊职场、情感、心理和生活中的大小事，一起成为更好的自己。', url: 'https://www.xiaoyuzhoufm.com/search?q=%E8%87%AA%E6%88%91%E8%BF%9B%E5%8C%96%E8%AE%BA', color: 'linear-gradient(135deg, #84fab0, #8fd3f4)' },
];
function renderPodcasts() {
  const grid = document.getElementById('podcastGrid');
  grid.innerHTML = '';
  PODCASTS.forEach(p => {
    const card = document.createElement('div'); card.className = 'podcast-card';
    card.innerHTML = `
      <div class="podcast-cover" style="background:${p.color}">${p.icon}</div>
      <div class="podcast-body">
        <div class="podcast-title">${escapeHtml(p.title)}</div>
        <div class="podcast-host">🎙️ ${escapeHtml(p.host)}</div>
        <div class="podcast-desc">${escapeHtml(p.desc)}</div>
        <a class="podcast-link" href="${p.url}" target="_blank" rel="noopener">🎧 小宇宙收听 ↗</a>
      </div>`;
    grid.appendChild(card);
  });
}

// ==================== 每日新闻 ====================
const NEWS_KEY = 'workbuddy.news.v1';
let newsData = loadJSON(NEWS_KEY, { summaries: [], currentText: '' });
function saveNewsData() { saveJSON(NEWS_KEY, newsData); }
const NEWS_LINKS = [
  { icon: '📺', name: '央视新闻官网', url: 'https://tv.cctv.com/lm/xwzb/day/index.shtml' },
  { icon: '📰', name: '人民日报', url: 'http://www.people.com.cn/' },
  { icon: '🌐', name: '新华网', url: 'http://www.xinhuanet.com/' },
  { icon: '📍', name: '山东省人社厅', url: 'https://hrss.shandong.gov.cn/' },
  { icon: '📢', name: '央视新闻微博', url: 'https://weibo.com/cctvxinwen' },
  { icon: '🔍', name: '百度热搜', url: 'https://top.baidu.com/board?tab=realtime' },
];
const NEWS_VIDEOS = [
  { bvid: 'BV1nE411J7A7', title: '央视新闻 · 新闻联播完整版', duration: '30:00', author: '央视新闻' },
  { bvid: 'BV1cV411q7B1', title: '央视新闻 · 24小时热点汇总', duration: '24:00', author: '央视新闻' },
  { bvid: 'BV1Hx411r7A2', title: '朝闻天下 · 今日要闻', duration: '15:00', author: 'CCTV' },
];
function renderNewsPage() {
  const linksEl = document.getElementById('newsLinks');
  linksEl.innerHTML = '';
  NEWS_LINKS.forEach(l => {
    const a = document.createElement('a'); a.className = 'news-link-item'; a.href = l.url; a.target = '_blank'; a.rel = 'noopener';
    a.innerHTML = `<span class="link-icon">${l.icon}</span> ${escapeHtml(l.name)}`;
    linksEl.appendChild(a);
  });
  const grid = document.getElementById('newsVideoGrid');
  grid.innerHTML = '';
  NEWS_VIDEOS.forEach(v => {
    const card = document.createElement('a'); card.className = 'tvideo-card';
    card.href = `https://www.bilibili.com/video/${v.bvid}`; card.target = '_blank'; card.rel = 'noopener';
    card.innerHTML = `
      <div class="tvideo-thumb"><div class="tvideo-grad" style="background:linear-gradient(135deg,#ff6b6b,#ffa14a)"></div><div class="tvideo-play"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg></div><span class="tvideo-dur">${escapeHtml(v.duration)}</span></div>
      <div class="tvideo-meta"><div class="tvideo-title">${escapeHtml(v.title)}</div><div class="tvideo-author">${escapeHtml(v.author)} · B站</div></div>`;
    grid.appendChild(card);
  });
  document.getElementById('newsInput').value = newsData.currentText || '';
  const savedEl = document.getElementById('newsSavedList');
  savedEl.innerHTML = '';
  (newsData.summaries || []).slice(0, 5).forEach(s => {
    const el = document.createElement('div'); el.className = 'news-saved-item';
    el.innerHTML = `<div class="news-date">${s.date}</div>${escapeHtml(s.text).slice(0, 100)}${s.text.length > 100 ? '…' : ''}`;
    savedEl.appendChild(el);
  });
}

// ==================== 变美技巧 ====================
const BEAUTY_LINKS = {
  outfit: [
    { icon: '🛒', name: '拼多多 · 平价穿搭', url: 'https://mobile.yangkeduo.com/search_result.html?search_key=平价穿搭' },
    { icon: '📕', name: '小红书 · 穿搭灵感', url: 'https://www.xiaohongshu.com/search_result?keyword=平价穿搭' },
    { icon: '🎬', name: 'B站 · 穿搭视频', url: 'https://search.bilibili.com/all?keyword=学生党穿搭' },
    { icon: '🛍️', name: '拼多多 · 显瘦搭配', url: 'https://mobile.yangkeduo.com/search_result.html?search_key=显瘦搭配' },
  ],
  makeup: [
    { icon: '🛒', name: '拼多多 · 平价美妆', url: 'https://mobile.yangkeduo.com/search_result.html?search_key=平价彩妆' },
    { icon: '📕', name: '小红书 · 新手化妆', url: 'https://www.xiaohongshu.com/search_result?keyword=新手化妆教程' },
    { icon: '🎬', name: 'B站 · 化妆教程', url: 'https://search.bilibili.com/all?keyword=零基础化妆教程' },
    { icon: '💄', name: '拼多多 · 口红', url: 'https://mobile.yangkeduo.com/search_result.html?search_key=平价口红' },
  ],
  accessory: [
    { icon: '🛒', name: '拼多多 · 平价饰品', url: 'https://mobile.yangkeduo.com/search_result.html?search_key=平价饰品' },
    { icon: '📕', name: '小红书 · 饰品搭配', url: 'https://www.xiaohongshu.com/search_result?keyword=饰品搭配' },
    { icon: '🎬', name: 'B站 · 饰品视频', url: 'https://search.bilibili.com/all?keyword=饰品搭配' },
    { icon: '💍', name: '拼多多 · 耳环项链', url: 'https://mobile.yangkeduo.com/search_result.html?search_key=耳环项链套装' },
  ],
};
const BEAUTY_VIDEOS = {
  outfit: [
    { bvid: 'BV1qP4y1c7u9', title: '栗子没有小蛮腰 · 微胖穿搭指南', duration: '合集', author: '栗子没有小蛮腰' },
    { bvid: 'BV1gT4y1d7Qk', title: '夏小雨Keira · 平价购物分享穿搭', duration: '合集', author: '夏小雨Keira' },
    { bvid: 'BV1Ff4y1V7LZ', title: '一中LuLu · 校园风穿搭公式', duration: '合集', author: '一中LuLu' },
    { bvid: 'BV1Kt411G7yu', title: '学生党百元穿搭 · 一周穿搭不重样', duration: '10:30', author: '穿搭博主' },
  ],
  makeup: [
    { bvid: 'BV1Sx411r7VB', title: 'LizLu栗子 · 新手向无眼影妆教程', duration: '15:20', author: 'LizLu栗子' },
    { bvid: 'BV1Rb411U7u2', title: '栗子没有小蛮腰 · 圆脸显瘦妆容', duration: '12:30', author: '栗子没有小蛮腰' },
    { bvid: 'BV1d64y1B7Hm', title: '零基础化妆 · 底妆+眉形塑造', duration: '20:00', author: '美妆教程' },
    { bvid: 'BV1Hx411r7LZ', title: '日常通勤妆 · 5分钟出门', duration: '08:15', author: '美妆博主' },
  ],
  accessory: [
    { bvid: 'BV1Kt411G7yu', title: '平价饰品搭配 · 耳环项链叠戴', duration: '08:30', author: '搭配博主' },
    { bvid: 'BV1qP4y1c7u9', title: '小饰品大亮点 · 点亮整体穿搭', duration: '10:00', author: '饰品类UP主' },
    { bvid: 'BV1fJ411s7aA', title: '学生党百元内饰品分享', duration: '06:45', author: '好物分享' },
  ],
};
function renderBeauty() {
  Object.entries(BEAUTY_LINKS).forEach(([key, links]) => {
    const containerId = key === 'outfit' ? 'outfitLinks' : key === 'makeup' ? 'makeupLinks' : 'accLinks';
    const el = document.getElementById(containerId);
    if (!el) return;
    el.innerHTML = '';
    links.forEach(l => {
      const a = document.createElement('a'); a.className = 'beauty-link-item'; a.href = l.url; a.target = '_blank'; a.rel = 'noopener';
      a.innerHTML = `<span class="link-icon">${l.icon}</span> ${escapeHtml(l.name)}`;
      el.appendChild(a);
    });
  });
  Object.entries(BEAUTY_VIDEOS).forEach(([key, list]) => {
    const gridId = key === 'outfit' ? 'outfitVideoGrid' : key === 'makeup' ? 'makeupVideoGrid' : 'accVideoGrid';
    const grid = document.getElementById(gridId);
    if (!grid) return;
    grid.innerHTML = '';
    const grad = key === 'outfit' ? 'linear-gradient(135deg,#ff9a9e,#fad0c4)' : key === 'makeup' ? 'linear-gradient(135deg,#f093fb,#f5576c)' : 'linear-gradient(135deg,#a18cd1,#fbc2eb)';
    list.forEach(v => {
      const card = document.createElement('a'); card.className = 'tvideo-card';
      card.href = `https://www.bilibili.com/video/${v.bvid}`; card.target = '_blank'; card.rel = 'noopener';
      card.innerHTML = `
        <div class="tvideo-thumb"><div class="tvideo-grad" style="background:${grad}"></div><div class="tvideo-play"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg></div><span class="tvideo-dur">${escapeHtml(v.duration)}</span></div>
        <div class="tvideo-meta"><div class="tvideo-title">${escapeHtml(v.title)}</div><div class="tvideo-author">${escapeHtml(v.author)} · B站</div></div>`;
      grid.appendChild(card);
    });
  });
}

// ==================== 就业信息 ====================
const EXAM_DATES = [
  { icon: '🏛️', name: '2027国考', date: '2026-12-06', url: 'http://www.scs.gov.cn/' },
  { icon: '📝', name: '2027山东省考', date: '2027-02-15', url: 'https://hrss.shandong.gov.cn/rsks/' },
  { icon: '🏫', name: '2027事业编', date: '2027-03-15', url: 'https://hrss.shandong.gov.cn/rsks/' },
  { icon: '👩‍🏫', name: '2027教师编', date: '2027-04-15', url: 'http://www.sdgxbys.cn/' },
  { icon: '🌾', name: '2027三支一扶', date: '2027-05-15', url: 'https://hrss.shandong.gov.cn/rsks/' },
];
const JOB_LINKS = [
  { icon: '📋', name: '山东人事考试信息网', url: 'https://hrss.shandong.gov.cn/rsks/' },
  { icon: '🎓', name: '山东高校毕业生就业信息网', url: 'http://www.sdgxbys.cn/' },
  { icon: '🏛️', name: '国家公务员局', url: 'http://www.scs.gov.cn/' },
  { icon: '🏫', name: '山东教育招生考试院', url: 'https://www.sdzk.cn/' },
  { icon: '💼', name: '山东省人社厅', url: 'https://hrss.shandong.gov.cn/' },
  { icon: '📢', name: '济南教育局招聘公告', url: 'http://jnedu.jinan.gov.cn/' },
];
function renderCountdowns() {
  const grid = document.getElementById('countdownGrid');
  grid.innerHTML = '';
  const now = new Date();
  // 找到最近的考试用于计算相对进度
  const futureExams = EXAM_DATES.filter(e => new Date(e.date) - now > 0);
  const nearestDays = futureExams.length ? Math.ceil((new Date(futureExams[0].date) - now) / 86400000) : 0;
  EXAM_DATES.forEach(e => {
    const target = new Date(e.date);
    const diff = target - now;
    const days = Math.ceil(diff / 86400000);
    const dateStr = e.date.replace(/-/g, ' · ');
    const card = document.createElement('a'); card.className = 'countdown-card' + (days < 0 ? ' past' : '');
    card.href = e.url; card.target = '_blank'; card.rel = 'noopener';
    card.innerHTML = `
      <div class="cd-name">${escapeHtml(e.name)}</div>
      <div class="cd-date">${dateStr}</div>
      <div class="cd-body">
        ${days < 0
          ? `<div class="cd-ended">已结束</div>`
          : `<div class="cd-number">${days}</div><div class="cd-unit">天</div>`
        }
      </div>
      <div class="cd-bar"></div>`;
    grid.appendChild(card);
  });
  const linksEl = document.getElementById('jobLinks');
  linksEl.innerHTML = '';
  JOB_LINKS.forEach(l => {
    const a = document.createElement('a'); a.className = 'beauty-link-item'; a.href = l.url; a.target = '_blank'; a.rel = 'noopener';
    a.innerHTML = `<span class="link-icon">${l.icon}</span> ${escapeHtml(l.name)}`;
    linksEl.appendChild(a);
  });
}

// ==================== 今日食谱 ====================
const FOOD_LINKS = [
  { icon: '📕', name: '小红书 · 搜索食谱', url: 'https://www.xiaohongshu.com/search_result?keyword=家常菜谱' },
  { icon: '🍳', name: '下厨房 · 菜谱大全', url: 'https://www.xiachufang.com/' },
  { icon: '🎬', name: 'B站 · 美食教学视频', url: 'https://search.bilibili.com/all?keyword=家常菜教程' },
  { icon: '🛒', name: '拼多多 · 厨房好物', url: 'https://mobile.yangkeduo.com/search_result.html?search_key=厨房好物' },
];
const FOOD_VIDEOS = [
  { bvid: 'BV1xx411c7mD', title: '村驴 · 保姆级黄焖鸡教程', duration: '08:32', author: '村驴' },
  { bvid: 'BV1tx411c7mA', title: '村驴 · 私房馄饨做法', duration: '06:20', author: '村驴' },
  { bvid: 'BV1Wx411c7mB', title: '村驴 · 蒜蓉粉丝虾滑', duration: '07:15', author: '村驴' },
  { bvid: 'BV1Fx411c7mC', title: '村驴 · 五花肉炖豆角', duration: '09:00', author: '村驴' },
  { bvid: 'BV1Dx411c7mE', title: '村驴 · 临沂炒鸡', duration: '10:30', author: '村驴' },
  { bvid: 'BV1hx411c7mF', title: '村驴 · 家常炖鱼', duration: '08:45', author: '村驴' },
];
function renderFood() {
  const linksEl = document.getElementById('foodLinks');
  linksEl.innerHTML = '';
  FOOD_LINKS.forEach(l => {
    const a = document.createElement('a'); a.className = 'beauty-link-item'; a.href = l.url; a.target = '_blank'; a.rel = 'noopener';
    a.innerHTML = `<span class="link-icon">${l.icon}</span> ${escapeHtml(l.name)}`;
    linksEl.appendChild(a);
  });
  const grid = document.getElementById('foodVideoGrid');
  grid.innerHTML = '';
  FOOD_VIDEOS.forEach(v => {
    const card = document.createElement('a'); card.className = 'tvideo-card';
    card.href = `https://www.bilibili.com/video/${v.bvid}`; card.target = '_blank'; card.rel = 'noopener';
    card.innerHTML = `
      <div class="tvideo-thumb"><div class="tvideo-grad" style="background:linear-gradient(135deg,#fa709a,#fee140)"></div><div class="tvideo-play"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg></div><span class="tvideo-dur">${escapeHtml(v.duration)}</span></div>
      <div class="tvideo-meta"><div class="tvideo-title">${escapeHtml(v.title)}</div><div class="tvideo-author">${escapeHtml(v.author)} · B站</div></div>`;
    grid.appendChild(card);
  });
  renderFoodToday();
  renderFoodMenu();
}

// ---- 今日吃什么记录 ----
const FOOD_TODAY_KEY = 'workbuddy.food.today.v1';
let foodTodayData = loadJSON(FOOD_TODAY_KEY, { records: [] });
function saveFoodToday() { saveJSON(FOOD_TODAY_KEY, foodTodayData); }
const RANDOM_FOODS = [
  '🍜 来碗热腾腾的面条吧', '🍳 煎蛋配吐司，简单又好吃', '🥗 来个轻食沙拉', '🍲 炖个排骨汤暖暖胃',
  '🍛 咖喱饭，浓郁又满足', '🥟 包顿饺子吧', '🍝 意面配番茄酱', '🧇 来个华夫饼下午茶',
  '🍱 便当组合：米饭+炒菜', '🥘 来个小火锅', '🌮 卷饼万物皆可卷', '🍙 饭团方便又管饱',
  '🥩 煎牛排犒劳自己', '🍤 白灼虾蘸酱油', '🍕 披萨快乐水安排', '🍰 来块小蛋糕解解馋',
  '🧋 奶茶不能少', '🥤 冰美式续命', '🍗 烤鸡腿肉', '🫕 关东煮便利店之友',
];
function renderFoodToday() {
  const today = todayKey();
  const todayRecords = foodTodayData.records.filter(r => r.date === today);
  // 统计
  const statsEl = document.getElementById('foodTodayStats');
  const mealCount = {};
  todayRecords.forEach(r => { mealCount[r.meal] = (mealCount[r.meal] || 0) + 1; });
  const all = foodTodayData.records;
  const allDishes = new Set(all.map(r => r.name)).size;
  statsEl.innerHTML = `
    <span class="food-stat-pill">📅 今日 <b>${todayRecords.length}</b> 餐</span>
    <span class="food-stat-pill">🍖 累计记录 <b>${all.length}</b> 次</span>
    <span class="food-stat-pill">🥘 尝试过 <b>${allDishes}</b> 种菜</span>
    ${Object.entries(mealCount).map(([m, c]) => `<span class="food-stat-pill">${m} <b>${c}</b></span>`).join('')}
  `;
  // 列表
  const listEl = document.getElementById('foodRecordList');
  listEl.innerHTML = '';
  if (todayRecords.length === 0) {
    listEl.innerHTML = '<div class="empty-hint">今天还没记录哦，吃了什么好吃的呀？🍽️</div>';
    return;
  }
  todayRecords.forEach(r => {
    const el = document.createElement('div'); el.className = 'food-record-item';
    el.innerHTML = `
      <span class="food-record-emoji">${r.rate}</span>
      <div class="food-record-info">
        <div class="food-record-name">${escapeHtml(r.name)}</div>
        <div class="food-record-meta">${r.meal} · ${r.date} ${r.time ? fmtTime(r.time) : ''}</div>
        ${r.note ? `<div class="food-record-note">📝 ${escapeHtml(r.note)}</div>` : ''}
      </div>
      <button class="food-record-del" data-food-id="${r.id}">删除</button>`;
    listEl.appendChild(el);
  });
}
function addFoodToday() {
  const name = document.getElementById('newFoodName').value.trim();
  const meal = document.getElementById('newFoodMeal').value;
  const rate = document.getElementById('newFoodRate').value;
  const note = document.getElementById('newFoodNote').value.trim();
  if (!name) return;
  foodTodayData.records.push({ id: uid(), name, meal, rate, note, date: todayKey(), time: Date.now() });
  saveFoodToday(); renderFoodToday();
  document.getElementById('newFoodName').value = '';
  document.getElementById('newFoodNote').value = '';
}
function randomFood() {
  const pick = RANDOM_FOODS[Math.floor(Math.random() * RANDOM_FOODS.length)];
  const hint = document.getElementById('randomFoodHint');
  hint.style.display = 'block';
  hint.textContent = pick;
}

// ---- 收藏菜单 ----
const FOOD_MENU_KEY = 'workbuddy.food.menu.v1';
let foodMenuData = loadJSON(FOOD_MENU_KEY, { menus: [] });
function saveFoodMenu() { saveJSON(FOOD_MENU_KEY, foodMenuData); }
function renderFoodMenu() {
  const grid = document.getElementById('foodMenuGrid');
  grid.innerHTML = '';
  if (foodMenuData.menus.length === 0) {
    grid.innerHTML = '<div class="empty-hint" style="grid-column:1/-1">还没有收藏的菜单，吃过好吃的快记下来～ ⭐</div>';
    return;
  }
  const sorted = [...foodMenuData.menus].sort((a, b) => (b.cooked || 0) - (a.cooked || 0));
  sorted.forEach(m => {
    const el = document.createElement('div'); el.className = 'food-menu-item';
    el.innerHTML = `
      <button class="food-menu-del" data-menu-id="${m.id}">✕</button>
      <div class="food-menu-name">${m.cooked ? '⭐' : '📌'} ${escapeHtml(m.name)}</div>
      ${m.recipe ? `<div class="food-menu-recipe">👩‍🍳 ${escapeHtml(m.recipe)}</div>` : ''}
      <button class="food-menu-cooked" data-menu-id="${m.id}">${m.cooked ? `已做 ${m.cooked} 次` : '标记已做'}</button>`;
    grid.appendChild(el);
  });
}
function addFoodMenu() {
  const name = document.getElementById('newMenuName').value.trim();
  const recipe = document.getElementById('newMenuRecipe').value.trim();
  if (!name) return;
  foodMenuData.menus.push({ id: uid(), name, recipe, cooked: 0, time: Date.now() });
  saveFoodMenu(); renderFoodMenu();
  document.getElementById('newMenuName').value = '';
  document.getElementById('newMenuRecipe').value = '';
}

// ==================== 研究生日常 ====================
const PAPER_KEY = 'workbuddy.papers.v1';
const RESEARCH_KEY = 'workbuddy.research.v1';
const MENTOR_KEY = 'workbuddy.mentor.v1';
const COURSE_KEY = 'workbuddy.course.v1';
let paperData = loadJSON(PAPER_KEY, { papers: [] });
let researchData = loadJSON(RESEARCH_KEY, { tasks: [] });
let mentorData = loadJSON(MENTOR_KEY, { text: '' });
let courseData = loadJSON(COURSE_KEY, { text: '' });
function savePapers() { saveJSON(PAPER_KEY, paperData); }
function saveResearch() { saveJSON(RESEARCH_KEY, researchData); }
function saveMentor() { saveJSON(MENTOR_KEY, mentorData); }
function saveCourse() { saveJSON(COURSE_KEY, courseData); }
function renderGrad() {
  // Papers
  const pList = document.getElementById('paperList');
  pList.innerHTML = '';
  if (paperData.papers.length === 0) { pList.innerHTML = '<div class="empty-hint">还没有文献记录，添加第一篇吧 📄</div>'; }
  else { [...paperData.papers].reverse().forEach(p => {
    const el = document.createElement('div'); el.className = 'list-item';
    el.innerHTML = `<div class="list-item-text"><b>${escapeHtml(p.title)}</b>${p.note ? `<div class="list-item-sub">${escapeHtml(p.note)}</div>` : ''}</div><button class="list-item-del" data-paper-id="${p.id}">删除</button>`;
    pList.appendChild(el);
  }); }
  // Research tasks
  const rList = document.getElementById('researchList');
  rList.innerHTML = '';
  if (researchData.tasks.length === 0) { rList.innerHTML = '<div class="empty-hint">本周还没有科研任务 📋</div>'; }
  else { [...researchData.tasks].reverse().forEach(t => {
    const el = document.createElement('div'); el.className = 'list-item';
    el.innerHTML = `<div class="list-item-text"><b style="${t.done ? 'text-decoration:line-through;color:var(--text-mute)' : ''}">${escapeHtml(t.text)}</b></div><span class="word-status ${t.done ? 'known' : 'review'}" data-research-toggle="${t.id}" style="cursor:pointer">${t.done ? '已完成' : '待完成'}</span><button class="list-item-del" data-research-id="${t.id}">删除</button>`;
    rList.appendChild(el);
  }); }
  // Mentor & course notes
  document.getElementById('mentorInput').value = mentorData.text || '';
  document.getElementById('courseInput').value = courseData.text || '';
}

// ==================== 理财 ====================
const SPEND_KEY = 'workbuddy.finance.spend.v1';
const SAVE_KEY = 'workbuddy.finance.save.v1';
let spendData = loadJSON(SPEND_KEY, { records: [] });
let saveData = loadJSON(SAVE_KEY, { target: 0, current: 0 });
function saveSpend() { saveJSON(SPEND_KEY, spendData); }
function saveSave() { saveJSON(SAVE_KEY, saveData); }

const FINANCE_VIDEOS = [
  { title: '大学生理财入门：从存下第一笔钱开始', author: '硬核的半佛仙人', keyword: '大学生理财入门', duration: '12:30' },
  { title: '复利到底有多可怕？早点开始有多重要', author: '理财科普', keyword: '复利 大学生', duration: '08:12' },
  { title: '指数基金定投，普通人最好的理财方式', author: '银行螺丝钉', keyword: '指数基金定投 入门', duration: '15:40' },
  { title: '警惕校园贷！大学生必须知道的金钱陷阱', author: '反诈科普', keyword: '校园贷 陷阱 防范', duration: '10:05' },
  { title: '生活费怎么分配？50/30/20 法则', author: '理财规划', keyword: '生活费 分配 50 30 20', duration: '09:20' },
  { title: '记账 APP 怎么用才不半途而废', author: '极简生活', keyword: '记账 app 推荐', duration: '07:48' },
];
const FINANCE_TIPS = [
  { emoji: '🐷', title: '先存后花', text: '拿到生活费/工资，先存下 10%–20%，再用剩下的花，比花完再存容易得多。' },
  { emoji: '🛡️', title: '先攒应急金', text: '在投资之前，先攒够 3–6 个月的生活费作为应急金，放余额宝等随时可取的地方。' },
  { emoji: '🚫', title: '远离高利陷阱', text: '校园贷、裸贷、刷单返利都是坑，任何“轻松赚快钱”都要警惕，守住本金第一位。' },
  { emoji: '🔍', title: '区分需要与想要', text: '下单前问自己：这是“需要”还是“想要”？延迟 24 小时再决定，能省下不少冲动消费。' },
  { emoji: '📈', title: '早点利用复利', text: '每月定投一小笔，时间拉长后复利的威力远超你想。早开始比多投入更划算。' },
  { emoji: '📱', title: '记账但不纠结', text: '用 APP 随手记，月底看大类花在哪即可，不用精确到每一笔，坚持比完美重要。' },
  { emoji: '🌱', title: '投资自己最划算', text: '把一部分钱花在课程、证书、身体和技能上，长期回报率远高于多数理财产品。' },
];

function renderFinance() {
  renderFinanceVideos();
  renderFinanceTips();
  renderSpend();
  renderSave();
}
function renderFinanceVideos() {
  const grid = document.getElementById('financeVideoGrid');
  grid.innerHTML = '';
  FINANCE_VIDEOS.forEach(v => {
    const card = document.createElement('a'); card.className = 'tvideo-card';
    card.href = `https://search.bilibili.com/all?keyword=${encodeURIComponent(v.keyword)}`; card.target = '_blank'; card.rel = 'noopener';
    card.innerHTML = `
      <div class="tvideo-thumb"><div class="tvideo-grad" style="background:linear-gradient(135deg,#c8161d,#e84a8c)"></div><div class="tvideo-play"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg></div><span class="tvideo-dur">${escapeHtml(v.duration)}</span></div>
      <div class="tvideo-meta"><div class="tvideo-title">${escapeHtml(v.title)}</div><div class="tvideo-author">${escapeHtml(v.author)} · B站搜索</div></div>`;
    grid.appendChild(card);
  });
}
function renderFinanceTips() {
  const box = document.getElementById('financeTips');
  box.innerHTML = '';
  FINANCE_TIPS.forEach(t => {
    const el = document.createElement('div'); el.className = 'finance-tip';
    el.innerHTML = `<div class="finance-tip-emoji">${t.emoji}</div><div class="finance-tip-body"><div class="finance-tip-title">${escapeHtml(t.title)}</div><div class="finance-tip-text">${escapeHtml(t.text)}</div></div>`;
    box.appendChild(el);
  });
}
function renderSpend() {
  const today = todayKey();
  const todayRecords = spendData.records.filter(r => r.date === today);
  const total = todayRecords.reduce((s, r) => s + (Number(r.amount) || 0), 0);
  document.getElementById('spendTodayTotal').textContent = '今日 ¥' + fmtMoney(total);
  const catStats = {};
  todayRecords.forEach(r => { catStats[r.cat] = (catStats[r.cat] || 0) + (Number(r.amount) || 0); });
  const statsEl = document.getElementById('spendCatStats');
  const pills = Object.entries(catStats).map(([c, a]) => `<span class="finance-stat-pill">${escapeHtml(c)} ¥${fmtMoney(a)}</span>`);
  statsEl.innerHTML = pills.length ? pills.join('') : '<span class="finance-stat-pill">今天还没花销 🌿</span>';
  const listEl = document.getElementById('spendList');
  listEl.innerHTML = '';
  if (todayRecords.length === 0) { listEl.innerHTML = '<div class="empty-hint">今天还没记花销哦，第一笔从奶茶开始？🧋</div>'; return; }
  [...todayRecords].reverse().forEach(r => {
    const el = document.createElement('div'); el.className = 'spend-item';
    el.innerHTML = `
      <span class="spend-cat">${escapeHtml(r.cat)}</span>
      <div class="spend-info">
        <div class="spend-name">${escapeHtml(r.name)}</div>
        <div class="spend-meta">${r.date}${r.time ? ' · ' + fmtTime(r.time) : ''}</div>
      </div>
      <span class="spend-amount">-¥${fmtMoney(Number(r.amount))}</span>
      <button class="spend-del" data-spend-id="${r.id}">删除</button>`;
    listEl.appendChild(el);
  });
}
function fmtMoney(n) { return Number(n).toFixed(2).replace(/\.00$/, ''); }
function addSpend() {
  const name = document.getElementById('newSpendName').value.trim();
  const cat = document.getElementById('newSpendCat').value;
  const amount = parseFloat(document.getElementById('newSpendAmount').value);
  if (!name || isNaN(amount) || amount <= 0) { alert('请填写名称和有效金额'); return; }
  spendData.records.push({ id: uid(), name, cat, amount, date: todayKey(), time: Date.now() });
  saveSpend(); renderSpend();
  document.getElementById('newSpendName').value = '';
  document.getElementById('newSpendAmount').value = '';
}
function renderSave() {
  const target = Number(saveData.target) || 0;
  const current = Number(saveData.current) || 0;
  const pct = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
  document.getElementById('saveBarFill').style.width = pct + '%';
  document.getElementById('saveCurrent').textContent = '¥' + fmtMoney(current);
  document.getElementById('saveTarget').textContent = '¥' + fmtMoney(target);
  document.getElementById('savePercent').textContent = pct + '%';
}
function editGoal() {
  const val = prompt('设置存钱目标金额（元）：', saveData.target || 1000);
  if (val === null) return;
  const num = parseFloat(val);
  if (isNaN(num) || num < 0) { alert('请输入有效金额'); return; }
  saveData.target = num; saveSave(); renderSave();
}
function depositSave() {
  const el = document.getElementById('saveAddAmount');
  const val = parseFloat(el.value);
  if (isNaN(val) || val <= 0) { alert('请输入有效金额'); return; }
  saveData.current = (Number(saveData.current) || 0) + val;
  saveSave(); renderSave(); el.value = '';
}
function withdrawSave() {
  const el = document.getElementById('saveAddAmount');
  const val = parseFloat(el.value);
  if (isNaN(val) || val <= 0) { alert('请输入有效金额'); return; }
  saveData.current = Math.max(0, (Number(saveData.current) || 0) - val);
  saveSave(); renderSave(); el.value = '';
}

// ==================== 页面切换 ====================
function switchPage(page) {
  document.querySelectorAll('.nav-item').forEach(el => el.classList.toggle('active', el.dataset.page === page));
  document.querySelectorAll('.page').forEach(el => el.classList.toggle('active', el.dataset.page === page));
  const meta = PAGE_TITLES[page] || PAGE_TITLES.plan;
  document.title = meta.title + ' · 🐰 X';
  if (page === 'exam') { renderQuiz(); renderAllTeacherVideos(); }
  if (page === 'reading') { renderBooks(); renderNotes(); }
  if (page === 'dailylife') { renderMood(); renderDiary(); }
  if (page === 'english') { renderEnglish(); }
  if (page === 'podcast') { renderPodcasts(); }
  if (page === 'news') { renderNewsPage(); }
  if (page === 'beauty') { renderBeauty(); }
  if (page === 'job') { renderCountdowns(); }
  if (page === 'food') { renderFood(); }
  if (page === 'grad') { renderGrad(); }
  if (page === 'finance') { renderFinance(); }
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ==================== 侧边栏排序 ====================
const NAV_ORDER_KEY = 'workbuddy.navOrder.v1';

function applyNavOrder() {
  const order = loadJSON(NAV_ORDER_KEY, null);
  if (!order || !order.length) return;
  const nav = document.getElementById('mainNav');
  const byPage = {};
  nav.querySelectorAll('.nav-item').forEach(el => { byPage[el.dataset.page] = el; });
  order.forEach(p => { if (byPage[p]) nav.appendChild(byPage[p]); });
  updateNavNumbers();
}

function setupNavReorder() {
  const nav = document.getElementById('mainNav');
  nav.querySelectorAll('.nav-item').forEach(item => {
    if (item.querySelector('.nav-moves')) return;
    const moves = document.createElement('span');
    moves.className = 'nav-moves';
    moves.innerHTML = `
      <button class="nav-move nav-up" type="button" title="上移">▲</button>
      <button class="nav-move nav-down" type="button" title="下移">▼</button>`;
    item.appendChild(moves);
  });
  nav.addEventListener('click', e => {
    const btn = e.target.closest('.nav-move');
    if (!btn) return;
    e.preventDefault(); e.stopPropagation();
    const item = btn.closest('.nav-item');
    const dir = btn.classList.contains('nav-up') ? 'up' : 'down';
    moveNavItem(item, dir);
  });
  updateNavButtons();
}

function moveNavItem(item, dir) {
  const parent = item.parentNode;
  if (dir === 'up') {
    const prev = item.previousElementSibling;
    if (prev && prev.classList.contains('nav-item')) parent.insertBefore(item, prev);
  } else {
    const next = item.nextElementSibling;
    if (next && next.classList.contains('nav-item')) parent.insertBefore(next, item);
  }
  saveNavOrder();
  updateNavButtons();
  updateNavNumbers();
}

// 数字随每栏顺序改变而重新编号
function updateNavNumbers() {
  const items = [...document.querySelectorAll('#mainNav .nav-item')];
  items.forEach((item, i) => {
    const num = item.querySelector('.nav-num');
    if (num) num.textContent = String(i + 1).padStart(2, '0');
  });
}

function saveNavOrder() {
  const order = [...document.querySelectorAll('#mainNav .nav-item')].map(el => el.dataset.page);
  saveJSON(NAV_ORDER_KEY, order);
}

function updateNavButtons() {
  const items = [...document.querySelectorAll('#mainNav .nav-item')];
  items.forEach((item, i) => {
    const up = item.querySelector('.nav-up');
    const down = item.querySelector('.nav-down');
    if (up) up.disabled = (i === 0);
    if (down) down.disabled = (i === items.length - 1);
  });
}

// ==================== 通用添加展开/收起 ====================
function toggleExpand(triggerId, expandId, confirmId, cancelId, onConfirm) {
  const trigger = document.getElementById(triggerId);
  const expand = document.getElementById(expandId);
  const confirm = document.getElementById(confirmId);
  const cancel = document.getElementById(cancelId);
  if (!trigger || !expand) return;
  trigger.addEventListener('click', () => { expand.style.display = 'block'; trigger.style.display = 'none'; });
  cancel.addEventListener('click', () => { expand.style.display = 'none'; trigger.style.display = 'flex'; });
  confirm.addEventListener('click', () => { onConfirm(); expand.style.display = 'none'; trigger.style.display = 'flex'; });
}

// ==================== 事件绑定 ====================
function bindEvents() {
  // 导航
  document.querySelectorAll('.nav-item').forEach(el => {
    el.addEventListener('click', e => { if (e.target.closest('.nav-move')) return; e.preventDefault(); switchPage(el.dataset.page); });
  });

  // 任务
  ['listPersonal', 'listCreative'].forEach(listId => {
    const col = listId === 'listPersonal' ? 'personal' : 'creative';
    document.getElementById(listId).addEventListener('click', e => {
      const item = e.target.closest('.task');
      if (!item) return;
      const id = item.dataset.id;
      const action = e.target.closest('[data-action]')?.dataset.action;
      if (action === 'delete') openDeleteModal(col, id);
      else if (action === 'edit') editTask(col, id);
      else if (action === 'link') { const tk = tasks[col].find(t => t.id === id); if (tk && tk.link) switchPage(tk.link); }
      else if (action === 'up') moveTask(col, id, -1);
      else if (action === 'down') moveTask(col, id, 1);
      else if (action === 'toggle') toggleTask(col, id);
    });
  });

  // 添加任务
  toggleExpand('addTaskMain', 'addTaskExpand', 'confirmAddTask', 'cancelAddTask', () => {
    addTask(document.getElementById('newTaskCol').value, document.getElementById('newTaskName').value, document.getElementById('newTaskLink').value);
    document.getElementById('newTaskName').value = '';
  });

  // 删除弹窗
  document.getElementById('cancelDelete').addEventListener('click', closeDeleteModal);
  document.getElementById('confirmDelete').addEventListener('click', () => {
    if (deleteTarget) removeTask(deleteTarget.col, deleteTarget.id);
    closeDeleteModal();
  });
  document.getElementById('deleteModal').addEventListener('click', e => { if (e.target.id === 'deleteModal') closeDeleteModal(); });
  document.getElementById('wordModal').addEventListener('click', e => { if (e.target.id === 'wordModal') closeWordModal(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeDeleteModal(); });

  // 读书
  document.getElementById('addBookBtn').addEventListener('click', addBook);
  document.getElementById('readingList').addEventListener('click', e => {
    const btn = e.target.closest('[data-book-act]');
    if (!btn) return;
    const id = btn.dataset.id, act = btn.dataset.bookAct, book = books.find(b => b.id === id);
    if (!book) return;
    if (act === 'progress') { book.progress = Math.min(100, (book.progress || 0) + 5); if (book.progress >= 100) book.status = 'done'; saveJSON(BOOK_KEY, books); renderBooks(); }
    else if (act === 'done') { book.status = 'done'; book.progress = 100; saveJSON(BOOK_KEY, books); renderBooks(); }
    else if (act === 'del') { books = books.filter(b => b.id !== id); saveJSON(BOOK_KEY, books); renderBooks(); }
  });
  document.getElementById('noteInput').addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault(); const text = e.target.value.trim(); if (!text) return;
      readNotes.unshift({ id: uid(), text, time: Date.now() }); saveJSON(NOTE_KEY, readNotes); e.target.value = ''; renderNotes();
    }
  });
  document.getElementById('noteList').addEventListener('click', e => {
    const btn = e.target.closest('[data-note-id]');
    if (btn) { readNotes = readNotes.filter(n => n.id !== btn.dataset.noteId); saveJSON(NOTE_KEY, readNotes); renderNotes(); }
  });

  // Daily Life - 心情
  ['moodRowUp', 'moodRowCalm', 'moodRowDown'].forEach(id => {
    document.getElementById(id).addEventListener('click', e => { const m = e.target.closest('.mood'); if (m) saveMood(m.dataset.mood); });
  });

  // Daily Life - 碎碎念日记
  document.getElementById('addDiaryBtn').addEventListener('click', () => {
    document.getElementById('addDiaryExpand').style.display = '';
    document.getElementById('addDiaryBtn').style.display = 'none';
    document.getElementById('diaryInput').focus();
  });
  document.getElementById('confirmAddDiary').addEventListener('click', () => {
    const text = document.getElementById('diaryInput').value.trim();
    if (!text) return;
    diary.unshift({ id: uid(), text, time: Date.now(), date: todayKey() });
    saveJSON(DIARY_KEY, diary);
    document.getElementById('diaryInput').value = '';
    document.getElementById('addDiaryExpand').style.display = 'none';
    document.getElementById('addDiaryBtn').style.display = '';
    renderDiary();
  });
  document.getElementById('cancelAddDiary').addEventListener('click', () => {
    document.getElementById('addDiaryExpand').style.display = 'none';
    document.getElementById('addDiaryBtn').style.display = '';
    document.getElementById('diaryInput').value = '';
  });
  document.getElementById('diaryInput').addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); document.getElementById('confirmAddDiary').click(); }
    if (e.key === 'Escape') { document.getElementById('cancelAddDiary').click(); }
  });
  // 日期导航
  document.getElementById('diaryDatePrev').addEventListener('click', () => { diaryViewDate.setDate(diaryViewDate.getDate() - 1); renderDiary(); });
  document.getElementById('diaryDateNext').addEventListener('click', () => { diaryViewDate.setDate(diaryViewDate.getDate() + 1); renderDiary(); });
  document.getElementById('diaryDateToday').addEventListener('click', () => { diaryViewDate = new Date(); renderDiary(); });
  // 删除碎碎念
  document.getElementById('diaryList').addEventListener('click', e => {
    const btn = e.target.closest('[data-diary-id]');
    if (btn) { diary = diary.filter(d => d.id !== btn.dataset.diaryId); saveJSON(DIARY_KEY, diary); renderDiary(); }
  });

  // 教资子标签
  document.querySelectorAll('.teacher-subtab').forEach(el => el.addEventListener('click', () => switchTeacherSubtab(el.dataset.subtab)));
  document.querySelectorAll('[data-wcat]').forEach(el => el.addEventListener('click', () => {
    document.querySelectorAll('[data-wcat]').forEach(b => b.classList.remove('active')); el.classList.add('active');
    document.querySelectorAll('[data-wsection]').forEach(s => s.classList.remove('active'));
    document.querySelector(`[data-wsection="${el.dataset.wcat}"]`).classList.add('active');
  }));
  document.querySelectorAll('[data-icat]').forEach(el => el.addEventListener('click', () => {
    document.querySelectorAll('[data-icat]').forEach(b => b.classList.remove('active')); el.classList.add('active');
    document.querySelectorAll('[data-isection]').forEach(s => s.classList.remove('active'));
    document.querySelector(`[data-isection="${el.dataset.icat}"]`).classList.add('active');
  }));

  // 题库
  document.getElementById('quizPrev').addEventListener('click', quizPrev);
  document.getElementById('quizNext').addEventListener('click', quizNext);
  document.getElementById('quizReset').addEventListener('click', () => { if (confirm('确定要清空所有做题记录吗？')) resetQuiz(); });
  document.querySelectorAll('.quiz-mode-btn[data-qmode]').forEach(el => el.addEventListener('click', () => {
    document.querySelectorAll('.quiz-mode-btn[data-qmode]').forEach(b => b.classList.remove('active')); el.classList.add('active');
    quizMode = el.dataset.qmode; buildQuizOrder(); renderQuiz();
  }));

  // 英语学习 · 打卡 / 添加生词 / 单词列表
  document.getElementById('engCheckinBtn').addEventListener('click', toggleEngCheckin);
  document.getElementById('engAddWordMini').addEventListener('click', openWordModal);
  document.getElementById('confirmAddWord').addEventListener('click', () => { addWord(); closeWordModal(); });
  document.getElementById('cancelWord').addEventListener('click', closeWordModal);
  document.getElementById('engPathList').addEventListener('click', e => {
    const addBtn = e.target.closest('#vocabAddBtn');
    if (addBtn) { openWordModal(); return; }
    const delBtn = e.target.closest('[data-word-id]');
    if (delBtn) { deleteWord(delBtn.dataset.wordId); return; }
    const toggle = e.target.closest('[data-word-toggle]');
    if (toggle) { toggleWordStatus(toggle.dataset.wordToggle); }
  });

  // 每日新闻
  document.getElementById('saveNewsBtn').addEventListener('click', () => {
    const text = document.getElementById('newsInput').value.trim();
    newsData.currentText = text;
    if (text) { newsData.summaries = newsData.summaries || []; newsData.summaries.unshift({ date: todayKey(), text }); }
    saveNewsData(); renderNewsPage();
    alert('新闻摘要已保存 ✨');
  });

  // 变美技巧子标签
  document.querySelectorAll('.eng-subtab[data-bsub]').forEach(el => el.addEventListener('click', () => {
    document.querySelectorAll('.eng-subtab[data-bsub]').forEach(b => b.classList.remove('active')); el.classList.add('active');
    document.querySelectorAll('[data-bpanel]').forEach(p => p.classList.remove('active'));
    document.querySelector(`[data-bpanel="${el.dataset.bsub}"]`).classList.add('active');
  }));

  // 研究生日常
  toggleExpand('addPaperBtn', 'addPaperExpand', 'confirmAddPaper', 'cancelAddPaper', () => {
    const title = document.getElementById('newPaperTitle').value.trim();
    const note = document.getElementById('newPaperNote').value.trim();
    if (!title) return;
    paperData.papers.push({ id: uid(), title, note, time: Date.now() }); savePapers(); renderGrad();
    document.getElementById('newPaperTitle').value = ''; document.getElementById('newPaperNote').value = '';
  });
  document.getElementById('paperList').addEventListener('click', e => {
    const btn = e.target.closest('[data-paper-id]');
    if (btn) { paperData.papers = paperData.papers.filter(p => p.id !== btn.dataset.paperId); savePapers(); renderGrad(); }
  });
  toggleExpand('addResearchBtn', 'addResearchExpand', 'confirmAddResearch', 'cancelAddResearch', () => {
    const text = document.getElementById('newResearch').value.trim();
    if (!text) return;
    researchData.tasks.push({ id: uid(), text, done: false, time: Date.now() }); saveResearch(); renderGrad();
    document.getElementById('newResearch').value = '';
  });
  document.getElementById('researchList').addEventListener('click', e => {
    const delBtn = e.target.closest('[data-research-id]');
    if (delBtn) { researchData.tasks = researchData.tasks.filter(t => t.id !== delBtn.dataset.researchId); saveResearch(); renderGrad(); return; }
    const toggle = e.target.closest('[data-research-toggle]');
    if (toggle) { const t = researchData.tasks.find(t => t.id === toggle.dataset.researchToggle); if (t) { t.done = !t.done; saveResearch(); renderGrad(); } }
  });
  document.getElementById('saveMentorBtn').addEventListener('click', () => {
    mentorData.text = document.getElementById('mentorInput').value; saveMentor(); alert('导师沟通记录已保存 ✨');
  });
  document.getElementById('saveCourseBtn').addEventListener('click', () => {
    courseData.text = document.getElementById('courseInput').value; saveCourse(); alert('课程笔记已保存 ✨');
  });

  // 今日食谱 - 今日吃什么
  document.getElementById('randomFoodBtn').addEventListener('click', randomFood);
  toggleExpand('addFoodBtn', 'addFoodExpand', 'confirmAddFood', 'cancelAddFood', addFoodToday);
  document.getElementById('foodRecordList').addEventListener('click', e => {
    const btn = e.target.closest('[data-food-id]');
    if (btn) { foodTodayData.records = foodTodayData.records.filter(r => r.id !== btn.dataset.foodId); saveFoodToday(); renderFoodToday(); }
  });

  // 今日食谱 - 收藏菜单
  toggleExpand('addMenuBtn', 'addMenuExpand', 'confirmAddMenu', 'cancelAddMenu', addFoodMenu);
  document.getElementById('foodMenuGrid').addEventListener('click', e => {
    const delBtn = e.target.closest('[data-menu-id].food-menu-del');
    if (delBtn) { foodMenuData.menus = foodMenuData.menus.filter(m => m.id !== delBtn.dataset.menuId); saveFoodMenu(); renderFoodMenu(); return; }
    const cookedBtn = e.target.closest('[data-menu-id].food-menu-cooked');
    if (cookedBtn) { const m = foodMenuData.menus.find(m => m.id === cookedBtn.dataset.menuId); if (m) { m.cooked = (m.cooked || 0) + 1; saveFoodMenu(); renderFoodMenu(); } }
  });

  // 理财 - 今日花销
  toggleExpand('addSpendBtn', 'addSpendExpand', 'confirmAddSpend', 'cancelAddSpend', addSpend);
  document.getElementById('spendList').addEventListener('click', e => {
    const btn = e.target.closest('[data-spend-id]');
    if (btn) { spendData.records = spendData.records.filter(r => r.id !== btn.dataset.spendId); saveSpend(); renderSpend(); }
  });
  // 理财 - 存钱罐
  document.getElementById('editGoalBtn').addEventListener('click', editGoal);
  document.getElementById('saveDepositBtn').addEventListener('click', depositSave);
  document.getElementById('saveWithdrawBtn').addEventListener('click', withdrawSave);
}

// ==================== 手机端 App 深链接跳转 ====================
// 手机上点击 B站/拼多多/小红书/小宇宙 等链接时，
// 自动拉起对应 App（通过 Universal Link / App Link）
(function () {
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  if (!isMobile) return;

  // 需要 App 跳转的域名列表
  const appDomains = [
    'bilibili.com',       // B站
    'yangkeduo.com',       // 拼多多
    'xiaohongshu.com',     // 小红书
    'xiaoyuzhoufm.com',    // 小宇宙
    'xiachufang.com',      // 下厨房
    '51voa.com', 'ted.com', 'chinadaily.com.cn',
    'tv.cctv.com', 'people.com.cn', 'xinhuanet.com',
    'weibo.com', 'baidu.com'
  ];

  document.addEventListener('click', (e) => {
    const link = e.target.closest('a[target="_blank"]');
    if (!link || !link.href) return;

    const href = link.href;
    const isAppLink = appDomains.some(d => href.includes(d));
    if (!isAppLink) return;

    // 阻止默认的 target="_blank" 开新标签行为
    e.preventDefault();
    e.stopPropagation();

    // 用 location.href 触发 Universal Link / App Link
    // 系统会自动检测并打开对应 App，没装 App 则在浏览器打开网页
    window.location.href = href;
  }, true);
})();

// ==================== 启动 ====================
document.addEventListener('DOMContentLoaded', () => {
  renderCalendar(); bindCalendarEvents(); bindCheckinPills(); renderCheckinPills();
  renderTasks();
  renderBooks(); renderNotes();
  loadMood(); renderMood(); renderDiary();
  renderBodyTabs(); renderVideos();
  loadQuizState(); buildQuizOrder(); renderQuiz(); renderAllTeacherVideos();
  renderEnglish();
  renderPodcasts();
  renderNewsPage();
  renderBeauty();
  renderCountdowns();
  renderFood();
  renderGrad();
  bindEvents();
  applyNavOrder();
  setupNavReorder();
  updateNavNumbers();
});
