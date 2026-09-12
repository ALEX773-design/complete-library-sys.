let allBooks = [];

const favoritesContainer = document.getElementById("favoritesContainer");

fetch("books.json")
    .then((response) => response.json())
    .then((data) => {
        allBooks = data;
        renderFavorites();
    })
    .catch((error) => {
        favoritesContainer.innerHTML = `<p class="lists-empty">Couldn't load the library right now.</p>`;
        console.error("Failed to load books.json:", error);
    });

function renderFavorites() {
    const favoriteIds = getFavorites();
    const books = favoriteIds.map((id) => allBooks.find((b) => b.id === id)).filter(Boolean);

    if (books.length === 0) {
        favoritesContainer.innerHTML = `<p class="lists-empty">No favorites yet. Tap the heart on any book in Browse or Search to add it here.</p>`;
        return;
    }

    const booksHtml = books
        .map((book) => `
            <div class="list-book-card">
                <button type="button" class="remove-from-list-btn" data-book-id="${book.id}" title="Remove from favorites">×</button>
                <a href="book.html?id=${book.id}">
                    <img src="${book.cover}" alt="${book.title}">
                    <h3>${book.title}</h3>
                </a>
            </div>
        `)
        .join("");

    favoritesContainer.innerHTML = `<div class="list-book-grid">${booksHtml}</div>`;
}

favoritesContainer.addEventListener("click", (e) => {
    const removeButton = e.target.closest(".remove-from-list-btn");
    if (!removeButton) return;

    toggleFavorite(removeButton.dataset.bookId);
    renderFavorites();
});
