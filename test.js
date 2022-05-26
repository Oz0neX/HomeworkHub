const Canvas = require("@kth/canvas-api").default;
const apiToken = "11642~tIkNQDyuJOXwj2tOIguvFD0RhPzMa2pLhsHltuoUI7kgihBUxCuKrDtDZF1NXShc";

// Test function
async function start() {
    // TODO: Replace with your own canvas instance
    const canvas = new Canvas("https://ecrchs.instructure.com/api/v1/", apiToken);
    const { body } = await canvas.get("courses?enrollment_state=active");
    for (let course in body) {
        var assignments = "courses/" + body[course].id.toString() + "/assignments";
        const result = await canvas.get(assignments);
        const arr = result.body;
        for (let assignment in arr) {
            var due = arr[assignment].due_at;
            var dueDate = new Date(due);
            var today = new Date();
            var timeDiff = dueDate.getTime() - today.getTime();
            var diffDays = Math.ceil(timeDiff / (1000 * 3600 * 24));
            if (diffDays == 0) {
                console.log("Assignment: " + arr[assignment].name + " is due today!");
            } else if (diffDays == 1) {
                console.log("Assignment: " + arr[assignment].name + " is due tomorrow!");
            } else if (diffDays < 0) {
                //console.log("Assignment: " + arr[assignment].name + " is overdue!");
            } else {
                console.log("Assignment: " + arr[assignment].name + " is due in " + diffDays + " days!");
            }
        }
    }
}

start();
// TODO: Check substack/norcal for help with calendar