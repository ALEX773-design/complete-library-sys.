// Shared hamburger menu + account drawer behavior for every page.

const menuButton = document.getElementById("menuButton");
const menuBox = document.getElementById("menuBox");
const accountButton = document.getElementById("accountButton");
const accountBox = document.getElementById("accountBox");

function closeMenu() {
    menuBox.classList.remove("open");
}

function closeAccount() {
    accountBox.classList.remove("open");
}

menuButton.addEventListener("click", (e) => {
    e.stopPropagation();
    const opening = !menuBox.classList.contains("open");
    closeAccount();
    menuBox.classList.toggle("open", opening);
});

accountButton.addEventListener("click", (e) => {
    e.stopPropagation();
    const opening = !accountBox.classList.contains("open");
    closeMenu();
    accountBox.classList.toggle("open", opening);
});

// Close when click elsewhere

document.addEventListener("click", (e) => {
    if (!menuBox.contains(e.target)) closeMenu();
    if (!accountBox.contains(e.target)) closeAccount();
});
document.getElementById("logoutLink")?.addEventListener("click", async (e) => {
    e.preventDefault();
    await fetch("/api/logout", { method: "POST" });
    window.location.href = "/login.html";
});
