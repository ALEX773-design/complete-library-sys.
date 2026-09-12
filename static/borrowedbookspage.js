const recordsContainer = document.getElementById("recordsContainer");

function daysUntil(dateStr) {
    const diff = new Date(dateStr) - new Date();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

fetch("/static/books.json")
    .then((response) => response.json())
    .then((allBooks) => {
        const records = getMockBorrowedBooks();

        renderRecordList(recordsContainer, records, allBooks, {
            emptyText: "You haven't borrowed any books yet.",
            rowTemplate: (book, record) => {
                const daysLeft = daysUntil(record.dueOn);
                const dueLabel = daysLeft >= 0 ? `Due in ${daysLeft} days` : `Overdue by ${Math.abs(daysLeft)} days`;

                return `
                    <div class="record-row">
                        <img src="${book.cover}" alt="${book.title}">
                        <div class="record-details">
                            <h3>${book.title}</h3>
                            <p>Borrowed ${record.borrowedOn} · ${dueLabel}</p>
                        </div>
                        <span class="record-status active">${dueLabel}</span>
                    </div>
                `;
            },
        });
    })
    .catch((error) => {
        recordsContainer.innerHTML = `<p class="lists-empty">Couldn't load the library right now.</p>`;
        console.error("Failed to load books.json:", error);
    });
