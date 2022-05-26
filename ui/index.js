loadIndex();
preloadConfigs();

var clickable = {
    'workfinder': ['topnav-workfinder', 'nav-workfinder'],
    'calendar': ['topnav-calendar', 'nav-calendar'],
    'faq': ['topnav-faq'],
    'completework': ['complete-work']
}

for (const str in clickable) {
    for (pattern of clickable[str]) {
        var elem = document.getElementById(pattern);
        if (elem != null) {
            elem.addEventListener('click', () => {
                loadPage(str + '.html');
            });
        }
    }
}

// Loads options on app click
function appLoader() {
    var apps = document.getElementById('applicationMenu').children;
    for (let i = 0; i < apps.length; i++) {
        if (apps[i].className != 'app') continue;
        var img = apps[i].getElementsByTagName("img")[0];
        if (img.className == 'comingSoon') continue;
        img.addEventListener('click', (e) => {
            removeEffects(apps, document.getElementById('optionsContainer'));
            apps[i].getElementsByTagName("img")[0].style = "outline: 3px solid rgb(44, 247, 17);";
            optionsLoader(e, apps[i]);
        })
    }
}

function removeEffects(apps, optionsContainer) {
    for (let x = 0; x < apps.length; x++) {
        if (apps[x].className != 'app') continue;
        if (apps[x].getElementsByTagName("img")[0].className == 'comingSoon') continue;
        apps[x].getElementsByTagName("img")[0].style = "";
    }

    for (let x = 0; x < optionsContainer.children.length; x++) {
        optionsContainer.children[x].style = "display: none;";
    }
}

function optionsLoader(event, app) {
    var appName = app.getElementsByTagName('div')[0].innerHTML;
    var appElem = document.getElementById(appName);
    var options = appElem.firstChild;
    var children = options.children;
    var info = document.getElementById('info');
    info.style = "display: block;";
    info.children[0].innerHTML = "For " + appName + ":";
    appElem.style = "display: block;";
    for (let i = 0; i < children.length; i++) {
        children[i].addEventListener('click', () => {
            optionsHandler(children[i]);
        });
    }
}

function optionsHandler(optionClicked) {
    var option = optionClicked.parentElement.parentElement.id + "-" + optionClicked.id;
    switch (option) {
        case "Canvas-1":
            // Track your assignments
            configure(option);
            break;
        case "Canvas-2":
            // Enable auto due-date
            configure(option, document.getElementById(option + "-1").getElementById('2-1-dropdown').innerHTML);
            break;
        case "Canvas-3":
            // Track a module
            break;
        case "OneNote-1":
            // Track a folder
            break;
        case "OneNote-2":
            // Enable auto due-date
            configure(option, document.getElementById(option + "-1").getElementById('2-1-dropdown').innerHTML);
            break;
        case "OneNote-3":
            // Upload a document
            break;
        default:
            console.log("Option Unhandled: " + optionClicked.id);
    }
}

function preloadConfigs() {
    var path = window.location.pathname;
    var page = path.split("/").pop();
    if (page != "workfinder.html") { return; }
    appLoader();
    getConfigs();
}