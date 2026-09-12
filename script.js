
const carousel = document.querySelector(".book-carousel");
const books = carousel.querySelectorAll(".book");

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

// Automatic

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

// Kill auto on user interaction
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
