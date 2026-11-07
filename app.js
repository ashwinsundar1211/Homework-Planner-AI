// UI wiring: dialog, task actions, search, filters, toasts.
import {
  state,
  loadTasks,
  createTask,
  addTask,
  updateTask,
  deleteTask,
  restoreTask,
  toggleComplete,
} from "./js/store.js";
import { render } from "./js/render.js";
import { initPwa } from "./js/pwa.js";

const dialog = document.getElementById("task-dialog");
const form = document.getElementById("task-form");
const dialogTitle = document.getElementById("dialog-title");
const formError = document.getElementById("form-error");
const taskInput = document.getElementById("task");
const subjectInput = document.getElementById("subject");
const dueDateInput = document.getElementById("due-date");
const timeInput = document.getElementById("time");
const priorityInput = document.getElementById("priority");
const proofInput = document.getElementById("proof");
const proofPreview = document.getElementById("proof-preview");
const proofImage = document.getElementById("proof-image");
const toastElement = document.getElementById("toast");
const toastText = document.getElementById("toast-text");
const toastAction = document.getElementById("toast-action");

const MAX_PROOF_LENGTH = 900000;

let editingId = null;
let proofData = "";
let toastTimer = null;

function showFormError(message) {
  formError.textContent = message;
  formError.hidden = false;
}

function clearFormError() {
  formError.hidden = true;
  formError.textContent = "";
}

function updateProofPreview() {
  const hasProof = Boolean(proofData);

  proofPreview.hidden = !hasProof;

  if (hasProof) {
    proofImage.src = proofData;
  } else {
    proofImage.removeAttribute("src");
  }
}

function openDialog(task) {
  editingId = task ? task.id : null;
  proofData = task && task.proof ? task.proof : "";

  form.reset();
  clearFormError();

  dialogTitle.textContent = task ? "Edit homework" : "Add homework";

  if (task) {
    taskInput.value = task.task;
    subjectInput.value = task.subject;
    dueDateInput.value = task.dueDate;
    timeInput.value = task.time;
    priorityInput.value = task.priority;
  }

  updateProofPreview();
  dialog.showModal();
  taskInput.focus();
}

function closeDialog() {
  dialog.close();
}

function toast(message, action) {
  toastText.textContent = message;

  if (action) {
    toastAction.hidden = false;
    toastAction.textContent = action.label;
    toastAction.onclick = function () {
      action.onClick();
      hideToast();
    };
  } else {
    toastAction.hidden = true;
    toastAction.onclick = null;
  }

  toastElement.hidden = false;

  clearTimeout(toastTimer);
  toastTimer = setTimeout(hideToast, 6000);
}

function hideToast() {
  toastElement.hidden = true;
  clearTimeout(toastTimer);
}

function fileToDataUrl(file) {
  return new Promise(function (resolve, reject) {
    const reader = new FileReader();

    reader.onload = function () {
      const image = new Image();

      image.onload = function () {
        const largestSide = Math.max(image.width, image.height);
        const scale = Math.min(1, 1200 / largestSide);
        const canvas = document.createElement("canvas");

        canvas.width = Math.round(image.width * scale);
        canvas.height = Math.round(image.height * scale);
        canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);

        resolve(canvas.toDataURL("image/jpeg", 0.72));
      };

      image.onerror = function () {
        reject(new Error("image"));
      };

      image.src = reader.result;
    };

    reader.onerror = function () {
      reject(new Error("read"));
    };

    reader.readAsDataURL(file);
  });
}

function readForm() {
  return {
    task: taskInput.value.trim(),
    subject: subjectInput.value,
    dueDate: dueDateInput.value,
    time: timeInput.value,
    priority: priorityInput.value,
    proof: proofData,
  };
}

document.getElementById("new-task-btn").addEventListener("click", function () {
  openDialog(null);
});

document.getElementById("empty-state").addEventListener("click", function (event) {
  if (event.target.closest("[data-action='new']")) {
    openDialog(null);
  }
});

document.getElementById("dialog-close").addEventListener("click", closeDialog);
document.getElementById("dialog-cancel").addEventListener("click", closeDialog);

dialog.addEventListener("click", function (event) {
  if (event.target === dialog) {
    closeDialog();
  }
});

dialog.addEventListener("close", function () {
  editingId = null;
  proofData = "";
});

proofInput.addEventListener("change", async function (event) {
  const file = event.target.files && event.target.files[0];

  if (!file) {
    return;
  }

  try {
    proofData = await fileToDataUrl(file);
    clearFormError();
  } catch (error) {
    proofData = "";
    showFormError("That photo could not be read. Try a different image.");
  }

  updateProofPreview();
  proofInput.value = "";
});

document.getElementById("proof-remove").addEventListener("click", function () {
  proofData = "";
  proofInput.value = "";
  updateProofPreview();
});

form.addEventListener("submit", function (event) {
  event.preventDefault();
  clearFormError();

  if (proofData.length > MAX_PROOF_LENGTH) {
    showFormError("That photo is too large to save. Try a smaller one.");

    return;
  }

  const data = readForm();
  const saved = editingId ? updateTask(editingId, data) : addTask(createTask(data));

  if (!saved) {
    showFormError("Could not save — this browser's storage is full. Remove a photo and try again.");

    return;
  }

  const wasEditing = Boolean(editingId);

  closeDialog();
  render();
  toast(wasEditing ? "Homework updated" : "Homework added");
});

document.getElementById("task-list").addEventListener("click", function (event) {
  const card = event.target.closest(".task-card");
  const button = event.target.closest("[data-action]");

  if (!card || !button) {
    return;
  }

  const id = card.dataset.id;
  const task = state.tasks.find(function (item) {
    return item.id === id;
  });

  if (!task) {
    return;
  }

  if (button.dataset.action === "toggle") {
    toggleComplete(id);
    render();

    return;
  }

  if (button.dataset.action === "edit") {
    openDialog(task);

    return;
  }

  if (button.dataset.action === "delete") {
    const removed = deleteTask(id);

    render();

    if (removed) {
      toast("Homework deleted", {
        label: "Undo",
        onClick: function () {
          restoreTask(removed.task, removed.index);
          render();
        },
      });
    }
  }
});

document.getElementById("search").addEventListener("input", function (event) {
  state.query = event.target.value;
  render();
});

document.getElementById("sort").addEventListener("change", function (event) {
  state.sort = event.target.value;
  render();
});

document.querySelectorAll(".chip").forEach(function (chip) {
  chip.addEventListener("click", function () {
    state.filter = chip.dataset.filter;
    render();
  });
});

loadTasks();
render();
initPwa();
