let tasks = [];

const taskForm = document.getElementById("task-form");
const taskInput = document.getElementById("task");
const subjectInput = document.getElementById("subject");
const dueDateInput = document.getElementById("due-date");
const timeInput = document.getElementById("time");
const priorityInput = document.getElementById("priority");
const taskList = document.getElementById("task-list");
const emptyState = document.getElementById("empty-state");
const recommendationContent = document.getElementById("recommendation-content");
const totalTasks = document.getElementById("total-tasks");
const completedTasks = document.getElementById("completed-tasks");
const remainingTasks = document.getElementById("remaining-tasks");
const studyTime = document.getElementById("study-time");

function getPriorityScore(priority) {
  if (priority === "high"){
    return 3;
  }

  if (priority === "medium"){
    return 2;
  }

  if (priority === "low"){
    return 1;
  }

  return 0;
}

function getDaysUntilDue(dueDate){
  const today = new Date();
  const due = new Date(dueDate);

  const difference = due.getTime() - today.getTime();

  const days = difference / (1000 * 60 * 60 * 24);

  return Math.ceil(days);
}

function calculateTaskScore(task) {

  const priorityScore = getPriorityScore(task.priority);

  const daysUntilDue = getDaysUntilDue(task.dueDate);

  const timeRequired = Number(task.time);

  let score = 0;

  score += priorityScore * 20;

  if (daysUntilDue <= 0){
    score += 60;
  }
  else if (daysUntilDue === 1){
    score += 50;
  }
  else if (daysUntilDue <= 3){
    score += 30;
  }
  else if (daysUntilDue <= 7){
    score += 15;
  }


  if (timeRequired >= 120){
    score += 20;
  }
  else if (timeRequired >= 60){
    score += 10;
  }

  return score;
}

function sortTasksByPriority(){
  tasks.sort(function(a, b){
    return calculateTaskScore(b) - calculateTaskScore(a);
  });
}

function getMostUrgentTask(){
  const incompleteTasks = tasks.filter(function(task){
    return !task.completed;
  });

  if (incompleteTasks.length === 0){
    return null;
  }

  let urgentTask = incompleteTasks[0];

  for (let i = 1; i < incompleteTasks.length; i++){
      if(calculateTaskScore(incompleteTasks[i]) > calculateTaskScore(urgentTask)){
        urgentTask = incompleteTasks[i];
      }
    }

    return urgentTask;
  }

  function generateRecommendation(){
  const urgentTask = getMostUrgentTask();

  if(!urgentTask){
    recommendationContent.innerHTML = "<p>🎉 Great job! All your homework tasks are completed.</p>";

    return;
  }

  const daysUntilDue = getDaysUntilDue(urgentTask.dueDate);

  const timeRequired = Number(urgentTask.time);

  let recommendation = "";

  if(daysUntilDue <= 0){
    recommendation = `🚨 <strong>Start with ${urgentTask.task}</strong> because it is due today or is already due.`;
  }
  else if(daysUntilDue === 1){
    recommendation = `⚠️ <strong>Prioritize ${urgentTask.task}</strong> because it is due tomorrow.`;
  }
  else if(timeRequired >= 120){
    recommendation = `🧠 <strong>Start ${urgentTask.task} early.</strong> It is estimated to take ${timeRequired} minutes.`;
  }
  else{
    recommendation = `📚 <strong>Recommended next:</strong> ${urgentTask.task}. It currently has the highest priority score.`;
  }

  recommendationContent.innerHTML = `<p>${recommendation}</p>`;
}

function displayTask(taskData){
  const taskCard = document.createElement("div");
  taskCard.classList.add("task-card")

  taskCard.innerHTML = `
    <h3>${taskData.task}</h3>

    <p><strong>Subject:</strong> ${taskData.subject}</p>

    <p><strong>Due Date:</strong> ${taskData.dueDate}</p>

    <p><strong>Estimated Time:</strong> ${Number(taskData.time)} minutes</p>

    <p><strong>Priority:</strong> ${taskData.priority}</p>

    <div class="task-actions">
      <button class="complete-button">Complete</button>
      <button class="delete-button">Delete</button>
    </div>
  `;

  taskList.appendChild(taskCard);

  emptyState.style.display = "none";

  const completeButton = taskCard.querySelector(".complete-button");
  const deleteButton = taskCard.querySelector(".delete-button");

  if (taskData.completed) {
    taskCard.classList.add("completed");
  }

  deleteButton.addEventListener("click", function(){
    taskCard.remove();

    tasks = tasks.filter(function(task){
      return task.id !== taskData.id;
    });

    saveTasks();

    generateRecommendation();

    updateDashboard();

    if(tasks.length === 0){
      emptyState.style.display = "block";
    }
  });

  completeButton.addEventListener("click", function(){

    taskData.completed = !taskData.completed;

    taskCard.classList.toggle(
      "completed",
      taskData.completed
    );

    saveTasks();

    generateRecommendation();

    updateDashboard();
  });
}

function saveTasks(){
  localStorage.setItem("homeworkTasks", JSON.stringify(tasks));
}

taskForm.addEventListener("submit", function(event){
  event.preventDefault();

  const task = taskInput.value;
  const subject = subjectInput.value;
  const dueDate = dueDateInput.value;
  const time = timeInput.value;
  const priority = priorityInput.value;

  const newTask = {
    id: Date.now(),
    task: task,
    subject: subject,
    dueDate: dueDate,
    time: time,
    priority: priority,
    completed: false
  };

  tasks.push(newTask);
  sortTasksByPriority();
  saveTasks();
  displayTask(newTask);
  generateRecommendation();
  updateDashboard();
  taskForm.reset();
})

function loadTasks() {
  const savedTasks = localStorage.getItem("homeworkTasks");

  if(savedTasks){
    tasks = JSON.parse(savedTasks);

    tasks.forEach(function(task) {
        displayTask(task);
    });
  }

  generateRecommendation();
}

function updateDashboard(){
  const completed = tasks.filter(function(task){
    return task.completed;
  });

  const remaining = tasks.filter(function(task) {
    return !task.completed;
  });

  const totalMinutes = tasks.reduce(function(total, task){
    return total + Number(task.time);
  }, 0);

  totalTasks.textContent = tasks.length;

  completedTasks.textContent = completed.length;

  remainingTasks.textContent = remaining.length;

  studyTime.textContent = totalMinutes;
}

loadTasks();

updateDashboard();