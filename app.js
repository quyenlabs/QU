// --- FOOD LIBRARY (Per 100g/ml) ---
// STRICT MODE: Raw/Uncooked weights only for maximum accuracy.
const foodLibrary = {
    "Chicken Breast (Raw)":  { cal: 120, p: 23, c: 0, f: 2.5 },
    "White Rice (Cooked)":   { cal: 130, p: 2.7, c: 28, f: 0.3 }, // Rice is usually weighed cooked for convenience
    "Egg Whites":            { cal: 52,  p: 11, c: 0.7, f: 0.2 }
};

// --- USER GOALS ---
const userGoals = {
    cal: 2460, // Calculated from your macros
    p: 175,
    c: 350,
    f: 40
};

// 1. SELECTORS
const nameInput = document.getElementById("entry-name");
const valueInput = document.getElementById("entry-value");
const addBtn = document.getElementById("add-btn");
const feed = document.getElementById("feed");

// Dashboard Selectors
const totalCalDisplay = document.getElementById("total-cal");
const totalPDisplay = document.getElementById("total-p");
const totalCDisplay = document.getElementById("total-c");
const totalFDisplay = document.getElementById("total-f");

// Navigation Selectors
const dateDisplay = document.getElementById("current-date-display");
const prevBtn = document.getElementById("prev-day");
const nextBtn = document.getElementById("next-day");

// 2. STATE
let entries = JSON.parse(localStorage.getItem("qu_log")) || [];
let currentDate = new Date(); 

// 3. HELPER: Date Strings
function getDayString(dateObj) {
    return dateObj.toLocaleDateString('en-CA');
}

// 4. HELPER: Update Header
function updateDateHeader() {
    const todayString = getDayString(new Date());
    const currentString = getDayString(currentDate);
    dateDisplay.innerText = (currentString === todayString) ? "TODAY" : currentDate.toDateString();
}

// 5. CORE: Calculate and Display Totals
function updateTotals(todaysEntries) {
    let totals = todaysEntries.reduce((acc, entry) => {
        return {
            cal: acc.cal + (entry.calories || 0),
            p: acc.p + (entry.protein || 0),
            c: acc.c + (entry.carbs || 0),
            f: acc.f + (entry.fat || 0)
        };
    }, { cal: 0, p: 0, c: 0, f: 0 });

    // Update Text
    totalCalDisplay.innerText = Math.round(totals.cal);
    totalPDisplay.innerText = Math.round(totals.p) + "g";
    totalCDisplay.innerText = Math.round(totals.c) + "g";
    totalFDisplay.innerText = Math.round(totals.f) + "g";

    // Update Progress Bars
    updateProgressBar("bar-p", totals.p, userGoals.p);
    updateProgressBar("bar-c", totals.c, userGoals.c);
    updateProgressBar("bar-f", totals.f, userGoals.f);
}

// Helper to animate bars
function updateProgressBar(id, current, goal) {
    const bar = document.getElementById(id);
    let percentage = (current / goal) * 100;
    
    // Cap it at 100% so it doesn't break layout
    if (percentage > 100) percentage = 100;
    
    bar.style.width = percentage + "%";
}

function loadEntries() {
    feed.innerHTML = "";
    updateDateHeader();
    
    const activeDayString = getDayString(currentDate);
    const todaysEntries = entries.filter(entry => entry.date === activeDayString);

    todaysEntries.forEach(entry => {
        const newItem = document.createElement("div");
        newItem.classList.add("entry-card");
        
        // Visual Logic: If it has macros, show weight. If not (old data), just show value.
        // We use 'entry.weight' for new items, 'entry.amount' for old legacy items.
        const displayValue = entry.weight ? `${entry.weight}g` : entry.amount;

        newItem.innerHTML = `
            <div class="card-left">
                <span class="entry-text">${entry.item}</span>
                <span class="entry-value">${displayValue}</span>
            </div>
            <button class="delete-btn" onclick="deleteEntry(${entry.id})">×</button>
        `;
        
        feed.prepend(newItem);
    });

    updateTotals(todaysEntries);
}

// 6. EVENT LISTENERS
window.deleteEntry = function(id) {
    entries = entries.filter(item => item.id !== id);
    localStorage.setItem("qu_log", JSON.stringify(entries));
    loadEntries();
}

prevBtn.addEventListener("click", () => { currentDate.setDate(currentDate.getDate() - 1); loadEntries(); });
nextBtn.addEventListener("click", () => { currentDate.setDate(currentDate.getDate() + 1); loadEntries(); });

// EVENT LISTENER: Allow "Enter" key to submit
valueInput.addEventListener("keypress", function(event) {
    if (event.key === "Enter") {
        // Trigger the button click programmatically
        addBtn.click();
    }
});

// THE NEW ADD LOGIC
addBtn.addEventListener("click", function() {
    // Validation: Must pick a food AND enter a weight
    if (nameInput.value === "" || valueInput.value === "") return;

    // 1. Get the Food Data
    const foodName = nameInput.value;
    const weight = Number(valueInput.value);
    const foodStats = foodLibrary[foodName]; // Look up the macros

    // 2. Calculate Macros for THIS entry
    // Math: (Weight Entered / 100) * Stat
    const multiplier = weight / 100;

    let entry = {
        id: Date.now(),
        date: getDayString(currentDate),
        timestamp: new Date(),
        item: foodName,
        weight: weight,
        
        // Calculated Values
        calories: foodStats.cal * multiplier,
        protein: foodStats.p * multiplier,
        carbs: foodStats.c * multiplier,
        fat: foodStats.f * multiplier
    };

    entries.push(entry);
    localStorage.setItem("qu_log", JSON.stringify(entries));
    loadEntries(); 

    // Reset Inputs
    valueInput.value = "";
    // We keep the dropdown selected in case you want to add more of the same, 
    // or you can set nameInput.value = "" to reset it.
});

// Initial Load
loadEntries();
