// Night mode 
const NIGHT_MODE_KEY = "nl_night_mode";

function isNightModeOn() {
    return localStorage.getItem(NIGHT_MODE_KEY) === "true";
}

function applyNightMode() {
    document.documentElement.classList.toggle("night-mode", isNightModeOn());
}

function setNightMode(on) {
    localStorage.setItem(NIGHT_MODE_KEY, on ? "true" : "false");
    applyNightMode();
}

function toggleNightMode() {
    setNightMode(!isNightModeOn());
}

applyNightMode();
