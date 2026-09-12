let allBooks = [];
const favoritesContainer = document.getElementById("favoritesContainer");

async function init() {
    try {
        const booksResponse = await fetch("/static/books.json");
        allBooks = await booksResponse.json();
        await loadFavorites();
        renderFavorites();
    } catch (error) {
        favoritesContainer.innerHTML = `<p class="lists-empty">Couldn't load the library right now.</p>`;
    }
}

function renderFavorites() {
    const ids = getFavoriteIds();
    const books = ids.map((id) => allBooks.find((b) => b.id === id)).filter(Boolean);

    if (books.length === 0) {
        favoritesContainer.innerHTML = `<p class="lists-empty">No favorites yet. Tap the heart on any book in Browse or Search to add it here.</p>`;
        return;
    }

    favoritesContainer.innerHTML = `<div class="list-book-grid">${books.map((book) => `
        <div class="list-book-card">
            <button type="button" class="remove-from-list-btn" data-book-id="${book.id}" title="Remove from favorites">×</button>
            <a href="book.html?id=${book.id}">
                <img src="${book.cover}" alt="${book.title}">
                <h3>${book.title}</h3>
            </a>
        </div>
    `).join("")}</div>`;
}

favoritesContainer.addEventListener("click", async (e) => {
    const removeButton = e.target.closest(".remove-from-list-btn");
    if (!removeButton) return;
    await toggleFavorite(removeButton.dataset.bookId);
    renderFavorites();
});

init();