const recordsContainer = document.getElementById("recordsContainer");

fetch("books.json")
    .then((response) => response.json())
    .then((allBooks) => {
        const records = getMockBorrowingHistory();

        renderRecordList(recordsContainer, records, allBooks, {
            emptyText: "No borrowing history yet.",
            rowTemplate: (book, record) => `
                <div class="record-row">
                    <img src="${book.cover}" alt="${book.title}">
                    <div class="record-details">
                        <h3>${book.title}</h3>
                        <p>Borrowed ${record.borrowedOn} · Returned ${record.returnedOn}</p>
                    </div>
                    <span class="record-status returned">Returned</span>
                </div>
            `,
        });
    })
    .catch((error) => {
        recordsContainer.innerHTML = `<p class="lists-empty">Couldn't load the library right now.</p>`;
        console.error("Failed to load books.json:", error);
    });
