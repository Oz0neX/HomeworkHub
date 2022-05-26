const electron = require('electron');
const ipc = electron.ipcRenderer;

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function loadPage(page) {
    ipc.send('load-page', page);
}

function loadIndex() {
    var path = window.location.pathname;
    var page = path.split("/").pop();
    if (page != "loading.html") { return; }
    setTimeout(() => { loadPage('index.html') }, 5000);
}

function configure(option, ...params) {
    ipc.send('configure', option, params);
}

function getConfigs() {
    ipc.send('all-configurations')
}

ipc.on('all-configurations', (event, data) => {
    var configs = JSON.parse(data);
    var cnvsOpts = document.getElementById("Canvas").children[0];
    var onteOpts = document.getElementById("OneNote").children[0]; // OneNote

    var cnvsOpt1 = cnvsOpts.querySelector("#one").querySelector("#Canvas-1-status")
    cnvsOpt1.innerHTML = configs["Canvas-1"] ? (cnvsOpt1.style = "color: lightgreen;", "ON") : (cnvsOpt1.style = "color: red;", "OFF");
    var cnvsOpt2 = cnvsOpts.querySelector("#two").querySelector("#Canvas-2-status")
    cnvsOpt2.innerHTML = configs["Canvas-2-1"]["enable"] ? (cnvsOpt2.style = "color: lightgreen;", "ON") : (cnvsOpt2.style = "color: red;", "OFF");
    var onteOpt2 = onteOpts.querySelector("#two").querySelector("#OneNote-2-status");
    onteOpt2.innerHTML = configs["OneNote-2-1"]["enable"] ? (onteOpt2.style = "color: lightgreen;", "ON") : (onteOpt2.style = "color: red;", "OFF");;
});