const profileContainer = document.getElementById("profileContainer");
let currentProfile = null;

function formatMemberSince(isoString) {
    if (!isoString) return "recently";
    return new Date(isoString).toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

async function loadProfile() {
    let profile;
    try {
        const response = await fetch("/api/profile");
        if (response.status === 401) {
            window.location.href = "/login.html";
            return;
        }
        profile = await response.json();
    } catch (error) {
        profileContainer.innerHTML = `<p class="lists-empty">Couldn't load your profile right now.</p>`;
        return;
    }
    currentProfile = profile;
    renderProfile();
}

function renderProfile() {
    const profile = currentProfile;
    profileContainer.innerHTML = `
        <div class="profile-card">
            <div class="profile-avatar-wrap">
                ${profile.avatar_url
                    ? `<img src="${profile.avatar_url}" class="profile-avatar-img" alt="Profile picture">`
                    : `<div class="profile-avatar">${profile.username.charAt(0).toUpperCase()}</div>`}
                <label class="avatar-upload-btn" for="avatarInput">Change photo</label>
                <input type="file" id="avatarInput" accept="image/png, image/jpeg, image/webp" hidden>
            </div>
            <div class="profile-fields">
                <p class="profile-field"><strong>Username</strong>${profile.username}</p>
                <p class="profile-field"><strong>Member since</strong>${formatMemberSince(profile.member_since)}</p>
                <p class="profile-field"><strong>Books borrowed (all time)</strong>${profile.books_borrowed}</p>
            </div>
        </div>
        <p id="avatarError" class="auth-error"></p>

        <section class="profile-edit-section">
            <h2>About</h2>
            <label class="profile-label">Email</label>
            <input type="email" id="emailInput" class="profile-input" value="${profile.email || ""}" placeholder="you@example.com">
            <label class="profile-label">Bio</label>
            <textarea id="bioInput" class="profile-input profile-textarea" placeholder="Tell other members a bit about yourself">${profile.bio || ""}</textarea>
            <button type="button" id="saveProfileBtn" class="profile-save-btn">Save Changes</button>
            <p id="profileSaveMsg" class="profile-save-msg"></p>
        </section>

        <section class="profile-edit-section">
            <h2>Change Password</h2>
            <label class="profile-label">Current Password</label>
            <input type="password" id="currentPasswordInput" class="profile-input">
            <label class="profile-label">New Password</label>
            <input type="password" id="newPasswordInput" class="profile-input">
            <button type="button" id="changePasswordBtn" class="profile-save-btn">Change Password</button>
            <p id="passwordMsg" class="profile-save-msg"></p>
        </section>
    `;

    document.getElementById("avatarInput").addEventListener("change", handleAvatarUpload);
    document.getElementById("saveProfileBtn").addEventListener("click", handleSaveProfile);
    document.getElementById("changePasswordBtn").addEventListener("click", handleChangePassword);
}

async function handleAvatarUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    const errorEl = document.getElementById("avatarError");
    errorEl.textContent = "";

    const formData = new FormData();
    formData.append("avatar", file);

    try {
        const response = await fetch("/api/profile-picture", { method: "POST", body: formData });
        const data = await response.json();
        if (!response.ok) {
            errorEl.textContent = data.error || "Upload failed";
            return;
        }
        await loadProfile();
        if (typeof applyLoginState === "function") applyLoginState();
    } catch (error) {
        errorEl.textContent = "Couldn't reach the server";
    }
}

async function handleSaveProfile() {
    const msgEl = document.getElementById("profileSaveMsg");
    msgEl.textContent = "";
    const email = document.getElementById("emailInput").value;
    const bio = document.getElementById("bioInput").value;

    try {
        const response = await fetch("/api/profile", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, bio }),
        });
        const data = await response.json();
        msgEl.textContent = response.ok ? "Saved." : (data.error || "Couldn't save");
        msgEl.className = response.ok ? "profile-save-msg success" : "profile-save-msg error";
    } catch (error) {
        msgEl.textContent = "Couldn't reach the server";
        msgEl.className = "profile-save-msg error";
    }
}

async function handleChangePassword() {
    const msgEl = document.getElementById("passwordMsg");
    msgEl.textContent = "";
    const currentPassword = document.getElementById("currentPasswordInput").value;
    const newPassword = document.getElementById("newPasswordInput").value;

    try {
        const response = await fetch("/api/change-password", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
        });
        const data = await response.json();
        msgEl.textContent = response.ok ? "Password changed." : (data.error || "Couldn't change password");
        msgEl.className = response.ok ? "profile-save-msg success" : "profile-save-msg error";
        if (response.ok) {
            document.getElementById("currentPasswordInput").value = "";
            document.getElementById("newPasswordInput").value = "";
        }
    } catch (error) {
        msgEl.textContent = "Couldn't reach the server";
        msgEl.className = "profile-save-msg error";
    }
}

loadProfile();
