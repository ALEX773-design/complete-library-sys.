const borrowedContainer = document.getElementById("borrowedContainer");

async function initBorrowedBooks() {
    let loans;
    try {
        const response = await fetch("/api/loans/active");
        if (response.status === 401) {
            window.location.href = "/login.html";
            return;
        }
        loans = await response.json();
    } catch (error) {
        borrowedContainer.innerHTML = `<p class="lists-empty">Couldn't load your borrowed books right now.</p>`;
        return;
    }

    if (loans.length === 0) {
        borrowedContainer.innerHTML = `<p class="lists-empty">You haven't borrowed any books yet.</p>`;
        return;
    }

    let books = [];
    try {
        const booksResponse = await fetch("/api/books");
        books = await booksResponse.json();
    } catch (error) {}

    const cardsHtml = loans.map((loan) => {
        const book = books.find((b) => b.id === loan.book_id);
        const title = book ? book.title : loan.book_id;
        const cover = book ? book.cover : "";
        const dueDate = new Date(loan.due_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

        return `
            <div class="list-book-card">
                <button type="button" class="return-btn" data-loan-id="${loan.id}">Return</button>
                <a href="book.html?id=${loan.book_id}">
                    <img src="${cover}" alt="${title}">
                    <h3>${title}</h3>
                </a>
                <p class="due-date">Due ${dueDate}</p>
            </div>
        `;
    }).join("");

    borrowedContainer.innerHTML = `<div class="list-book-grid">${cardsHtml}</div>`;
}

borrowedContainer.addEventListener("click", async (e) => {
    const returnButton = e.target.closest(".return-btn");
    if (!returnButton) return;
    returnButton.disabled = true;
    await fetch(`/api/loans/${returnButton.dataset.loanId}/return`, { method: "POST" });
    initBorrowedBooks();
});

initBorrowedBooks();
