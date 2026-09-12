// Renders the lists.html page: pulls list data from lists.js's storage
// layer and book details from books.json, then draws each list 

let allBooks = [];

const listsContainer = document.getElementById("listsContainer");
const newListForm = document.getElementById("newListForm");
const newListInput = document.getElementById("newListInput");

fetch("books.json")
    .then((response) => response.json())
    .then((data) => {
        allBooks = data;
        renderLists();
    })
    .catch((error) => {
        listsContainer.innerHTML = `<p class="lists-empty">Couldn't load the library right now.</p>`;
        console.error("Failed to load books.json:", error);
    });

function findBookById(id) {
    return allBooks.find((book) => book.id === id);
}

function renderLists() {
    const lists = getAllLists();
    const listNames = Object.keys(lists);

    if (listNames.length === 0) {
        listsContainer.innerHTML = `<p class="lists-empty">You haven't made any lists yet. Create one above, or add books to a list from Browse or Search.</p>`;
        return;
    }

    listsContainer.innerHTML = "";

    listNames.forEach((listName) => {
        const bookIds = lists[listName];
        const section = document.createElement("div");
        section.className = "list-section";

        const booksHtml = bookIds
            .map((id) => findBookById(id))
            .filter(Boolean)
            .map((book) => `
                <div class="list-book-card">
                    <button type="button" class="remove-from-list-btn" data-book-id="${book.id}" data-list-name="${listName}">×</button>
                    <a href="book.html?id=${book.id}">
                        <img src="${book.cover}" alt="${book.title}">
                        <h3>${book.title}</h3>
                    </a>
                </div>
            `)
            .join("");

        section.innerHTML = `
            <div class="list-section-header">
                <h2>${listName} <span style="opacity:0.6; font-size:16px;">(${bookIds.length})</span></h2>
                <button type="button" class="delete-list-btn" data-list-name="${listName}">Delete list</button>
            </div>
            <div class="list-book-grid">
                ${booksHtml || `<p class="lists-empty">No books in this list yet.</p>`}
            </div>
        `;

        listsContainer.appendChild(section);
    });
}

listsContainer.addEventListener("click", (e) => {
    const removeButton = e.target.closest(".remove-from-list-btn");
    if (removeButton) {
        removeBookFromList(removeButton.dataset.bookId, removeButton.dataset.listName);
        renderLists();
        return;
    }

    const deleteButton = e.target.closest(".delete-list-btn");
    if (deleteButton) {
        deleteList(deleteButton.dataset.listName);
        renderLists();
    }
});

newListForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const created = createList(newListInput.value);
    if (created) {
        newListInput.value = "";
        renderLists();
    }
});
