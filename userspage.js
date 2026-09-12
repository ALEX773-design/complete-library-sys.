// TEMPORARY placeholder users

const MOCK_USERS = [
    "Jane Reader", "Arjun Mehta", "Priya Nair", "Tomás Rivera",
    "Wei Zhang", "Fatima Al-Sayed", "Liam O'Connor", "Chidi Okafor",
];

const usersContainer = document.getElementById("usersContainer");
const allProfilesContainer = document.getElementById("allProfilesContainer");

usersContainer.innerHTML = MOCK_USERS
    .map((name) => `
        <div class="user-row">
            <div class="user-avatar"></div>
            <span class="user-name">${name}</span>
        </div>
    `)
    .join("");

// All Profiles: replace

allProfilesContainer.innerHTML = MOCK_USERS
    .map((name, index) => `
        <div class="user-row">
            <div class="user-avatar"></div>
            <span class="user-name">${name}</span>
            <span style="margin-left:auto; opacity:0.6; font-size:12px;">MTS2026-${String(index + 1).padStart(4, "0")}</span>
        </div>
    `)
    .join("");

// Tab switching, dont replace

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
