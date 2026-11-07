// Task data, scoring and persistence.
const STORAGE_KEY = "homeworkTasks";

export const SUBJECTS = {
  math: "Mathematics",
  science: "Science",
  english: "English",
  french: "French",
  "social-science": "Social Science",
  computer: "Computer",
  mscs: "MSCS",
  arabic: "Arabic",
  general: "General",
};

export const state = {
  tasks: [],
  query: "",
  filter: "all",
  sort: "smart",
};

export function subjectLabel(value) {
  return SUBJECTS[value] || "General";
}

export function loadTasks() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    state.tasks = saved ? JSON.parse(saved) : [];
  } catch (error) {
    state.tasks = [];
  }

  return state.tasks;
}

export function saveTasks() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.tasks));
    return true;
  } catch (error) {
    return false;
  }
}

function getPriorityScore(priority) {
  if (priority === "high") {
    return 3;
  }

  if (priority === "medium") {
    return 2;
  }

  if (priority === "low") {
    return 1;
  }

  return 0;
}

// Kept as-is: the urgency score and the recommendation depend on it.
export function getDaysUntilDue(dueDate) {
  const today = new Date();
  const due = new Date(dueDate);

  const difference = due.getTime() - today.getTime();

  const days = difference / (1000 * 60 * 60 * 24);

  return Math.ceil(days);
}

export function calculateTaskScore(task) {
  const priorityScore = getPriorityScore(task.priority);

  const daysUntilDue = getDaysUntilDue(task.dueDate);

  const timeRequired = Number(task.time);

  let score = 0;

  score += priorityScore * 20;

  if (daysUntilDue <= 0) {
    score += 60;
  } else if (daysUntilDue === 1) {
    score += 50;
  } else if (daysUntilDue <= 3) {
    score += 30;
  } else if (daysUntilDue <= 7) {
    score += 15;
  }

  if (timeRequired >= 120) {
    score += 20;
  } else if (timeRequired >= 60) {
    score += 10;
  }

  return score;
}

// Calendar-day distance, used for the due badges and filters.
export function daysUntil(dueDate) {
  const due = parseDate(dueDate);

  if (!due) {
    return null;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function parseDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || "");

  if (!match) {
    return null;
  }

  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

function compareByDue(a, b) {
  const first = parseDate(a.dueDate);
  const second = parseDate(b.dueDate);

  if (!first && !second) {
    return 0;
  }

  if (!first) {
    return 1;
  }

  if (!second) {
    return -1;
  }

  return first.getTime() - second.getTime();
}

export function sortTasks() {
  if (state.sort === "due") {
    state.tasks.sort(function (a, b) {
      return Number(a.completed) - Number(b.completed) || compareByDue(a, b);
    });

    return;
  }

  if (state.sort === "priority") {
    state.tasks.sort(function (a, b) {
      return (
        Number(a.completed) - Number(b.completed) ||
        getPriorityScore(b.priority) - getPriorityScore(a.priority) ||
        compareByDue(a, b)
      );
    });

    return;
  }

  state.tasks.sort(function (a, b) {
    return calculateTaskScore(b) - calculateTaskScore(a);
  });
}

export function createTask(data) {
  return {
    id: String(Date.now()),
    task: data.task,
    subject: data.subject,
    dueDate: data.dueDate,
    time: data.time,
    priority: data.priority,
    proof: data.proof || "",
    completed: false,
  };
}

export function addTask(task) {
  state.tasks.push(task);
  sortTasks();

  return saveTasks();
}

export function updateTask(id, patch) {
  const task = state.tasks.find(function (item) {
    return item.id === id;
  });

  if (!task) {
    return false;
  }

  Object.assign(task, patch);
  sortTasks();

  return saveTasks();
}

export function toggleComplete(id) {
  const task = state.tasks.find(function (item) {
    return item.id === id;
  });

  if (!task) {
    return false;
  }

  task.completed = !task.completed;

  return saveTasks();
}

export function deleteTask(id) {
  const index = state.tasks.findIndex(function (item) {
    return item.id === id;
  });

  if (index === -1) {
    return null;
  }

  const task = state.tasks.splice(index, 1)[0];
  saveTasks();

  return { task: task, index: index };
}

export function restoreTask(task, index) {
  state.tasks.splice(Math.min(index, state.tasks.length), 0, task);
  sortTasks();
  saveTasks();
}

export function visibleTasks() {
  sortTasks();

  const query = state.query.trim().toLowerCase();

  return state.tasks.filter(function (task) {
    if (query) {
      const haystack = `${task.task} ${subjectLabel(task.subject)}`.toLowerCase();

      if (!haystack.includes(query)) {
        return false;
      }
    }

    const days = daysUntil(task.dueDate);

    if (state.filter === "done") {
      return Boolean(task.completed);
    }

    if (state.filter === "today") {
      return !task.completed && days === 0;
    }

    if (state.filter === "overdue") {
      return !task.completed && days !== null && days < 0;
    }

    return true;
  });
}

export function taskCounts() {
  const open = state.tasks.filter(function (task) {
    return !task.completed;
  });

  return {
    all: state.tasks.length,
    today: open.filter(function (task) {
      return daysUntil(task.dueDate) === 0;
    }).length,
    overdue: open.filter(function (task) {
      const days = daysUntil(task.dueDate);

      return days !== null && days < 0;
    }).length,
    done: state.tasks.filter(function (task) {
      return task.completed;
    }).length,
  };
}

export function getMostUrgentTask() {
  const incompleteTasks = state.tasks.filter(function (task) {
    return !task.completed;
  });

  if (incompleteTasks.length === 0) {
    return null;
  }

  let urgentTask = incompleteTasks[0];

  for (let i = 1; i < incompleteTasks.length; i++) {
    if (calculateTaskScore(incompleteTasks[i]) > calculateTaskScore(urgentTask)) {
      urgentTask = incompleteTasks[i];
    }
  }

  return urgentTask;
}
