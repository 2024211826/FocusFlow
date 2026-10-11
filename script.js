const STORAGE_KEY = "focusflow-data";
const CIRCLE_LENGTH = 2 * Math.PI * 96;

const defaultData = {
  tasks: [],
  focusCount: 0,
  focusMinutes: 0,
};

const state = {
  modeMinutes: 25,
  secondsLeft: 25 * 60,
  totalSeconds: 25 * 60,
  timerId: null,
  data: loadData(),
};

const elements = {
  date: document.querySelector("#current-date"),
  display: document.querySelector("#timer-display"),
  status: document.querySelector("#timer-status"),
  progress: document.querySelector(".timer-progress"),
  startButton: document.querySelector("#start-button"),
  resetButton: document.querySelector("#reset-button"),
  modeButtons: document.querySelectorAll(".mode-button"),
  taskForm: document.querySelector("#task-form"),
  taskInput: document.querySelector("#task-input"),
  taskList: document.querySelector("#task-list"),
  emptyState: document.querySelector("#empty-state"),
  taskCount: document.querySelector("#task-count"),
  focusCount: document.querySelector("#focus-count"),
  focusMinutes: document.querySelector("#focus-minutes"),
  completedCount: document.querySelector("#completed-count"),
};

function loadData() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return { ...defaultData, ...saved };
  } catch {
    return { ...defaultData };
  }
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.data));
}

function formatDate() {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(new Date());
}

function updateTimerView() {
  const minutes = Math.floor(state.secondsLeft / 60);
  const seconds = state.secondsLeft % 60;
  elements.display.textContent = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  const elapsedRatio = 1 - state.secondsLeft / state.totalSeconds;
  elements.progress.style.strokeDashoffset = String(CIRCLE_LENGTH * elapsedRatio);
  document.title = `${elements.display.textContent} · FocusFlow`;
}

function setTimerRunning(isRunning) {
  elements.startButton.textContent = isRunning ? "暂停一下" : "开始专注";
  elements.status.textContent = isRunning ? "保持节奏" : "准备开始";
}

function completeTimer() {
  clearInterval(state.timerId);
  state.timerId = null;
  elements.status.textContent = "本轮完成！";
  elements.startButton.textContent = "再来一轮";

  if (state.modeMinutes === 25) {
    state.data.focusCount += 1;
    state.data.focusMinutes += state.modeMinutes;
    saveData();
    renderStats();
  }
}

function toggleTimer() {
  if (state.secondsLeft === 0) {
    resetTimer();
  }

  if (state.timerId) {
    clearInterval(state.timerId);
    state.timerId = null;
    setTimerRunning(false);
    elements.status.textContent = "已暂停";
    return;
  }

  setTimerRunning(true);
  state.timerId = setInterval(() => {
    state.secondsLeft -= 1;
    updateTimerView();

    if (state.secondsLeft <= 0) {
      completeTimer();
    }
  }, 1000);
}

function resetTimer() {
  clearInterval(state.timerId);
  state.timerId = null;
  state.totalSeconds = state.modeMinutes * 60;
  state.secondsLeft = state.totalSeconds;
  setTimerRunning(false);
  updateTimerView();
}

function changeMode(button) {
  state.modeMinutes = Number(button.dataset.minutes);
  elements.modeButtons.forEach((item) => item.classList.toggle("active", item === button));
  resetTimer();
}

function addTask(text) {
  state.data.tasks.unshift({
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    text,
    completed: false,
  });
  saveData();
  renderTasks();
}

function toggleTask(id) {
  const task = state.data.tasks.find((item) => item.id === id);
  if (task) {
    task.completed = !task.completed;
    saveData();
    renderTasks();
  }
}

function deleteTask(id) {
  state.data.tasks = state.data.tasks.filter((item) => item.id !== id);
  saveData();
  renderTasks();
}

function createTaskElement(task) {
  const item = document.createElement("li");
  item.className = `task-item${task.completed ? " completed" : ""}`;

  const checkButton = document.createElement("button");
  checkButton.className = "task-check";
  checkButton.type = "button";
  checkButton.textContent = task.completed ? "✓" : "";
  checkButton.setAttribute("aria-label", task.completed ? "标记为未完成" : "标记为已完成");
  checkButton.addEventListener("click", () => toggleTask(task.id));

  const text = document.createElement("span");
  text.className = "task-text";
  text.textContent = task.text;

  const deleteButton = document.createElement("button");
  deleteButton.className = "delete-task";
  deleteButton.type = "button";
  deleteButton.textContent = "×";
  deleteButton.setAttribute("aria-label", `删除任务：${task.text}`);
  deleteButton.addEventListener("click", () => deleteTask(task.id));

  item.append(checkButton, text, deleteButton);
  return item;
}

function renderTasks() {
  elements.taskList.replaceChildren(...state.data.tasks.map(createTaskElement));
  elements.emptyState.hidden = state.data.tasks.length > 0;

  const completed = state.data.tasks.filter((task) => task.completed).length;
  elements.taskCount.textContent = `${completed} / ${state.data.tasks.length}`;
  renderStats();
}

function renderStats() {
  const completed = state.data.tasks.filter((task) => task.completed).length;
  elements.focusCount.textContent = state.data.focusCount;
  elements.focusMinutes.textContent = state.data.focusMinutes;
  elements.completedCount.textContent = completed;
}

elements.startButton.addEventListener("click", toggleTimer);
elements.resetButton.addEventListener("click", resetTimer);
elements.modeButtons.forEach((button) => button.addEventListener("click", () => changeMode(button)));
elements.taskForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const text = elements.taskInput.value.trim();
  if (!text) return;
  addTask(text);
  elements.taskForm.reset();
  elements.taskInput.focus();
});

elements.date.textContent = formatDate();
elements.progress.style.strokeDasharray = String(CIRCLE_LENGTH);
updateTimerView();
renderTasks();
