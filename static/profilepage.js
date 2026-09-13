const profileContainer = document.getElementById("profileContainer");

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
    `;

    document.getElementById("avatarInput").addEventListener("change", handleAvatarUpload);
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

        loadProfile();
        if (typeof applyLoginState === "function") applyLoginState();
    } catch (error) {
        errorEl.textContent = "Couldn't reach the server";
    }
}

loadProfile();
