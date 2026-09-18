const usersContainer = document.getElementById("usersContainer");
const allProfilesContainer = document.getElementById("allProfilesContainer");

function formatMemberSince(isoString) {
    if (!isoString) return "recently";
    return new Date(isoString).toLocaleDateString(undefined, { month: "short", year: "numeric" });
}

function renderUserRow(user, extraHtml = "") {
    return `
        <div class="user-row" data-username="${user.username}" style="cursor:pointer">
            ${user.avatar_url
                ? `<img src="${user.avatar_url}" class="user-avatar" alt="">`
                : `<div class="user-avatar">${user.username.charAt(0).toUpperCase()}</div>`}
            <span class="user-name">${user.username}</span>
            ${extraHtml}
        </div>
    `;
}

function ensureUserModal() {
    if (document.getElementById("userDetailModal")) return;
    const modal = document.createElement("div");
    modal.id = "userDetailModal";
    modal.className = "user-modal-overlay";
    modal.innerHTML = `<div class="user-modal-card"><button type="button" class="user-modal-close" id="userModalClose">×</button><div id="userModalBody"></div></div>`;
    document.body.appendChild(modal);
    modal.addEventListener("click", (e) => { if (e.target === modal) modal.style.display = "none"; });
    document.getElementById("userModalClose").addEventListener("click", () => { modal.style.display = "none"; });
}

async function openUserDetail(username) {
    ensureUserModal();
    const modal = document.getElementById("userDetailModal");
    const body = document.getElementById("userModalBody");
    body.innerHTML = "<p>Loading…</p>";
    modal.style.display = "flex";
    try {
        const response = await fetch(`/api/admin/user/${encodeURIComponent(username)}`);
        const user = await response.json();
        if (!response.ok) { body.innerHTML = `<p class="lists-empty">${user.error || "Couldn't load."}</p>`; return; }
        body.innerHTML = `
            <div class="user-modal-header">
                ${user.avatar_url ? `<img src="${user.avatar_url}" class="profile-avatar-img" alt="">` : `<div class="profile-avatar">${user.username.charAt(0).toUpperCase()}</div>`}
                <h2>${user.username}${user.is_admin ? " (admin)" : ""}</h2>
            </div>
            <p class="profile-field"><strong>Email</strong>${user.email || "—"}</p>
            <p class="profile-field"><strong>Bio</strong>${user.bio || "—"}</p>
            <p class="profile-field"><strong>Member since</strong>${formatMemberSince(user.member_since)}</p>
            <p class="profile-field"><strong>Books borrowed</strong>${user.books_borrowed}</p>
            <p class="profile-field"><strong>Favorites</strong>${user.favorites_count}</p>
            <p class="profile-field"><strong>Last active</strong>${user.last_seen ? formatMemberSince(user.last_seen) : "never"}</p>
        `;
    } catch (error) {
        body.innerHTML = `<p class="lists-empty">Couldn't reach the server.</p>`;
    }
}

async function loadDevSettings() {
    try {
        const response = await fetch("/api/admin/settings");
        const settings = await response.json();
        const toggleBtn = document.getElementById("maintenanceToggleBtn");
        toggleBtn.textContent = settings.maintenance_mode ? "On" : "Off";
        toggleBtn.classList.toggle("dev-btn-on", settings.maintenance_mode);
        document.getElementById("customCssInput").value = settings.custom_css || "";
        document.getElementById("footerTextInput").value = settings.footer_text || "";
    } catch (error) {}
}

function wireDevPanel() {
    document.getElementById("maintenanceToggleBtn").addEventListener("click", async (e) => {
        const btn = e.target;
        const turningOn = btn.textContent === "Off";
        const response = await fetch("/api/admin/settings/maintenance", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ on: turningOn }) });
        if (response.ok) { btn.textContent = turningOn ? "On" : "Off"; btn.classList.toggle("dev-btn-on", turningOn); }
    });
    document.getElementById("saveCssBtn").addEventListener("click", async () => {
        const css = document.getElementById("customCssInput").value;
        const response = await fetch("/api/admin/settings/css", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ css }) });
        if (response.ok) alert("Custom CSS saved — refresh any page to see it applied.");
    });
    document.getElementById("saveFooterBtn").addEventListener("click", async () => {
        const footerText = document.getElementById("footerTextInput").value;
        const response = await fetch("/api/admin/settings/footer", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ footer_text: footerText }) });
        if (response.ok) alert("Footer text saved — refresh any page to see it.");
    });
    document.getElementById("downloadDataBtn").addEventListener("click", async () => {
        const response = await fetch("/api/admin/export");
        if (!response.ok) return;
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = "national-library-export.json"; a.click();
        URL.revokeObjectURL(url);
    });
    document.getElementById("deleteAllBtn").addEventListener("click", async () => {
        const confirmInput = document.getElementById("deleteConfirmInput");
        if (confirmInput.value !== "DELETE") { alert('Type "DELETE" exactly first.'); return; }
        if (!confirm("This permanently deletes every non-admin account and all their data. Continue?")) return;
        const response = await fetch("/api/admin/delete-all", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ confirm: "DELETE" }) });
        const data = await response.json();
        alert(data.message || data.error);
        confirmInput.value = "";
    });
}

async function init() {
    let me;
    try { me = await (await fetch("/api/me")).json(); } catch (error) { me = { logged_in: false }; }
    if (!me.logged_in) { window.location.href = "/login.html"; return; }
    if (!me.is_admin) { window.location.href = "/homepage.html"; return; }

    try {
        const users = await (await fetch("/api/users")).json();
        usersContainer.innerHTML = `<p class="lists-empty" style="opacity:0.6;font-size:12px;margin-bottom:10px;">Active in the last ${10} minutes</p>` + users.map((u) => renderUserRow(u)).join("");
    } catch (error) {
        usersContainer.innerHTML = `<p class="lists-empty">Couldn't load users right now.</p>`;
    }

    try {
        const profiles = await (await fetch("/api/admin/profiles")).json();
        allProfilesContainer.innerHTML = profiles.map((p) => renderUserRow(p, `<span style="margin-left:auto; opacity:0.6; font-size:12px;">Since ${formatMemberSince(p.member_since)} · ${p.books_borrowed} borrowed</span>`)).join("");
    } catch (error) {
        allProfilesContainer.innerHTML = `<p class="lists-empty">Couldn't load profiles right now.</p>`;
    }

    usersContainer.addEventListener("click", (e) => { const row = e.target.closest(".user-row"); if (row) openUserDetail(row.dataset.username); });
    allProfilesContainer.addEventListener("click", (e) => { const row = e.target.closest(".user-row"); if (row) openUserDetail(row.dataset.username); });

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
