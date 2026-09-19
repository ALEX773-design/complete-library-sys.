// Shared hamburger menu + account drawer behavior for every page.

const menuButton = document.getElementById("menuButton");
const menuBox = document.getElementById("menuBox");
const accountButton = document.getElementById("accountButton");
const accountBox = document.getElementById("accountBox");
const notifBell = document.getElementById("notifBell");
const notifDropdown = document.getElementById("notifDropdown");
const notifBadge = document.getElementById("notifBadge");
const notifList = document.getElementById("notifList");

function closeMenu() {
    menuBox.classList.remove("open");
}

function closeAccount() {
    accountBox.classList.remove("open");
}

function closeNotifDropdown() {
    if (notifDropdown) notifDropdown.classList.remove("open");
}

menuButton.addEventListener("click", (e) => {
    e.stopPropagation();
    const opening = !menuBox.classList.contains("open");
    closeAccount();
    closeNotifDropdown();
    menuBox.classList.toggle("open", opening);
});

accountButton.addEventListener("click", (e) => {
    e.stopPropagation();
    const opening = !accountBox.classList.contains("open");
    closeMenu();
    closeNotifDropdown();
    accountBox.classList.toggle("open", opening);
});

if (notifBell && notifDropdown) {
    notifBell.addEventListener("click", (e) => {
        e.stopPropagation();
        const opening = !notifDropdown.classList.contains("open");
        closeMenu();
        closeAccount();
        notifDropdown.classList.toggle("open", opening);
        if (opening) markNotificationsRead();
    });
}

document.addEventListener("click", (e) => {
    if (!menuBox.contains(e.target)) closeMenu();
    if (!accountBox.contains(e.target)) closeAccount();
    if (notifDropdown && !notifDropdown.contains(e.target) && e.target !== notifBell) closeNotifDropdown();
});

// ---------- Login state ----------
// Swaps the account button's icon (profile picture / initial / default)
// and the Log In vs Log Out link, based on whatever /api/me reports.
// Also shows/hides elements marked data-requires-admin or data-requires-login.

async function applyLoginState() {
    let state = { logged_in: false };
    try {
        const response = await fetch("/api/me");
        state = await response.json();
    } catch (error) {
        // Network hiccup — fall back to logged-out appearance.
    }

    if (state.logged_in && state.avatar_url) {
        accountButton.innerHTML = `<img src="${state.avatar_url}" class="account-avatar-img" alt="Profile picture">`;
    } else if (state.logged_in) {
        const initial = state.username ? state.username.charAt(0).toUpperCase() : "◉";
        accountButton.innerHTML = `<span class="account-avatar-initial">${initial}</span>`;
    } else {
        accountButton.innerHTML = "◉";
    }

    const accountContent = document.querySelector(".account-content");
    const existingAuthLink = accountContent.querySelector("#logoutLink, #loginLink");
    if (existingAuthLink) existingAuthLink.remove();

    const authLink = document.createElement("a");
    if (state.logged_in) {
        authLink.href = "#";
        authLink.id = "logoutLink";
        authLink.textContent = "Log Out";
        authLink.addEventListener("click", async (e) => {
            e.preventDefault();
            await fetch("/api/logout", { method: "POST" });
            window.location.href = "/login.html";
        });
    } else {
        authLink.href = "/login.html";
        authLink.id = "loginLink";
        authLink.textContent = "Log In";
    }
    accountContent.appendChild(authLink);

    const isAdmin = state.logged_in && state.is_admin;
    document.querySelectorAll("[data-requires-admin]").forEach((el) => {
        el.classList.toggle("admin-only-hidden", !isAdmin);
    });

    document.querySelectorAll("[data-requires-login]").forEach((el) => {
        el.classList.toggle("login-only-hidden", !state.logged_in);
    });

    if (state.logged_in) loadNotifications();
}

applyLoginState();

// ---------- Admin custom CSS ----------
// Loaded on every page since every page already includes nav.js.

(async function loadCustomCss() {
    try {
        const response = await fetch("/custom.css");
        const css = await response.text();
        if (css.trim()) {
            const style = document.createElement("style");
            style.id = "admin-custom-css";
            style.textContent = css;
            document.head.appendChild(style);
        }
    } catch (error) {}
})();

// ---------- Footer text ----------
// footer.html is included AFTER this script tag in every template, so the
// #footerText element doesn't exist yet when this file first runs. Wait
// for DOMContentLoaded, which fires once the whole page has been parsed.

function loadFooterText() {
    const footerEl = document.getElementById("footerText");
    if (!footerEl) return;
    fetch("/api/footer")
        .then((response) => response.json())
        .then((data) => { footerEl.textContent = data.footer_text || ""; })
        .catch(() => {});
}

document.addEventListener("DOMContentLoaded", loadFooterText);

// ---------- Notifications ----------

function formatNotifTime(isoString) {
    if (!isoString) return "";
    return new Date(isoString).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

async function loadNotifications() {
    if (!notifList) return;
    try {
        const notifications = await (await fetch("/api/notifications")).json();
        const unreadCount = notifications.filter((n) => !n.read).length;
        if (notifBadge) {
            notifBadge.textContent = unreadCount;
            notifBadge.style.display = unreadCount > 0 ? "flex" : "none";
        }
        notifList.innerHTML = notifications.length
            ? notifications.map((n) => `
                <div class="notif-item ${n.read ? "" : "notif-unread"}">
                    <p>${n.message}</p>
                    <span class="notif-time">${formatNotifTime(n.created_at)}</span>
                </div>
            `).join("")
            : `<p class="lists-empty" style="padding:12px;">No notifications yet.</p>`;
    } catch (error) {
        notifList.innerHTML = `<p class="lists-empty" style="padding:12px;">Couldn't load notifications.</p>`;
    }
}

async function markNotificationsRead() {
    try {
        await fetch("/api/notifications/read-all", { method: "POST" });
        if (notifBadge) notifBadge.style.display = "none";
        document.querySelectorAll(".notif-unread").forEach((el) => el.classList.remove("notif-unread"));
    } catch (error) {}
}
