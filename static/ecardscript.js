async function initEcard() {
    let profile;
    try {
        const response = await fetch("/api/profile");
        if (response.status === 401) {
            window.location.href = "/login.html";
            return;
        }
        profile = await response.json();
    } catch (error) {
        return;
    }

    const paddedId = String(profile.user_id).padStart(6, "0");
    const memberYear = profile.member_since
        ? new Date(profile.member_since).getFullYear()
        : new Date().getFullYear();

    document.getElementById("memberName").textContent = profile.username;
    document.getElementById("memberId").textContent = `NL-${paddedId}`;
    document.getElementById("memberSince").textContent = memberYear;
    document.getElementById("cardNumber").textContent = `NL • ${memberYear} • ${paddedId}`;

    if (profile.avatar_url) {
        const photoPlaceholder = document.querySelector(".photo-placeholder");
        photoPlaceholder.innerHTML = `<img src="${profile.avatar_url}" alt="" style="width:100%; height:100%; object-fit:cover; border-radius:50%;">`;
    }
}

initEcard();
