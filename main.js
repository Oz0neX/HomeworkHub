var level = require('level');
var norcal = require('norcal');
var hyperlog = require('hyperlog');
var parse = require('parse-messy-schedule');
const { app, BrowserWindow, ipcMain } = require('electron')
const { promisify } = require('util');
const path = require('path');
const sleep = promisify(setTimeout);
const Canvas = require("@kth/canvas-api").default;
const apiToken = process.env.CANVAS_API_TOKEN;
const apiUrl = process.env.CANVAS_API_URL;
var mydb = new level('mydb');
const notifier = require('node-notifier');

var cal = norcal({
    log: hyperlog(new level('logdb'), { valueEncoding: 'json' }),
    db: mydb
});

const createWindow = () => {
    const win = new BrowserWindow({
        width: 1366,
        height: 786,
        show: false,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });
    win.maximize();
    win.show();
    win.loadFile('ui/loading.html');
    return win;
}

app.whenReady().then(() => {
    var win = createWindow();
    ipcMain.on('load-page', (event, page) => {
        win.loadFile('ui/' + page);
    });
    runner(); // Infinte loop
    runner2(); // Also an infinite loop
})

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

ipcMain.on('get-canvas-task', (event, courseId, assignmentId) => {
    function response(dat) {
        event.sender.send('get-canvas-task', dat);
    }
    if (courseId == null || assignmentId == null) {
        response('{"success": false}');
    } else {
        getCanvasTask(courseId, assignmentId, (err, data) => {
            // TODO: Error handling?
            response(data);
        });
    }
});

// TODO: Fix whatever this does lmao
ipcMain.on('get-calendar-task', (event, taskName) => {
    mydb.get(taskName, (err, value) => {
        event.sender.send('get-calendar-task', value);
    });
});

// Configurations encoded in JSON
ipcMain.on('all-configurations', (event) => {
    mydb.get('all-configurations', (err, value) => {
        if (err != null) {
            var def = JSON.stringify({
                "Canvas-1": false,
                "Canvas-2-1": {
                    "enable": false,
                    "auto-due-days": 4
                },
                "Canvas-3-1": [{
                    "example_course_id": 24253,
                    "example_module_id": 24253
                }],
                "OneNote-1": {
                    "example_folder_id": 2407,
                },
                "OneNote-2-1": {
                    "enable": false,
                    "auto-due-days": 4
                }
            });

            mydb.put('all-configurations', def, () => {
                event.sender.send('all-configurations', def);
            });
        } else {
            event.sender.send('all-configurations', value);
        }
    });
});

ipcMain.on('update-canvas', (event) => {
    mydb.get('all-configurations', (err, value) => {
        var data = JSON.parse(value);
        if (err != null) {
            var replace = {
                "Canvas-2-1": {
                    "enable": true,
                    "auto-due-days": 7
                },
            }
            console.log("Error while getting configuration data");
            data = replace;
        }
        canvasUpdate(data["Canvas-2-1"]["auto-due-days"]).then(() => {
            event.sender.send('update-canvas');
        }, (err) => { console.log("Canvas Update Failed with err: " + err.toString()) });
    })
});

ipcMain.on('all-calendar-tasks', (event, fromStr, toStr) => {
    function response(err, docs) {
        event.sender.send('all-calendar-tasks', docs);
    }
    if (fromStr == null || toStr == null) {
        getCalendarTasks(response);
    } else {
        getCalendarTasks(new Date(fromStr), new Date(toStr), response);
    }
});



// Checks if there are any newly added canvas assignments
// if so, it updates the calendar.
async function canvasUpdate(autoDueDays) {
    console.log("Getting canvas data, please wait");
    var assignments = await getCanvasAssignments();
    if (typeof(assignments) != "object") {
        throw assignments;
    }

    getCalendarTasks((err, docs) => {
        console.log("Got canvas data & Loaded calendar, working...");
        for (assignment of assignments) {
            var found = false;
            var hasDueDate = true;
            for (data of docs) {
                if (assignment.name == data.value) {
                    found = true;
                    break;
                }
            }
            if (!found) {
                var due = assignment.due_at;
                var def = new Date();
                def.setDate(def.getDate() + autoDueDays);
                if (typeof(due) != "string") {
                    due = def.toString();
                    hasDueDate = false;
                } else {
                    var timeDiff = new Date(due).getTime() - now.getTime();
                    var diffDays = Math.ceil(timeDiff / (1000 * 3600 * 24));
                    if (diffDays < 0) {
                        continue;
                    }
                }

                mydb.put(assignment.name, JSON.stringify({
                    courseId: assignment.course_id,
                    assignmentId: assignment.id
                }));
                cal.add(due, { value: assignment.name }, () => {
                    // Tell user to update calendar? or outside of func
                    console.log("Assignment added to calendar: " + JSON.stringify(assignment.name));
                    if (!hasDueDate) {
                        console.log("WARNING: Assignment did not have due date");
                    }
                });
            }
        }
    });
}

// Gets canvas assignments and returns the assignments as an array
async function getCanvasAssignments() {
    // TODO: Replace with your own canvas instance
    var res = [];
    try {
        const canvas = new Canvas(apiUrl, apiToken);
        const { body } = await canvas.get("courses?enrollment_state=active");
        let x = 1;
        for (let course in body) {
            await sleep(2000);
            console.log("Getting assignments from course " + x + " of " + body.length);
            var assignments = "courses/" + body[course].id.toString() + "/assignments";
            const result = await canvas.get(assignments);
            const arr = result.body;
            for (let i in arr) {
                var assignment = arr[i];
                res.push(assignment);
            }
            x++;
        }
    } catch (err) {
        throw err;
    }

    return res;
}

// Returns a singular assignment and the data associated with it.
async function getCanvasTask(courseId, assignmentId, callback) {
    try {
        const canvas = new Canvas(apiUrl, apiToken);
        const { body } = await canvas.get("courses/" + courseId + "/assignments/" + assignmentId);
        callback(null, body);
    } catch (err) {
        callback(err, '{"success": false}');
    }
}

// Checks if any OneNote documents were added to a folder.
// If so, adds an automatic due date for the assignment.
function oneNoteUpdate() {

}

function clearCalendar() {
    var from = new Date()
    from.setFullYear(from.getFullYear() - 1);
    getCalendarTasks(from, new Date(), (err, docs) => {
        for (data of docs) {
            cal.remove(data.key, () => {});
        }
    });
}

function printCalendar() {
    getCalendarTasks((err, docs) => {
        for (data of docs) {
            console.log(data);
        }
        if (docs.length == 0) {
            console.log("Calendar is empty.");
        }
    });
}

function getCalendarTasks(callback) {
    var now = new Date();
    var ltr = new Date();
    ltr.setMonth(ltr.getMonth() + 5);

    getCalendarTasks(ltr, (err, docs) => {
        callback(err, docs);
    });
}

function getCalendarTasks(to, callback) {
    var now = new Date();
    var ltr = to;

    getCalendarTasks(now, to, (err, docs) => {
        callback(err, docs);
    });
}

function getCalendarTasks(from, to, callback) {
    let nowStr = (from.getMonth() + 1) + "/" + from.getDate() + "/" + from.getFullYear();
    let ltrStr = to.getMonth() + "/" + to.getDate() + "/" + to.getFullYear();

    var stream = cal.query({ gt: nowStr, lt: ltrStr }, (err, docs) => {
        callback(err, docs);
    });
}

async function runner() {
    while (true) {
        mydb.get('all-configurations', (err, value) => {
            var data = JSON.parse(value);
            if (err != null) {
                var replace = {
                    "Canvas-2-1": {
                        "enable": true,
                        "auto-due-days": 7
                    },
                }
                console.log("Error while getting configuration data");
                data = replace;
            }
            if (data["Canvas-2-1"]["enable"]) {
                canvasUpdate(data["Canvas-2-1"]["auto-due-days"]).then(() => {}, (err) => { console.log("Canvas Update Failed with err: " + err.toString()) });
            }
        });
        await sleep(300000) // 5 Minutes
    }
}

async function runner2() {
    while (true) {
        var to = new Date();
        to.setDate(to.getDate() + 1);
        getCalendarTasks(new Date(), to, (err, docs) => {
            for (task of docs) {
                notifier.notify({
                        title: '"' + task.value + '" is due soon!',
                        message: 'Assignment is due at: ' + task.time,
                        icon: path.join(__dirname, 'favicon-16x16.png'),
                        actions: ['Got It', 'Remind me later']
                    },
                    (err, data) => {
                        // Will also wait until notification is closed.
                        console.log('Waited');
                        console.log(JSON.stringify({ err, data }, null, '\t'));
                    }
                );
            }
        });
        await sleep(3600000); // 1 Hour
        // Change to 2 minutes for testing?
    }
}