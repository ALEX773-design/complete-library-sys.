// Shared Favorites 

const FAVORITES_STORAGE_KEY = "nl_favorites";

function getFavorites() {
    try {
        const raw = localStorage.getItem(FAVORITES_STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch (error) {
        console.error("Failed to read favorites from storage:", error);
        return [];
    }
}

function saveFavorites(favorites) {
    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favorites));
}

function isFavorite(bookId) {
    return getFavorites().includes(bookId);
}

function toggleFavorite(bookId) {
    const favorites = getFavorites();
    const index = favorites.indexOf(bookId);

    if (index === -1) favorites.push(bookId);
    else favorites.splice(index, 1);

    saveFavorites(favorites);
    return index === -1; // true if it was just added
}

// Any card with <button class="favorite-btn" data-book-id="b01">♡</button>
// gets wired up automatically, and reflects saved state on page load.

function refreshFavoriteButtons() {
    document.querySelectorAll(".favorite-btn").forEach((button) => {
        const active = isFavorite(button.dataset.bookId);
        button.classList.toggle("active", active);
        button.textContent = active ? "♥" : "♡";
    });
}

document.addEventListener("click", (e) => {
    const button = e.target.closest(".favorite-btn");
    if (!button) return;

    toggleFavorite(button.dataset.bookId);
    refreshFavoriteButtons();
});

document.addEventListener("DOMContentLoaded", refreshFavoriteButtons);
