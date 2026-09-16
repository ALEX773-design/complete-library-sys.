function formatDate(isoString) {
    return new Date(isoString).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

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

    let activeLoan = null;
    try {
        const loansResponse = await fetch("/api/loans/active");
        if (loansResponse.ok) {
            const activeLoans = await loansResponse.json();
            activeLoan = activeLoans.find((loan) => loan.book_id === bookId) || null;
        }
    } catch (error) {}

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
                    <button type="button" class="borrow-btn" id="borrowBtn" data-book-id="${book.id}" ${activeLoan ? "disabled" : ""}>
                        ${activeLoan ? `Due ${formatDate(activeLoan.due_at)}` : "Borrow"}
                    </button>
                </div>
            </div>
        </div>
    `;

    if (typeof refreshFavoriteButtons === "function") refreshFavoriteButtons();

    fetch(`/api/reading-history/${bookId}`, { method: "POST" }).catch(() => {});
}

document.addEventListener("click", async (e) => {
    const button = e.target.closest("#borrowBtn");
    if (!button || button.disabled) return;

    const bookId = button.dataset.bookId;
    button.disabled = true;
    button.textContent = "Borrowing…";

    try {
        const response = await fetch(`/api/loans/${bookId}`, { method: "POST" });
        const data = await response.json();

        if (response.status === 401) {
            window.location.href = "/login.html";
            return;
        }
        if (!response.ok) {
            button.disabled = false;
            button.textContent = "Borrow";
            alert(data.error || "Couldn't borrow this book");
            return;
        }

        button.textContent = `Due ${formatDate(data.due_at)}`;
    } catch (error) {
        button.disabled = false;
        button.textContent = "Borrow";
    }
});

document.addEventListener("DOMContentLoaded", initBookDetail);
