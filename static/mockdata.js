// TEMPORARY placeholder data for Borrowed Books / Borrowing History / Reading History. 

function getMockBorrowedBooks() {
    return [
        { bookId: "b03", borrowedOn: "2026-08-10", dueOn: "2026-09-10" },
        { bookId: "b14", borrowedOn: "2026-08-18", dueOn: "2026-09-18" },
    ];
}

function getMockBorrowingHistory() {
    return [
        { bookId: "b01", borrowedOn: "2026-06-01", returnedOn: "2026-06-28" },
        { bookId: "b06", borrowedOn: "2026-05-12", returnedOn: "2026-06-01" },
        { bookId: "b09", borrowedOn: "2026-04-03", returnedOn: "2026-04-20" },
    ];
}

function getMockReadingHistory() {
    return [
        { bookId: "b01", finishedOn: "2026-06-27" },
        { bookId: "b06", finishedOn: "2026-05-30" },
        { bookId: "b04", finishedOn: "2026-03-14" },
    ];
}

// Shared renderer for all three pages above.
function renderRecordList(container, records, allBooks, options) {
    if (records.length === 0) {
        container.innerHTML = `<p class="lists-empty">${options.emptyText}</p>`;
        return;
    }

    const rowsHtml = records
        .map((record) => {
            const book = allBooks.find((b) => b.id === record.bookId);
            if (!book) return "";
            return options.rowTemplate(book, record);
        })
        .join("");

    container.innerHTML = `<div class="record-list">${rowsHtml}</div>`;
}
