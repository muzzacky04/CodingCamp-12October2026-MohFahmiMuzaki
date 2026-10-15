const STORAGE_KEYS = {
  name: 'daily-dashboard-name',
  tasks: 'daily-dashboard-tasks',
  timer: 'daily-dashboard-timer'
};

const readStorage = (key, fallback) => {
  try {
    const value = localStorage.getItem(key);
    return value === null ? fallback : JSON.parse(value);
  } catch {
    return fallback;
  }
};

const saveStorage = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // The dashboard remains usable if browser storage is unavailable.
  }
};

const greetingElement = document.querySelector('#greeting');
const userNameElement = document.querySelector('#user-name');
const topbarDateElement = document.querySelector('#topbar-date');
const currentHour = new Date().getHours();
const greeting = currentHour < 11 ? 'Selamat pagi' : currentHour < 15 ? 'Selamat siang' : currentHour < 18 ? 'Selamat sore' : 'Selamat malam';
greetingElement.firstChild.textContent = `${greeting}, `;
topbarDateElement.textContent = new Intl.DateTimeFormat('id-ID', {
  weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
}).format(new Date());

const savedName = readStorage(STORAGE_KEYS.name, 'teman');
userNameElement.textContent = typeof savedName === 'string' && savedName.trim() ? savedName : 'teman';
document.querySelector('#edit-name').addEventListener('click', () => {
  const name = window.prompt('Kamu ingin dipanggil apa?', userNameElement.textContent);
  if (name === null) return;
  const trimmedName = name.trim().slice(0, 32);
  if (!trimmedName) return;
  userNameElement.textContent = trimmedName;
  saveStorage(STORAGE_KEYS.name, trimmedName);
});

const taskList = document.querySelector('#task-list');
const taskForm = document.querySelector('#task-form');
const taskInput = document.querySelector('#task-input');
const taskCount = document.querySelector('#task-count');
const emptyState = document.querySelector('#empty-state');
const clearCompletedButton = document.querySelector('#clear-completed');
const filterButtons = [...document.querySelectorAll('.filter-button')];
let tasks = readStorage(STORAGE_KEYS.tasks, []);
let activeFilter = 'all';

if (!Array.isArray(tasks)) tasks = [];

function renderTasks() {
  const visibleTasks = tasks.filter((task) => {
    if (activeFilter === 'active') return !task.completed;
    if (activeFilter === 'completed') return task.completed;
    return true;
  });

  taskList.replaceChildren(...visibleTasks.map((task) => {
    const item = document.createElement('li');
    item.className = `task-item${task.completed ? ' is-completed' : ''}`;
    item.dataset.id = task.id;

    const checkbox = document.createElement('input');
    checkbox.className = 'task-check';
    checkbox.type = 'checkbox';
    checkbox.checked = Boolean(task.completed);
    checkbox.setAttribute('aria-label', `Tandai ${task.text} sebagai ${task.completed ? 'belum selesai' : 'selesai'}`);

    const text = document.createElement('span');
    text.className = 'task-text';
    text.textContent = task.text;

    const removeButton = document.createElement('button');
    removeButton.className = 'task-delete';
    removeButton.type = 'button';
    removeButton.dataset.action = 'delete';
    removeButton.setAttribute('aria-label', `Hapus tugas ${task.text}`);
    removeButton.title = 'Hapus tugas';
    removeButton.textContent = '×';

    item.append(checkbox, text, removeButton);
    return item;
  }));

  const remaining = tasks.filter((task) => !task.completed).length;
  taskCount.textContent = `${remaining} tugas`;
  emptyState.classList.toggle('is-visible', visibleTasks.length === 0);
  clearCompletedButton.disabled = !tasks.some((task) => task.completed);
  clearCompletedButton.style.opacity = clearCompletedButton.disabled ? '.45' : '1';
}

taskForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const text = taskInput.value.trim();
  if (!text) return;
  tasks.unshift({ id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, text, completed: false });
  saveStorage(STORAGE_KEYS.tasks, tasks);
  activeFilter = 'all';
  filterButtons.forEach((button) => {
    const selected = button.dataset.filter === activeFilter;
    button.classList.toggle('is-active', selected);
    button.setAttribute('aria-pressed', String(selected));
  });
  renderTasks();
  taskInput.value = '';
  taskInput.focus();
});

taskList.addEventListener('change', (event) => {
  if (!event.target.matches('.task-check')) return;
  const task = tasks.find((item) => item.id === event.target.closest('.task-item').dataset.id);
  if (!task) return;
  task.completed = event.target.checked;
  saveStorage(STORAGE_KEYS.tasks, tasks);
  renderTasks();
});

taskList.addEventListener('click', (event) => {
  const removeButton = event.target.closest('[data-action="delete"]');
  if (!removeButton) return;
  const id = removeButton.closest('.task-item').dataset.id;
  tasks = tasks.filter((task) => task.id !== id);
  saveStorage(STORAGE_KEYS.tasks, tasks);
  renderTasks();
});

filterButtons.forEach((button) => button.addEventListener('click', () => {
  activeFilter = button.dataset.filter;
  filterButtons.forEach((filterButton) => {
    const selected = filterButton === button;
    filterButton.classList.toggle('is-active', selected);
    filterButton.setAttribute('aria-pressed', String(selected));
  });
  renderTasks();
}));

clearCompletedButton.addEventListener('click', () => {
  tasks = tasks.filter((task) => !task.completed);
  saveStorage(STORAGE_KEYS.tasks, tasks);
  renderTasks();
});

renderTasks();

const timerDisplay = document.querySelector('#timer-display');
const timerWrap = document.querySelector('#timer-wrap');
const timerToggle = document.querySelector('#timer-toggle');
const timerReset = document.querySelector('#timer-reset');
const timerStatus = document.querySelector('#focus-status');
const timerCaption = document.querySelector('#timer-caption');
const durationSelect = document.querySelector('#duration-select');
const defaultDuration = Number(durationSelect.value) * 60;
let timer = readStorage(STORAGE_KEYS.timer, { duration: defaultDuration, remaining: defaultDuration, running: false, endsAt: null });
let intervalId;

if (!timer || typeof timer !== 'object' || !Number.isFinite(timer.duration) || !Number.isFinite(timer.remaining)) {
  timer = { duration: defaultDuration, remaining: defaultDuration, running: false, endsAt: null };
}

function persistTimer() {
  saveStorage(STORAGE_KEYS.timer, timer);
}

function formatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const seconds = (totalSeconds % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}

function renderTimer() {
  const remaining = Math.max(0, timer.remaining);
  timerDisplay.textContent = formatTime(remaining);
  timerWrap.style.setProperty('--timer-progress', `${((timer.duration - remaining) / timer.duration) * 360}deg`);
  timerToggle.textContent = timer.running ? 'Jeda sebentar' : remaining < timer.duration && remaining > 0 ? 'Lanjutkan' : 'Mulai fokus';
  timerStatus.lastChild.textContent = timer.running ? ' Fokus' : remaining === 0 ? ' Selesai' : ' Siap';
  timerStatus.classList.toggle('is-running', timer.running);
  timerCaption.textContent = remaining === 0 ? 'SESI SELESAI' : 'MENIT FOKUS';
  durationSelect.disabled = timer.running;
}

function stopTimer() {
  timer.running = false;
  timer.endsAt = null;
  window.clearInterval(intervalId);
  persistTimer();
  renderTimer();
}

function tickTimer() {
  timer.remaining = Math.max(0, Math.ceil((timer.endsAt - Date.now()) / 1000));
  if (timer.remaining === 0) stopTimer();
  else renderTimer();
  persistTimer();
}

if (timer.running && Number.isFinite(timer.endsAt)) {
  if (timer.endsAt <= Date.now()) {
    timer.remaining = 0;
    stopTimer();
  } else {
    intervalId = window.setInterval(tickTimer, 250);
    tickTimer();
  }
} else {
  timer.running = false;
  timer.endsAt = null;
}

durationSelect.value = String(timer.duration / 60);
if (!durationSelect.value) {
  timer.duration = defaultDuration;
  timer.remaining = defaultDuration;
}
renderTimer();

durationSelect.addEventListener('change', () => {
  const duration = Number(durationSelect.value) * 60;
  timer = { duration, remaining: duration, running: false, endsAt: null };
  persistTimer();
  renderTimer();
});

timerToggle.addEventListener('click', () => {
  if (timer.running) {
    timer.remaining = Math.max(0, Math.ceil((timer.endsAt - Date.now()) / 1000));
    timer.running = false;
    timer.endsAt = null;
    window.clearInterval(intervalId);
  } else {
    if (timer.remaining === 0) timer.remaining = timer.duration;
    timer.running = true;
    timer.endsAt = Date.now() + timer.remaining * 1000;
    intervalId = window.setInterval(tickTimer, 250);
  }
  persistTimer();
  renderTimer();
});

timerReset.addEventListener('click', () => {
  window.clearInterval(intervalId);
  timer = { duration: Number(durationSelect.value) * 60, remaining: Number(durationSelect.value) * 60, running: false, endsAt: null };
  persistTimer();
  renderTimer();
});