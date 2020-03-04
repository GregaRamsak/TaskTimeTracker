const TASK_STATE_RECORDING = 'recording';
const TASK_STATE_PAUSED = "paused";
const TASK_STATE_PLAY = "play";

/** Enable debug log */
const LOG_DEBUG = false;

/** Default change time in minuts */
const DEFAULT_TIME_CHAGNE = 10;

/**
 * Interval ID holder
 */
var timer;

/**
 * Display total time on UI
 *
 * @type {boolean}
 */
var showTotalTimeLabel = false;

/**
 * Load tasks
 */
$(document).ready(function () {
  if (!localStorage.taskRepository) localStorage.taskRepository = JSON.stringify([]);
  // Count entries
  if (LOG_DEBUG)
    console.log(JSON.parse(localStorage["taskRepository"]).length);
  load();
});

$('body')
  /**
   * Start/stop task recording
   */
  .on('click', '.recording-item', function (evt) {
    evt.stopPropagation();
    let taskId = $(this)[0].id;
    // Stop currently recording
    let stoppedTaskId = findAndStopRecordingTask();
    // Do not start same task
    if (!$(this).hasClass(TASK_STATE_RECORDING) && taskId !== stoppedTaskId) {
      // Start task
      startTask(taskId);
      $(this).addClass(TASK_STATE_RECORDING);
    }
  })
  /**
   * Show context menu
   */
  .on('contextmenu', '.recording-item', function (evt) {
    evt.stopPropagation();
    console.log('Show context menu');
    // TODO Show context task's menu
    return false; // Disable display of browsers context menu
  })
  /**
   * Show play or pause icon
   */
  .on('mouseenter', '.recording-item', function () {
    if ($(this).hasClass(TASK_STATE_RECORDING)) {
      $(this).addClass(TASK_STATE_PAUSED);
    } else {
      $(this).addClass(TASK_STATE_PLAY);
    }
  })
  /**
   * Hide play or pause icon
   */
  .on('mouseleave', '.recording-item', function () {
    $(this).removeClass(TASK_STATE_PAUSED);
    $(this).removeClass(TASK_STATE_PLAY);
  })
  /**
   * Remove task from list
   */
  .on('click', '.recording-item .remove', function (evt) {
    evt.stopPropagation();
    let taskElement = $(this).parent()[0];
    // Remove task from UI
    $(taskElement).slideUp("normal", function () {
      $(taskElement).remove();
    });
    // Stop recording
    stopTask(getTaskById(taskElement.id));
    // Remove task
    removeTask(taskElement.id);
  })
  /**
   * Change task name
   */
  .on('click', '.recording-item .name', function (evt) {
    let taskElement = $(this).parent()[0];
    // Show unchanged task name
    let nameDlg = $('#nameDlg input')[0];
    if (nameDlg && nameDlg.getAttribute('for')) {
      $('#' + nameDlg.getAttribute('for') + ' .name').css('opacity', '1');
    }
    // Show dialog on new location
    showNameDialog($(this), taskElement.id);
    evt.stopPropagation();
  })
  .on('click', '.recording-item .time', function (evt) {
    if (evt.altKey) {
      let taskElement = $(this).parent()[0];
      // Show unchanged task name
      let nameDlg = $('#timeChangeDlg input')[0];
      if (nameDlg && nameDlg.getAttribute('for')) {
        $('#' + nameDlg.getAttribute('for') + ' .changeTimeValue').css('opacity', '1');
      }
      // Show dialog on new location
      showChangeTimeDialog($(this), taskElement.id);
    }
    evt.stopPropagation();
  })
  /**
   * Add time to task
   */
  .on('click', '#add-time', function (evt) {
    evt.stopPropagation();
    let addTimeValue = $('#timeChangeDlg input')[0].value;
    let taskId = $('#timeChangeDlg input')[0].getAttribute('for');
    if (LOG_DEBUG)
      console.log('Save task ', taskId, ' with time added:', addTimeValue);
    // Update name
    let task1 = getTaskById(taskId);
    task1.time = task1.time + (parseInt(addTimeValue) * 60);
    saveTaskTime(task1);
    // Update task's time
    let taskTimeElement = $('#' + task1.id + ' .time');
    taskTimeElement.text(('' + task1.time).toTime());
  })
    /**
   * Remove time from task
   */
  .on('click', '#remove-time', function (evt) {
    evt.stopPropagation();
    let addTimeValue = $('#timeChangeDlg input')[0].value;
    let taskId = $('#timeChangeDlg input')[0].getAttribute('for');
    if (LOG_DEBUG)
      console.log('Save task ', taskId, ' with time removed:', addTimeValue);
    // Update name
    let task1 = getTaskById(taskId);
    task1.time = task1.time - (parseInt(addTimeValue) * 60);
    saveTaskTime(task1);
    // Update task's time
    let taskTimeElement = $('#' + task1.id + ' .time');
    taskTimeElement.text(('' + task1.time).toTime());
  })
  .on('click', '#closeChangeTimeDlg', function (evt) {
    evt.stopPropagation();
    let taskId = $('#timeChangeDlg input')[0].getAttribute('for');
    // Show name
    let taskNameElement = $('#' + taskId + ' .name');
    taskNameElement.css('opacity', '1');
    // Hide dialog
    $('#timeChangeDlg').hide();
  })
  /**
   * Add new task to list
   */
  .on('click', '#add-task', function (evt) {
    evt.stopPropagation();
    addTask();
  })
  /**
   * Save task name
   */
  .on('keypress', '#nameDlg input', function (evt) {
    // Save changes on blur on press of the enter key
    if (evt.keyCode === 13) {
      let taskId = $(this)[0].getAttribute('for');
      if (LOG_DEBUG)
        console.log('Save task ', taskId, ' with new name:', $(this)[0].value);
      // Update name
      let task1 = getTaskById(taskId);
      task1.name = $(this)[0].value;
      changeTaskName(task1);
      // Update task's name on UI and show name
      let taskNameElement = $('#' + task1.id + ' .name');
      taskNameElement.text(task1.name);
      taskNameElement.css('opacity', '1');
      // Hide dialog
      $('#nameDlg').hide();
    }
  })
  .on('blur', '#nameDlg input', function () {
    // Save changes on blur on press of the enter key
    let taskId = $(this)[0].getAttribute('for');
    if (LOG_DEBUG)
      console.log('Save task ', taskId, ' with new name:', $(this)[0].value);
    // Update name
    let task1 = getTaskById(taskId);
    task1.name = $(this)[0].value;
    changeTaskName(task1);
    // Update task's name on UI and show name
    let taskNameElement = $('#' + task1.id + ' .name');
    taskNameElement.text(task1.name);
    taskNameElement.css('opacity', '1');
    // Hide dialog
    $('#nameDlg').hide();
  });

// noinspection JSJQueryEfficiency
$('body').dblclick(function () {
  showTotalTimeLabel = !showTotalTimeLabel;
  if (showTotalTimeLabel) {
    $('#sum').fadeIn();
    updateTotalTime();
  } else {
    $('#sum').fadeOut();
  }
});

/**
 * Opens rename task dialog.
 *
 * @param element Task element on witch rename is performed
 * @param taskId
 */
function showNameDialog(element, taskId) {
  // Move and show input field
  let taskNameElement = $('#' + taskId + ' .name');
  // Hide task's name
  taskNameElement.css('opacity', '0');

  // Show and position dialog
  let nameDlg = $('#nameDlg');
  nameDlg.show();
  let namePosTop = $(element).first().offset().top;
  let namePosLeft = $(element).first().offset().left - 1;
  nameDlg.first().offset({
    top: namePosTop
  });
  nameDlg.first().offset({
    left: namePosLeft
  });

  // Set current name to input; focus and select text
  let nameInputField = $('#nameDlg input')[0];
  nameInputField.value = taskNameElement.text();
  nameInputField.setAttribute('for', taskId);
  nameInputField.focus();
  nameInputField.select();
}

/**
 * Opens rename task dialog.
 *
 * @param element Task element on witch rename is performed
 * @param taskId
 */
function showChangeTimeDialog(element, taskId) {
  // Move and show input field
  let taskNameElement = $('#' + taskId + ' .name');
  // Hide task's name
  taskNameElement.css('opacity', '0');

  // Show and position dialog
  let timeChangeDlg = $('#timeChangeDlg');
  // timeChangeDlg.show();
  timeChangeDlg.first().css('display', 'flex');
  let namePosTop = $(taskNameElement).first().offset().top;
  let namePosLeft = $(taskNameElement).first().offset().left - 1;
  timeChangeDlg.first().offset({
    top: namePosTop
  });
  timeChangeDlg.first().offset({
    left: namePosLeft
  });

  // Set current name to input; focus and select text
  let nameInputField = $('#timeChangeDlg input')[0];
  nameInputField.value = DEFAULT_TIME_CHAGNE;
  nameInputField.setAttribute('for', taskId);
  nameInputField.focus();
  nameInputField.select();
}

function updateTotalTime() {
  if (!showTotalTimeLabel) {
    console.log('Total time update disabled');
    return
  }
  console.log('Total time update enabled');
  let totalTime = 0;
  let taskRepository = JSON.parse(localStorage["taskRepository"]);
  taskRepository.forEach(function (task) {
    totalTime += task.time;
  });
  $('#sum').text(('' + totalTime).toTime());
}

/**
 * Starts task recording
 *
 * @param taskId
 */
function startTask(taskId) {
  // Start timer
  timer = setInterval(function () {
    incrementTaskTime(taskId);
  }, 1000);
}

/**
 * Increments task's time
 *
 * It's accurate enough
 *
 * @param task
 */
function incrementTaskTime(taskId) {
  if (LOG_DEBUG)
    console.log('Increment task:', taskId);
  let task = getTaskById(taskId);
  // Increment time
  task.time = task.time + 1;
  // Save time
  saveTaskTime(task);
  // Update time on UI
  $('#' + task.id + ' .time').text(task.time.toString().toTime());
  updateTotalTime();
}

/**
 * Stops recording task
 *
 * @param task
 */
function stopTask(task) {
  let taskElement = $('#' + task.id);
  if (taskElement.hasClass(TASK_STATE_RECORDING)) {
    // Remove state from task
    taskElement.removeClass(TASK_STATE_RECORDING);
    // Stop timer
    clearInterval(timer);
  }
}

/**
 * Loads tasks to UI
 */
function load() {
  let taskRepository = JSON.parse(localStorage["taskRepository"]);
  taskRepository.forEach(function (task) {
    $(".item-holder").append($(taskString(task)));
  })
}


/**
 * Finds recording task element, stops recording and returns task ID.
 * @returns {*}
 */
function findAndStopRecordingTask() {
  let recordingTaskElements = $('.recording-item.recording');
  if (recordingTaskElements.length !== 0) {
    let task = findRecordingTask();
    stopTask(task);
    return task.id;
  }
}

/**
 * Finds recording task element and returns task.
 * @returns {*}
 */
function findRecordingTask() {
  let recordingTaskElements = $('.recording-item.recording');
  if (recordingTaskElements.length !== 0) {
    let recordingTaskId = recordingTaskElements[0].id;
    return getTaskById(recordingTaskId);
  }
}

/**
 * Adds task to storage
 */
function addTask() {
  let task = newTask();
  // Add task to layout
  $(".item-holder").append($(taskString(task)));
  // Add task to repository
  let taskRepository = JSON.parse(localStorage["taskRepository"]);
  taskRepository.push(task);
  localStorage["taskRepository"] = JSON.stringify(taskRepository);
}

/**
 * Finds and returns task by given ID
 * @param id
 * @returns {*}
 */
function getTaskById(id) {
  let taskRepository = JSON.parse(localStorage["taskRepository"]);
  let foundTasks = [];
  taskRepository.forEach(function (task) {
    if (task.id === id) {
      foundTasks.push(clone(task));
    }
  });
  if (LOG_DEBUG)
    console.log('Found task:', foundTasks);
  return foundTasks[0];
}

function changeTaskName(task) {
  let taskRepository = JSON.parse(localStorage["taskRepository"]);
  taskRepository.forEach(function (item) {
    if (item.id === task.id) {
      // item.name = task.name
      taskRepository[taskRepository.indexOf(item)].name = task.name;
    }
  });
  localStorage["taskRepository"] = JSON.stringify(taskRepository);
}

function saveTaskTime(task) {
  let taskRepository = JSON.parse(localStorage["taskRepository"]);
  taskRepository.forEach(function (item) {
    if (item.id === task.id) {
      taskRepository[taskRepository.indexOf(item)].time = task.time;
    }
  });
  localStorage["taskRepository"] = JSON.stringify(taskRepository);
}

function hideTask(task) {
  let taskRepository = JSON.parse(localStorage["taskRepository"]);
  taskRepository.forEach(function (item) {
    if (item.id === task.id) {
      taskRepository[taskRepository.indexOf(item)].hidden = task.hidden;
    }
  });
  localStorage["taskRepository"] = JSON.stringify(taskRepository);
}

/**
 * Removes task from storage by given ID
 * @param taskId
 */
function removeTask(taskId) {
  let taskRepository = JSON.parse(localStorage["taskRepository"]);
  let indexOfTaskToRemove = -1;
  // Find task to remove
  taskRepository.forEach(function (item) {
    if (item.id === taskId) {
      indexOfTaskToRemove = taskRepository.indexOf(item);
    }
  });
  // Remove task form array
  if (indexOfTaskToRemove > -1) {
    taskRepository.splice(indexOfTaskToRemove, 1);
  }
  localStorage["taskRepository"] = JSON.stringify(taskRepository);
}

/**
 * Clone task
 *
 * @param task
 * @returns
 */
function clone(task) {
  return {
    id: task.id,
    name: task.name,
    time: task.time,
    hidden: task.hidden,
    created: task.created
  };
}

/**
 * Transforms task to task element
 *
 * @param task
 * @returns {string}
 */
function taskString(task) {
  let name = task.name;
  let timeString = task.time.toString().toTime();
  return `<div id="${task.id}" class="recording-item button noselect"><div class="status"></div><div class="time noselect">${timeString}</div><div class="name noselect" title="Click to change name">${name}</div><div class="remove noselect" title="Remove from list">&#10799;</div></div>`;
}

/**
 * Creates new task
 *
 * @returns {{created: Date, name: *, id: *, time: *}}
 */
function newTask() {
  return task(uuidv4(), "Change name", 0);
}


function task(id, name, time) {
  return {
    id: id,
    name: name,
    time: time,
    hidden: false,
    created: new Date()
  };
}

/**
 * Creates UUID
 * @returns {void | string | *}
 */
function uuidv4() {
  return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
    (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
  );
}

/**
 * Transforms time in seconds to tile string.
 * For example: 12345 --> 3:25:45
 *
 * @returns {string}
 */
String.prototype.toTime = function () {
  let timeInSec = parseInt(this, 10);
  let hours = Math.floor(timeInSec / 3600);
  let minutes = Math.floor((timeInSec - (hours * 3600)) / 60);
  let seconds = timeInSec - (hours * 3600) - (minutes * 60);

  if (hours >= 1 && minutes < 10) {
    minutes = "0" + minutes;
  }
  if (seconds < 10) {
    seconds = "0" + seconds;
  }
  if (hours > 0) {
    return hours + ':' + minutes + ':' + seconds;
  } else {
    return minutes + ':' + seconds;
  }
};