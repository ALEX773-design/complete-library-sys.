const usersContainer = document.getElementById("usersContainer");
const allProfilesContainer = document.getElementById("allProfilesContainer");

function formatMemberSince(isoString) {
    if (!isoString) return "recently";
    return new Date(isoString).toLocaleDateString(undefined, { month: "short", year: "numeric" });
}

function renderUserRow(user, extraHtml = "") {
    return `
        <div class="user-row">
            ${user.avatar_url
                ? `<img src="${user.avatar_url}" class="user-avatar" alt="">`
                : `<div class="user-avatar">${user.username.charAt(0).toUpperCase()}</div>`}
            <span class="user-name">${user.username}</span>
            ${extraHtml}
        </div>
    `;
}

async function loadDevSettings() {
    try {
        const response = await fetch("/api/admin/settings");
        const settings = await response.json();
        const toggleBtn = document.getElementById("maintenanceToggleBtn");
        toggleBtn.textContent = settings.maintenance_mode ? "On" : "Off";
        toggleBtn.classList.toggle("dev-btn-on", settings.maintenance_mode);
        document.getElementById("customCssInput").value = settings.custom_css || "";
    } catch (error) {}
}

function wireDevPanel() {
    document.getElementById("maintenanceToggleBtn").addEventListener("click", async (e) => {
        const btn = e.target;
        const turningOn = btn.textContent === "Off";
        const response = await fetch("/api/admin/settings/maintenance", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ on: turningOn }),
        });
        if (response.ok) {
            btn.textContent = turningOn ? "On" : "Off";
            btn.classList.toggle("dev-btn-on", turningOn);
        }
    });

    document.getElementById("saveCssBtn").addEventListener("click", async () => {
        const css = document.getElementById("customCssInput").value;
        const response = await fetch("/api/admin/settings/css", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ css }),
        });
        if (response.ok) alert("Custom CSS saved — refresh any page to see it applied.");
    });

    document.getElementById("downloadDataBtn").addEventListener("click", async () => {
        const response = await fetch("/api/admin/export");
        if (!response.ok) return;
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "national-library-export.json";
        a.click();
        URL.revokeObjectURL(url);
    });

    document.getElementById("deleteAllBtn").addEventListener("click", async () => {
        const confirmInput = document.getElementById("deleteConfirmInput");
        if (confirmInput.value !== "DELETE") {
            alert('Type "DELETE" exactly in the box first.');
            return;
        }
        if (!confirm("This permanently deletes every non-admin account and all their data. Continue?")) return;

        const response = await fetch("/api/admin/delete-all", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ confirm: "DELETE" }),
        });
        const data = await response.json();
        alert(data.message || data.error);
        confirmInput.value = "";
    });
}

async function init() {
    let me;
    try {
        const response = await fetch("/api/me");
        me = await response.json();
    } catch (error) {
        me = { logged_in: false };
    }

    if (!me.logged_in) { window.location.href = "/login.html"; return; }
    if (!me.is_admin) { window.location.href = "/homepage.html"; return; }

    try {
        const usersResponse = await fetch("/api/users");
        const users = await usersResponse.json();
        usersContainer.innerHTML = users.map((u) => renderUserRow(u)).join("");
    } catch (error) {
        usersContainer.innerHTML = `<p class="lists-empty">Couldn't load users right now.</p>`;
    }

    try {
        const profilesResponse = await fetch("/api/admin/profiles");
        const profiles = await profilesResponse.json();
        allProfilesContainer.innerHTML = profiles.map((p) => renderUserRow(
            p,
            `<span style="margin-left:auto; opacity:0.6; font-size:12px;">Since ${formatMemberSince(p.member_since)} · ${p.books_borrowed} borrowed</span>`
        )).join("");
    } catch (error) {
        allProfilesContainer.innerHTML = `<p class="lists-empty">Couldn't load profiles right now.</p>`;
    }

    loadDevSettings();
    wireDevPanel();
}

const tabs = document.querySelectorAll(".admin-tab");
const panels = document.querySelectorAll(".admin-panel-section");
tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
        tabs.forEach((t) => t.classList.remove("active"));
        panels.forEach((p) => p.classList.remove("active"));
        tab.classList.add("active");
        document.getElementById(tab.dataset.panel).classList.add("active");
    });
});

init();
