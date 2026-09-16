async function initBookDetail() {
    const container = document.getElementById("bookDetailContainer");
    const bookId = new URLSearchParams(window.location.search).get("id");

    if (!bookId) {
        container.innerHTML = `<p class="book-detail-notfound">No book specified.</p>`;
        return;
    }

    let books;
    try {
        const response = await fetch("/api/books");
        books = await response.json();
    } catch (error) {
        container.innerHTML = `<p class="book-detail-notfound">Couldn't load the library right now.</p>`;
        return;
    }

    const book = books.find((b) => b.id === bookId);
    if (!book) {
        container.innerHTML = `<p class="book-detail-notfound">Book not found.</p>`;
        return;
    }

    document.title = `National Library — ${book.title}`;

    container.innerHTML = `
        <div class="book-detail-content">
            <div class="book-detail-cover">
                <img src="${book.cover}" alt="${book.title}">
            </div>
            <div class="book-detail-info">
                <h1>${book.title}</h1>
                <p class="book-detail-meta">${[book.author, book.year, book.genre].filter(Boolean).join(" · ")}</p>
                ${book.description ? `<p class="book-detail-description">${book.description}</p>` : ""}
                <div class="book-detail-actions">
                    <button type="button" class="favorite-btn" data-book-id="${book.id}">♡</button>
                </div>
            </div>
        </div>
    `;

    if (typeof refreshFavoriteButtons === "function") refreshFavoriteButtons();
}

document.addEventListener("DOMContentLoaded", initBookDetail);