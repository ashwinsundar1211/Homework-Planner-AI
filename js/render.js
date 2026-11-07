// Rendering of the recommendation, stats and task list.
import {
  state,
  subjectLabel,
  daysUntil,
  getDaysUntilDue,
  visibleTasks,
  taskCounts,
  getMostUrgentTask,
} from "./store.js";

const PRIORITY_LABELS = {
  high: "High",
  medium: "Medium",
  low: "Low",
};

const ICON_EDIT =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20h4l10-10-4-4L4 16v4Z"/><path d="m14 6 4 4"/></svg>';

const ICON_DELETE =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13"/></svg>';

const ICON_CHECK =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5 9.5 17 19 7"/></svg>';

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, function (character) {
    return {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    }[character];
  });
}

function formatDate(dueDate) {
  const parts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dueDate || "");

  if (!parts) {
    return dueDate;
  }

  return new Date(Number(parts[1]), Number(parts[2]) - 1, Number(parts[3])).toLocaleDateString(
    undefined,
    { month: "short", day: "numeric" }
  );
}

function dueTag(task) {
  const days = daysUntil(task.dueDate);

  if (days === null) {
    return "";
  }

  if (days < 0) {
    const late = Math.abs(days);

    return `<span class="tag tag-due is-overdue">${late === 1 ? "1 day overdue" : `${late} days overdue`}</span>`;
  }

  if (days === 0) {
    return '<span class="tag tag-due is-today">Due today</span>';
  }

  if (days === 1) {
    return '<span class="tag tag-due is-soon">Due tomorrow</span>';
  }

  if (days <= 7) {
    return `<span class="tag tag-due is-soon">Due in ${days} days</span>`;
  }

  return `<span class="tag tag-due">Due ${formatDate(task.dueDate)}</span>`;
}

function taskCard(task) {
  const priority = PRIORITY_LABELS[task.priority] || "Low";
  const proof = task.proof
    ? `<img class="task-proof" src="${task.proof}" alt="Homework photo for ${escapeHtml(task.task)}" loading="lazy">`
    : "";

  return `
    <article class="task-card${task.completed ? " is-done" : ""}" data-id="${escapeHtml(task.id)}">
      <button type="button" class="check" data-action="toggle" aria-pressed="${task.completed}" aria-label="${
        task.completed ? "Mark as not done" : "Mark as done"
      }">${ICON_CHECK}</button>

      <div class="task-body">
        <div class="task-top">
          <h3>${escapeHtml(task.task)}</h3>

          <div class="task-actions">
            <button type="button" class="icon-btn" data-action="edit" aria-label="Edit ${escapeHtml(task.task)}">${ICON_EDIT}</button>
            <button type="button" class="icon-btn is-danger" data-action="delete" aria-label="Delete ${escapeHtml(
              task.task
            )}">${ICON_DELETE}</button>
          </div>
        </div>

        <div class="task-meta">
          <span class="tag">${escapeHtml(subjectLabel(task.subject))}</span>
          <span class="tag tag-priority is-${escapeHtml(task.priority)}">${priority}</span>
          ${dueTag(task)}
          <span class="tag">${Number(task.time)} min</span>
          ${task.proof ? '<span class="tag tag-proof">Photo attached</span>' : ""}
        </div>

        ${proof}
      </div>
    </article>
  `;
}

function renderRecommendation() {
  const container = document.getElementById("recommendation-content");
  const urgentTask = getMostUrgentTask();

  if (!urgentTask) {
    container.innerHTML =
      '<p class="up-next-empty">🎉 Great job! All your homework tasks are completed.</p>';

    return;
  }

  const daysUntilDue = getDaysUntilDue(urgentTask.dueDate);
  const timeRequired = Number(urgentTask.time);

  let recommendation = "";
  let tone = "";

  if (daysUntilDue <= 0) {
    recommendation = `🚨 <strong>Start with ${escapeHtml(urgentTask.task)}</strong> because it is due today or is already due.`;
    tone = "is-urgent";
  } else if (daysUntilDue === 1) {
    recommendation = `⚠️ <strong>Prioritize ${escapeHtml(urgentTask.task)}</strong> because it is due tomorrow.`;
    tone = "is-soon";
  } else if (timeRequired >= 120) {
    recommendation = `🧠 <strong>Start ${escapeHtml(urgentTask.task)} early.</strong> It is estimated to take ${timeRequired} minutes.`;
  } else {
    recommendation = `📚 <strong>Recommended next:</strong> ${escapeHtml(urgentTask.task)}. It currently has the highest priority score.`;
  }

  container.className = `up-next-body ${tone}`;
  container.innerHTML = `<p>${recommendation}</p>`;
}

function renderStats() {
  const completed = state.tasks.filter(function (task) {
    return task.completed;
  });

  const totalMinutes = state.tasks.reduce(function (total, task) {
    return total + Number(task.time);
  }, 0);

  document.getElementById("total-tasks").textContent = state.tasks.length;
  document.getElementById("completed-tasks").textContent = completed.length;
  document.getElementById("remaining-tasks").textContent = state.tasks.length - completed.length;
  document.getElementById("study-time").textContent = totalMinutes;
}

function renderList() {
  const list = document.getElementById("task-list");
  const emptyState = document.getElementById("empty-state");
  const emptyTitle = emptyState.querySelector(".empty-title");
  const emptyText = emptyState.querySelector(".empty-text");
  const emptyAction = emptyState.querySelector("[data-action='new']");
  const counts = taskCounts();

  const tasks = visibleTasks();

  list.innerHTML = tasks.map(taskCard).join("");

  document.getElementById("count-all").textContent = counts.all;
  document.getElementById("count-today").textContent = counts.today;
  document.getElementById("count-overdue").textContent = counts.overdue;
  document.getElementById("count-done").textContent = counts.done;

  document.querySelectorAll(".chip").forEach(function (chip) {
    chip.classList.toggle("is-active", chip.dataset.filter === state.filter);
  });

  const isEmpty = tasks.length === 0;

  emptyState.hidden = !isEmpty;

  if (!isEmpty) {
    return;
  }

  if (state.query.trim()) {
    emptyTitle.textContent = "No homework matches your search";
    emptyText.textContent = "Try a different word, or clear the search to see everything.";
    emptyAction.hidden = true;

    return;
  }

  if (state.tasks.length === 0) {
    emptyTitle.textContent = "No homework here yet";
    emptyText.textContent = "Add your first task and it will show up on your planner.";
    emptyAction.hidden = false;

    return;
  }

  emptyTitle.textContent =
    state.filter === "done" ? "Nothing completed yet" : "Nothing in this view";
  emptyText.textContent =
    state.filter === "done"
      ? "Tick a task off and it will appear here."
      : "Try another filter to see the rest of your homework.";
  emptyAction.hidden = true;
}

export function render() {
  renderRecommendation();
  renderStats();
  renderList();
}
