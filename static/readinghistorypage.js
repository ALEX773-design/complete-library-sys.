const readingContainer = document.getElementById("readingContainer");

async function initReadingHistory() {
    let entries;
    try {
        const response = await fetch("/api/reading-history");
        if (response.status === 401) {
            window.location.href = "/login.html";
            return;
        }
        entries = await response.json();
    } catch (error) {
        readingContainer.innerHTML = `<p class="lists-empty">Couldn't load your reading history right now.</p>`;
        return;
    }

    if (entries.length === 0) {
        readingContainer.innerHTML = `<p class="lists-empty">Books you view will show up here.</p>`;
        return;
    }

    let books = [];
    try {
        const booksResponse = await fetch("/static/books.json");
        books = await booksResponse.json();
    } catch (error) {}

    const cardsHtml = entries.map((entry) => {
        const book = books.find((b) => b.id === entry.book_id);
        const title = book ? book.title : entry.book_id;
        const cover = book ? book.cover : "";
        const viewedDate = new Date(entry.viewed_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

        return `
            <div class="list-book-card">
                <a href="book.html?id=${entry.book_id}">
                    <img src="${cover}" alt="${title}">
                    <h3>${title}</h3>
                </a>
                <p class="due-date">Viewed ${viewedDate}</p>
            </div>
        `;
    }).join("");

    readingContainer.innerHTML = `<div class="list-book-grid">${cardsHtml}</div>`;
}

initReadingHistory();
