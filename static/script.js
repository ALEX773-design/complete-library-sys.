const carousel = document.querySelector(".book-carousel");
const historyContainer = document.querySelector(".history-books");

async function loadHomepageBooks() {
    let allBooks = [];
    try {
        const response = await fetch("/static/books.json");
        allBooks = await response.json();
    } catch (error) {
        carousel.innerHTML = `<p>Couldn't load books right now.</p>`;
        return;
    }

    const featured = [...allBooks].sort((a, b) => b.popularity - a.popularity).slice(0, 5);
    carousel.innerHTML = featured.map((book) => `
        <a href="book.html?id=${book.id}" style="display:contents">
            <img class="book" src="${book.cover}" alt="${book.title}">
        </a>
    `).join("");

    let historyBooks = [];
    try {
        const historyResponse = await fetch("/api/reading-history");
        if (historyResponse.ok) {
            const entries = await historyResponse.json();
            historyBooks = entries
                .map((entry) => allBooks.find((b) => b.id === entry.book_id))
                .filter(Boolean)
                .slice(0, 6);
        }
    } catch (error) {}

    if (historyBooks.length === 0) {
        historyBooks = [...allBooks]
            .sort((a, b) => new Date(b.addedDate) - new Date(a.addedDate))
            .slice(0, 6);
    }

    historyContainer.innerHTML = historyBooks.map((book) => `
        <a href="book.html?id=${book.id}" style="display:contents">
            <img class="book history-book" src="${book.cover}" alt="${book.title}">
        </a>
    `).join("");

    initCarousel();
}

function initCarousel() {
    const books = carousel.querySelectorAll(".book");
    if (books.length === 0) return;

    function updateActiveBook() {
        const carouselCenter = carousel.getBoundingClientRect().left + carousel.offsetWidth / 2;
        let closestBook = null;
        let closestDistance = Infinity;

        books.forEach((book) => {
            const bookCenter = book.getBoundingClientRect().left + book.offsetWidth / 2;
            const distance = Math.abs(carouselCenter - bookCenter);
            book.classList.remove("active");
            if (distance < closestDistance) {
                closestDistance = distance;
                closestBook = book;
            }
        });

        if (closestBook) closestBook.classList.add("active");
    }

    carousel.scrollLeft = books[0].offsetLeft - (carousel.offsetWidth / 2) + (books[0].offsetWidth / 2);
    carousel.addEventListener("scroll", updateActiveBook);
    updateActiveBook();

    let autoplayTimer = null;
    let resumeTimer = null;
    let autoplayIndex = 0;

    function getActiveIndex() {
        let activeIndex = 0;
        books.forEach((book, index) => {
            if (book.classList.contains("active")) activeIndex = index;
        });
        return activeIndex;
    }

    function scrollToBook(index) {
        const book = books[index];
        if (!book) return;
        autoplayIndex = index;
        const scrollTarget = book.offsetLeft - (carousel.offsetWidth / 2) + (book.offsetWidth / 2);
        carousel.scrollTo({ left: scrollTarget, behavior: "smooth" });
    }

    function startAutoplay() {
        if (autoplayTimer || books.length < 2) return;
        autoplayIndex = getActiveIndex();
        autoplayTimer = setInterval(() => {
            const nextIndex = (autoplayIndex + 1) % books.length;
            scrollToBook(nextIndex);
        }, 3500);
    }

    function stopAutoplay() {
        clearInterval(autoplayTimer);
        autoplayTimer = null;
        clearTimeout(resumeTimer);
        resumeTimer = setTimeout(() => {
            resumeTimer = null;
            startAutoplay();
        }, 4000);
    }

    carousel.addEventListener("touchstart", stopAutoplay);
    carousel.addEventListener("mousedown", stopAutoplay);
    carousel.addEventListener("wheel", stopAutoplay, { passive: true });

    startAutoplay();

    function setCarouselPadding() {
        const bookWidth = books[0].offsetWidth;
        const sidePadding = (carousel.offsetWidth - bookWidth) / 2;
        carousel.style.paddingInline = `${sidePadding}px`;
    }

    setCarouselPadding();
    window.addEventListener("resize", setCarouselPadding);
}

loadHomepageBooks();
