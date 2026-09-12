let books = [];

const searchInput = document.getElementById("searchInput");
const sortSelect = document.getElementById("sortSelect");
const genreSelect = document.getElementById("genreSelect");
const ignoreLists = document.getElementById("ignoreLists");
const searchButton = document.getElementById("searchButton");
const searchResults = document.getElementById("searchResults");

const yearFrom = document.getElementById("yearFrom");
const yearTo = document.getElementById("yearTo");

fetch("books.json")
    .then((response) => response.json())
    .then((data) => {
        books = data;
    })
    .catch((error) => {
        console.error("Failed to load books.json:", error);
    });

function displayBooks(bookList) {
    searchResults.innerHTML = "";

    if (bookList.length === 0) {
        searchResults.innerHTML = `<p class="no-results">No books found.</p>`;
        return;
    }

    bookList.forEach((book) => {
        const card = document.createElement("div");
        card.className = "book-card";

        card.innerHTML = `
            <button type="button" class="favorite-btn" data-book-id="${book.id}">♡</button>
            <a href="book.html?id=${book.id}" class="book-link">
                <img src="${book.cover}" alt="${book.title}">
                <h3>${book.title}</h3>
                <p>${book.author}</p>
                <p class="book-year">${book.year}</p>
            </a>
            <button type="button" class="list-add-btn" data-book-id="${book.id}">+ List</button>
        `;

        searchResults.appendChild(card);
    });

    if (typeof refreshFavoriteButtons === "function") refreshFavoriteButtons();
}

function sortBooks(bookList, sortType) {
    if (sortType === "ascending") {
        bookList.sort((a, b) => a.title.localeCompare(b.title));
    } else if (sortType === "descending") {
        bookList.sort((a, b) => b.title.localeCompare(a.title));
    } else if (sortType === "popular") {
        bookList.sort((a, b) => b.popularity - a.popularity);
    } else if (sortType === "newest") {
        bookList.sort((a, b) => b.year - a.year);
    }
}

searchButton.addEventListener("click", () => {
    const searchTerm = searchInput.value.toLowerCase().trim();
    const selectedGenre = genreSelect.value;
    const selectedSort = sortSelect.value;
    const selectedYearFrom = Number(yearFrom.value);
    const selectedYearTo = Number(yearTo.value);

    let results = books.filter((book) => {
        const matchesSearch =
            book.title.toLowerCase().includes(searchTerm) ||
            book.author.toLowerCase().includes(searchTerm);

        const matchesGenre =
            selectedGenre === "all" || book.genres.includes(selectedGenre);

        const matchesYearFrom = !selectedYearFrom || book.year >= selectedYearFrom;
        const matchesYearTo = !selectedYearTo || book.year <= selectedYearTo;

        return matchesSearch && matchesGenre && matchesYearFrom && matchesYearTo;
    });

    if (ignoreLists.checked) {
        const lists = getAllLists();
        const listedBookIds = new Set(Object.values(lists).flat());
        results = results.filter((book) => !listedBookIds.has(book.id));
    }

    sortBooks(results, selectedSort);
    displayBooks(results);
});

for (let year = 2026; year >= 1400; year--) {
    const optionFrom = document.createElement("option");
    optionFrom.value = year;
    optionFrom.textContent = year;

    const optionTo = document.createElement("option");
    optionTo.value = year;
    optionTo.textContent = year;

    yearFrom.appendChild(optionFrom);
    yearTo.appendChild(optionTo);
}
