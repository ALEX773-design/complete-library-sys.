let favoriteIds = [];

async function loadFavorites() {
    try {
        const response = await fetch("/api/favorites");
        favoriteIds = response.status === 401 ? [] : await response.json();
    } catch (error) {
        favoriteIds = [];
    }
}

function getFavoriteIds() {
    return favoriteIds;
}

function isFavorite(bookId) {
    return favoriteIds.includes(bookId);
}

async function toggleFavorite(bookId) {
    const wasFavorite = isFavorite(bookId);
    const method = wasFavorite ? "DELETE" : "POST";

    const response = await fetch(`/api/favorites/${bookId}`, { method });
    if (response.status === 401) {
        window.location.href = "/login.html";
        return wasFavorite;
    }

    favoriteIds = wasFavorite
        ? favoriteIds.filter((id) => id !== bookId)
        : [...favoriteIds, bookId];

    return !wasFavorite;
}

function refreshFavoriteButtons() {
    document.querySelectorAll(".favorite-btn").forEach((button) => {
        const active = isFavorite(button.dataset.bookId);
        button.classList.toggle("active", active);
        button.textContent = active ? "♥" : "♡";
    });
}

document.addEventListener("click", async (e) => {
    const button = e.target.closest(".favorite-btn");
    if (!button) return;
    await toggleFavorite(button.dataset.bookId);
    refreshFavoriteButtons();
});

document.addEventListener("DOMContentLoaded", async () => {
    await loadFavorites();
    refreshFavoriteButtons();
});