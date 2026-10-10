(function () {
  'use strict';

  var STORAGE_KEY = 'todo-app:tasks';

  // ---------- Elements ----------
  var form = document.getElementById('add-form');
  var input = document.getElementById('new-task');
  var formError = document.getElementById('form-error');
  var list = document.getElementById('task-list');
  var emptyState = document.getElementById('empty-state');
  var taskCount = document.getElementById('task-count');
  var filterButtons = document.querySelectorAll('.filter-btn');
  var clearCompletedBtn = document.getElementById('clear-completed');
  var status = document.getElementById('status');

  // ---------- State ----------
  var tasks = loadTasks();       // [{ id, text, completed }]
  var filter = 'all';            // 'all' | 'active' | 'completed'
  var editingId = null;          // id of the task currently being edited

  // ---------- Persistence (localStorage) ----------
  function loadTasks() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      var parsed = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(parsed)) { return []; }
      return parsed.filter(function (t) {
        return t && typeof t.id === 'string' && typeof t.text === 'string';
      });
    } catch (e) {
      return [];
    }
  }

  function saveTasks() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    } catch (e) {
      announce('Could not save — your browser storage may be full or disabled.');
    }
  }

  function makeId() {
    return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
  }

  function announce(message) {
    status.textContent = message;
  }

  // ---------- CRUD ----------
  function addTask(text) {
    var trimmed = text.trim();
    if (!trimmed) {
      formError.textContent = 'Type a task before adding it.';
      formError.hidden = false;
      return false;
    }
    formError.hidden = true;
    tasks.push({ id: makeId(), text: trimmed, completed: false });
    saveTasks();
    render();
    announce('Added "' + trimmed + '".');
    return true;
  }

  function toggleTask(id) {
    var task = tasks.find(function (t) { return t.id === id; });
    if (!task) { return; }
    task.completed = !task.completed;
    saveTasks();
    render();
    announce(task.completed ? 'Marked "' + task.text + '" as completed.' : 'Marked "' + task.text + '" as active.');
  }

  function deleteTask(id) {
    var task = tasks.find(function (t) { return t.id === id; });
    tasks = tasks.filter(function (t) { return t.id !== id; });
    saveTasks();
    render();
    if (task) { announce('Deleted "' + task.text + '".'); }
  }

  function updateTaskText(id, newText) {
    var trimmed = newText.trim();
    var task = tasks.find(function (t) { return t.id === id; });
    if (!task) { return; }
    if (!trimmed) {
      deleteTask(id); // an edit cleared to empty removes the task
      return;
    }
    task.text = trimmed;
    saveTasks();
    editingId = null;
    render();
    announce('Updated task to "' + trimmed + '".');
  }

  function clearCompleted() {
    var count = tasks.filter(function (t) { return t.completed; }).length;
    if (count === 0) { return; }
    tasks = tasks.filter(function (t) { return !t.completed; });
    saveTasks();
    render();
    announce('Cleared ' + count + (count === 1 ? ' completed task.' : ' completed tasks.'));
  }

  // ---------- Filtering ----------
  function visibleTasks() {
    if (filter === 'active') { return tasks.filter(function (t) { return !t.completed; }); }
    if (filter === 'completed') { return tasks.filter(function (t) { return t.completed; }); }
    return tasks;
  }

  function setFilter(next) {
    filter = next;
    filterButtons.forEach(function (btn) {
      var isActive = btn.dataset.filter === filter;
      btn.setAttribute('aria-pressed', String(isActive));
    });
    render();
  }

  // ---------- Rendering (dynamic DOM creation) ----------
  function render() {
    list.innerHTML = '';
    var visible = visibleTasks();

    visible.forEach(function (task) {
      var li = document.createElement('li');
      li.className = 'task-item' + (task.completed ? ' completed' : '');
      li.dataset.id = task.id;

      var checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'task-check';
      checkbox.checked = task.completed;
      checkbox.setAttribute('aria-label', 'Mark "' + task.text + '" as ' + (task.completed ? 'active' : 'completed'));
      checkbox.dataset.action = 'toggle';
      li.appendChild(checkbox);

      if (editingId === task.id) {
        var editInput = document.createElement('input');
        editInput.type = 'text';
        editInput.className = 'task-edit-input';
        editInput.value = task.text;
        editInput.maxLength = 200;
        editInput.dataset.action = 'edit-input';
        editInput.setAttribute('aria-label', 'Edit task text');
        li.appendChild(editInput);

        var saveBtn = document.createElement('button');
        saveBtn.type = 'button';
        saveBtn.className = 'icon-btn';
        saveBtn.textContent = 'Save';
        saveBtn.dataset.action = 'save';
        li.appendChild(saveBtn);
      } else {
        var span = document.createElement('span');
        span.className = 'task-text';
        span.textContent = task.text;
        span.dataset.action = 'start-edit';
        span.tabIndex = 0;
        span.setAttribute('role', 'button');
        span.setAttribute('aria-label', 'Edit "' + task.text + '"');
        li.appendChild(span);

        var actions = document.createElement('div');
        actions.className = 'task-actions';

        var editBtn = document.createElement('button');
        editBtn.type = 'button';
        editBtn.className = 'icon-btn';
        editBtn.textContent = 'Edit';
        editBtn.dataset.action = 'start-edit';
        editBtn.setAttribute('aria-label', 'Edit "' + task.text + '"');
        actions.appendChild(editBtn);

        var deleteBtn = document.createElement('button');
        deleteBtn.type = 'button';
        deleteBtn.className = 'icon-btn delete';
        deleteBtn.textContent = 'Delete';
        deleteBtn.dataset.action = 'delete';
        deleteBtn.setAttribute('aria-label', 'Delete "' + task.text + '"');
        actions.appendChild(deleteBtn);

        li.appendChild(actions);
      }

      list.appendChild(li);
    });

    emptyState.hidden = visible.length !== 0;
    if (visible.length === 0) {
      emptyState.textContent = tasks.length === 0
        ? 'No tasks here yet.'
        : 'Nothing in "' + filter + '".';
    }

    var remaining = tasks.filter(function (t) { return !t.completed; }).length;
    taskCount.textContent = remaining + (remaining === 1 ? ' item left' : ' items left');

    clearCompletedBtn.disabled = tasks.every(function (t) { return !t.completed; });

    if (editingId === null) { return; }
    var stillExists = tasks.some(function (t) { return t.id === editingId; });
    if (!stillExists) { editingId = null; }
  }

  function focusEditInput(id) {
    var row = list.querySelector('[data-id="' + id + '"]');
    if (!row) { return; }
    var editInput = row.querySelector('[data-action="edit-input"]');
    if (editInput) { editInput.focus(); editInput.select(); }
  }

  // ---------- Event listeners ----------

  // Add task
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var added = addTask(input.value);
    if (added) {
      input.value = '';
      input.focus();
    }
  });

  // Filters
  filterButtons.forEach(function (btn) {
    btn.addEventListener('click', function () { setFilter(btn.dataset.filter); });
  });

  // Clear completed
  clearCompletedBtn.addEventListener('click', clearCompleted);

  // Delegated click handling for the whole list: toggle / edit / save / delete
  list.addEventListener('click', function (e) {
    var target = e.target.closest('[data-action]');
    if (!target) { return; }
    var row = target.closest('.task-item');
    if (!row) { return; }
    var id = row.dataset.id;

    switch (target.dataset.action) {
      case 'toggle':
        toggleTask(id);
        break;
      case 'start-edit':
        editingId = id;
        render();
        focusEditInput(id);
        break;
      case 'save': {
        var input2 = row.querySelector('[data-action="edit-input"]');
        if (input2) { updateTaskText(id, input2.value); }
        break;
      }
      case 'delete':
        deleteTask(id);
        break;
      default:
        break;
    }
  });

  // Delegated change handling: checkbox toggling via keyboard/change event too
  list.addEventListener('change', function (e) {
    if (e.target.dataset.action === 'toggle') {
      var row = e.target.closest('.task-item');
      if (row) { toggleTask(row.dataset.id); }
    }
  });

  // Delegated keydown: Enter/Escape while editing, Enter/Space to start editing from the text span
  list.addEventListener('keydown', function (e) {
    var target = e.target;
    var row = target.closest('.task-item');
    if (!row) { return; }
    var id = row.dataset.id;

    if (target.dataset.action === 'edit-input') {
      if (e.key === 'Enter') {
        e.preventDefault();
        updateTaskText(id, target.value);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        editingId = null;
        render();
      }
    } else if (target.dataset.action === 'start-edit' && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      editingId = id;
      render();
      focusEditInput(id);
    }
  });

  // Save edit when the edit field loses focus (e.g. clicking elsewhere)
  list.addEventListener('focusout', function (e) {
    if (e.target.dataset.action !== 'edit-input') { return; }
    var row = e.target.closest('.task-item');
    if (!row) { return; }
    // Only auto-save if focus left the row entirely (not moving to the Save button)
    var id = row.dataset.id;
    var value = e.target.value;
    window.setTimeout(function () {
      if (editingId === id && document.activeElement && document.activeElement.closest('.task-item') === row) {
        return; // focus moved within the same row (e.g. to Save) — leave it
      }
      if (editingId === id) { updateTaskText(id, value); }
    }, 0);
  });

  // ---------- Init ----------
  render();
})();