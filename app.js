// 1. SELECTORS
const nameInput = document.getElementById("entry-name");
const valueInput = document.getElementById("entry-value");
const addBtn = document.getElementById("add-btn");
const feed = document.getElementById("feed");
const totalDisplay = document.getElementById("total-number");
const dateDisplay = document.getElementById("current-date-display"); // New
const prevBtn = document.getElementById("prev-day"); // New
const nextBtn = document.getElementById("next-day"); // New

// 2. STATE
let entries = JSON.parse(localStorage.getItem("qu_log")) || [];

// We track the "Active Date" the user is looking at
let currentDate = new Date(); 

// 3. HELPER: Get local date string "YYYY-MM-DD"
function getDayString(dateObj) {
    // This trick gets the local date in Canada/ISO format (YYYY-MM-DD)
    // We use 'en-CA' because Canada uses the correct ISO format by default.
    return dateObj.toLocaleDateString('en-CA');
}

// 4. HELPER: Update the Header Text (e.g. "Dec 14, 2025")
function updateDateHeader() {
    const todayString = getDayString(new Date());
    const currentString = getDayString(currentDate);

    if (currentString === todayString) {
        dateDisplay.innerText = "TODAY";
    } else {
        // Make it look nice: "Sat Dec 13 2025"
        dateDisplay.innerText = currentDate.toDateString(); 
    }
}

// 5. CORE FUNCTIONS
function updateTotal(todaysEntries) {
    // We only sum up the entries PASSED to this function (the filtered ones)
    let total = todaysEntries.reduce((sum, entry) => sum + entry.amount, 0);
    totalDisplay.innerText = total;
}

function loadEntries() {
    feed.innerHTML = "";
    updateDateHeader();
    
    // KEY LOGIC: Filter the master list to only show items for the selected day
    const activeDayString = getDayString(currentDate);
    
    // Filter matches entries where entry.date === activeDayString
    // NOTE: Old entries (from previous sessions) won't have a 'date' property,
    // so they will correctly disappear from the view as they don't match.
    const todaysEntries = entries.filter(entry => entry.date === activeDayString);

    todaysEntries.forEach(entry => {
        const newItem = document.createElement("div");
        newItem.classList.add("entry-card");
        
        newItem.innerHTML = `
            <div class="card-left">
                <span class="entry-text">${entry.item}</span>
                <span class="entry-value">${entry.amount}</span>
            </div>
            <button class="delete-btn" onclick="deleteEntry(${entry.id})">×</button>
        `;
        
        feed.prepend(newItem);
    });

    updateTotal(todaysEntries);
}

// 6. EVENT LISTENERS
window.deleteEntry = function(id) {
    entries = entries.filter(item => item.id !== id);
    localStorage.setItem("qu_log", JSON.stringify(entries));
    loadEntries();
}

// Date Navigation
prevBtn.addEventListener("click", () => {
    // Subtract 1 day
    currentDate.setDate(currentDate.getDate() - 1);
    loadEntries();
});

nextBtn.addEventListener("click", () => {
    // Add 1 day
    currentDate.setDate(currentDate.getDate() + 1);
    loadEntries();
});

// The Add Action
addBtn.addEventListener("click", function() {
    if (nameInput.value === "") return;

    let entry = {
        id: Date.now(),
        item: nameInput.value,
        amount: Number(valueInput.value),
        timestamp: new Date(),
        // IMPORTANT: We tag the item with the date we are currently LOOKING at.
        // This lets you go back to yesterday and add a missed coffee.
        date: getDayString(currentDate) 
    };

    entries.push(entry);
    localStorage.setItem("qu_log", JSON.stringify(entries));
    loadEntries(); 

    nameInput.value = "";
    valueInput.value = "";
});

// Initial Load
loadEntries();
