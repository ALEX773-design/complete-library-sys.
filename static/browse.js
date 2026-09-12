let books = [];

const browseBooks = document.getElementById("browseBooks");
const browseTabs = document.querySelectorAll(".browse-tab");

fetch("/static/books.json")
    .then((response) => response.json())
    .then((data) => {
        books = data;
        showAllBooks();
    })
    .catch((error) => {
        browseBooks.innerHTML = `<p class="no-books">Couldn't load the library right now.</p>`;
        console.error("Failed to load books.json:", error);
    });

function displayBooks(bookList) {
    browseBooks.innerHTML = "";

    if (bookList.length === 0) {
        browseBooks.innerHTML = `<p class="no-books">No books available.</p>`;
        return;
    }

    bookList.forEach((book) => {
        const card = document.createElement("div");
        card.className = "book-card";

        card.innerHTML = `
            <button type="button" class="favorite-btn" data-book-id="${book.id}">♡</button>
            <a href="book.html?id=${book.id}" class="book-link">
                <img src="${book.cover}" alt="${book.title}">
                <h2>${book.title}</h2>
                <p>${book.author}</p>
                <p class="book-year">${book.year}</p>
            </a>
            <button type="button" class="list-add-btn" data-book-id="${book.id}">+ List</button>
        `;

        browseBooks.appendChild(card);
    });

    if (typeof refreshFavoriteButtons === "function") refreshFavoriteButtons();
}

function showAllBooks() {
    displayBooks([...books]);
}

function showRecentBooks() {
    const results = [...books].sort((a, b) => new Date(b.addedDate) - new Date(a.addedDate));
    displayBooks(results);
}

function showPopularBooks() {
    const results = [...books].sort((a, b) => b.popularity - a.popularity);
    displayBooks(results);
}

browseTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
        browseTabs.forEach((otherTab) => otherTab.classList.remove("active"));
        tab.classList.add("active");

        const category = tab.dataset.category;

        if (category === "all") showAllBooks();
        else if (category === "recent") showRecentBooks();
        else if (category === "popular") showPopularBooks();
    });
});
