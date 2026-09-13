const historyContainer = document.getElementById("historyContainer");

async function initBorrowingHistory() {
    let loans;
    try {
        const response = await fetch("/api/loans/history");
        if (response.status === 401) {
            window.location.href = "/login.html";
            return;
        }
        loans = await response.json();
    } catch (error) {
        historyContainer.innerHTML = `<p class="lists-empty">Couldn't load your borrowing history right now.</p>`;
        return;
    }

    if (loans.length === 0) {
        historyContainer.innerHTML = `<p class="lists-empty">No borrowing history yet.</p>`;
        return;
    }

    let books = [];
    try {
        const booksResponse = await fetch("/static/books.json");
        books = await booksResponse.json();
    } catch (error) {}

    const cardsHtml = loans.map((loan) => {
        const book = books.find((b) => b.id === loan.book_id);
        const title = book ? book.title : loan.book_id;
        const cover = book ? book.cover : "";
        const borrowedDate = new Date(loan.borrowed_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
        const isReturned = Boolean(loan.returned_at);

        return `
            <div class="list-book-card">
                <a href="book.html?id=${loan.book_id}">
                    <img src="${cover}" alt="${title}">
                    <h3>${title}</h3>
                </a>
                <p class="due-date">Borrowed ${borrowedDate}</p>
                <span class="loan-status ${isReturned ? "returned" : "active"}">${isReturned ? "Returned" : "Active"}</span>
            </div>
        `;
    }).join("");

    historyContainer.innerHTML = `<div class="list-book-grid">${cardsHtml}</div>`;
}

initBorrowingHistory();
