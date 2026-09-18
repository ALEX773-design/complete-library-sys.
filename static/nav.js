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

document.addEventListener("click", (e) => {
    if (!menuBox.contains(e.target)) closeMenu();
    if (!accountBox.contains(e.target)) closeAccount();
});

// ---------- Login state ----------
// Swaps the account button's icon (profile picture / initial / default)
// and the Log In vs Log Out link, based on whatever /api/me reports.
// Also shows/hides any element marked data-requires-admin, so admin-only
// links (like Users) never appear for non-admins, without each page
// needing its own check.

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
// for DOMContentLoaded, which fires once the whole page (footer included)
// has been parsed.

function loadFooterText() {
    const footerEl = document.getElementById("footerText");
    if (!footerEl) return;
    fetch("/api/footer")
        .then((response) => response.json())
        .then((data) => { footerEl.textContent = data.footer_text || ""; })
        .catch(() => {});
}

document.addEventListener("DOMContentLoaded", loadFooterText);
