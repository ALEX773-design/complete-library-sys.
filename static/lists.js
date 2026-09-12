// Shared Lists thingy
// Storage layer (localStorage, per-browser) + a reusable "add to list" 
// that works on any page showing book cards. Gonna swap the storage functions for
// real API calls later without touching the rest of this file.

const LISTS_STORAGE_KEY = "nl_lists";

// storafe

function getAllLists() {
    try {
        const raw = localStorage.getItem(LISTS_STORAGE_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch (error) {
        console.error("Failed to read lists from storage:", error);
        return {};
    }
}

function saveAllLists(lists) {
    localStorage.setItem(LISTS_STORAGE_KEY, JSON.stringify(lists));
}

function createList(name) {
    const trimmed = name.trim();
    if (!trimmed) return false;

    const lists = getAllLists();
    if (lists[trimmed]) return false; 

    lists[trimmed] = [];
    saveAllLists(lists);
    return true;
}

function deleteList(name) {
    const lists = getAllLists();
    delete lists[name];
    saveAllLists(lists);
}

function addBookToList(bookId, listName) {
    const lists = getAllLists();
    if (!lists[listName]) lists[listName] = [];
    if (!lists[listName].includes(bookId)) lists[listName].push(bookId);
    saveAllLists(lists);
}

function removeBookFromList(bookId, listName) {
    const lists = getAllLists();
    if (!lists[listName]) return;
    lists[listName] = lists[listName].filter((id) => id !== bookId);
    saveAllLists(lists);
}

function getListsContainingBook(bookId) {
    const lists = getAllLists();
    return Object.keys(lists).filter((name) => lists[name].includes(bookId));
}

// Add to list
// Any book card that includes a button like:
//   <button class="list-add-btn" data-book-id="b01">+ List</button>
// will get a popover attached automatically via event delegation below.

let openPopover = null;

function closeListPopover() {
    if (openPopover) {
        openPopover.remove();
        openPopover = null;
    }
}

function buildListPopover(bookId) {
    const popover = document.createElement("div");
    popover.className = "list-popover";

    const lists = getAllLists();
    const listNames = Object.keys(lists);
    const activeLists = getListsContainingBook(bookId);

    let itemsHtml = "";
    if (listNames.length === 0) {
        itemsHtml = `<p class="list-popover-empty">No lists yet</p>`;
    } else {
        itemsHtml = listNames
            .map((name) => {
                const checked = activeLists.includes(name) ? "checked" : "";
                return `
                    <label class="list-popover-item">
                        <input type="checkbox" data-list-name="${name}" ${checked}>
                        ${name}
                    </label>
                `;
            })
            .join("");
    }

    popover.innerHTML = `
        <div class="list-popover-items">${itemsHtml}</div>
        <div class="list-popover-new">
            <input type="text" class="list-popover-input" placeholder="New list name">
            <button type="button" class="list-popover-create">Add</button>
        </div>
    `;

    // Toggle list menbership
    popover.querySelectorAll("input[data-list-name]").forEach((checkbox) => {
        checkbox.addEventListener("change", () => {
            const listName = checkbox.dataset.listName;
            if (checkbox.checked) addBookToList(bookId, listName);
            else removeBookFromList(bookId, listName);
        });
    });

    // Create a new list and add 
    const input = popover.querySelector(".list-popover-input");
    const createButton = popover.querySelector(".list-popover-create");

    function handleCreate() {
        const name = input.value.trim();
        if (!name) return;

        createList(name); 
        addBookToList(bookId, name);
        closeListPopover();
    }

    createButton.addEventListener("click", handleCreate);
    input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") handleCreate();
    });

    popover.addEventListener("click", (e) => e.stopPropagation());

    return popover;
}

document.addEventListener("click", (e) => {
    const button = e.target.closest(".list-add-btn");

    if (!button) {
        closeListPopover();
        return;
    }

    e.stopPropagation();

    const alreadyOpenForThisButton = openPopover && openPopover.dataset.forButton === button.dataset.bookId;
    closeListPopover();
    if (alreadyOpenForThisButton) return;

    const popover = buildListPopover(button.dataset.bookId);
    popover.dataset.forButton = button.dataset.bookId;

    document.body.appendChild(popover);

    const rect = button.getBoundingClientRect();
    popover.style.top = `${window.scrollY + rect.bottom + 6}px`;
    popover.style.left = `${window.scrollX + rect.left}px`;

    openPopover = popover;
});
