// --- 1. CONFIGURATION ---
// The immutable "Base" library
const baseLibrary = {
    // added 'unit' property to everything
    "Chicken Breast (Raw)":  { unit: "g", serving: 100, cal: 120, p: 23, c: 0, f: 2.5 },
    "White Rice (Cooked)":   { unit: "g", serving: 100, cal: 130, p: 2.7, c: 28, f: 0.3 },
    "Egg Whites":            { unit: "ml", serving: 100, cal: 52,  p: 11, c: 0.7, f: 0.2 }, // <-- ML
    "Oats (Raw)":            { unit: "g", serving: 100, cal: 389, p: 16.9, c: 66, f: 6.9 },
    "Olive Oil":             { unit: "ml", serving: 100, cal: 884, p: 0, c: 0, f: 100 }     // <-- ML
};

// --- USER GOALS ---
// Try to load from local storage, OR default to the "Base" template
let userGoals = JSON.parse(localStorage.getItem("qu_user_goals")) || { 
    cal: 2460, 
    p: 175, 
    c: 350, 
    f: 40 
};

// --- 2. SELECTORS ---
const nameInput = document.getElementById("entry-name");
const valueInput = document.getElementById("entry-value");
const addBtn = document.getElementById("add-btn");
const feed = document.getElementById("feed");

// Dashboard
const totalCalDisplay = document.getElementById("total-cal");
const totalPDisplay = document.getElementById("total-p");
const totalCDisplay = document.getElementById("total-c");
const totalFDisplay = document.getElementById("total-f");

// Date Nav
const dateDisplay = document.getElementById("current-date-display");
const prevBtn = document.getElementById("prev-day");
const nextBtn = document.getElementById("next-day");

// Creator Panel Selectors
const toggleCreatorBtn = document.getElementById("toggle-creator-btn");
const creatorPanel = document.getElementById("creator-form");
const newFoodName = document.getElementById("new-food-name");
const newServing = document.getElementById("new-serving");
const newUnit = document.getElementById("new-unit"); // New selector
const newP = document.getElementById("new-p");
const newC = document.getElementById("new-c");
const newF = document.getElementById("new-f");
const calcCalories = document.getElementById("calc-calories");
const saveFoodBtn = document.getElementById("save-food-btn");

const libraryList = document.getElementById("library-list");

// Edit Goals Selectors
const editGoalsBtn = document.getElementById("edit-goals-btn");
const goalsForm = document.getElementById("goals-form");
const saveGoalsBtn = document.getElementById("save-goals-btn");
const inputGoalP = document.getElementById("goal-p");
const inputGoalC = document.getElementById("goal-c");
const inputGoalF = document.getElementById("goal-f");

// --- 3. STATE ---
let entries = JSON.parse(localStorage.getItem("qu_log")) || [];
let customFoods = JSON.parse(localStorage.getItem("qu_custom_foods")) || {}; // User's private library
let currentDate = new Date(); 

// --- 4. CORE FUNCTIONS ---

// Combine Base + Custom libraries into one master list
function getFullLibrary() {
    return { ...baseLibrary, ...customFoods };
}

// Populate the Dropdown Menu
function populateDropdown() {
    const library = getFullLibrary();
    // Clear existing options (except the first placeholder)
    nameInput.innerHTML = '<option value="" disabled selected>Select Fuel</option>';
    
    // Sort keys alphabetically so it looks nice
    const sortedFoods = Object.keys(library).sort();
    
    sortedFoods.forEach(foodName => {
        const option = document.createElement("option");
        option.value = foodName;
        option.innerText = foodName;
        nameInput.appendChild(option);
    });
}

function getDayString(dateObj) {
    return dateObj.toLocaleDateString('en-CA');
}

function updateTotals(todaysEntries) {
    let totals = todaysEntries.reduce((acc, entry) => {
        return {
            cal: acc.cal + (entry.calories || 0),
            p: acc.p + (entry.protein || 0),
            c: acc.c + (entry.carbs || 0),
            f: acc.f + (entry.fat || 0)
        };
    }, { cal: 0, p: 0, c: 0, f: 0 });

    // CALORIES (You already have this)
    totalCalDisplay.innerHTML = `${Math.round(totals.cal)} <span class="goal-text">/ ${userGoals.cal}</span>`;

    // --- MACROS: Add the goals here ---
    totalPDisplay.innerHTML = `${Math.round(totals.p)}g <span class="macro-goal">/ ${userGoals.p}g</span>`;
    totalCDisplay.innerHTML = `${Math.round(totals.c)}g <span class="macro-goal">/ ${userGoals.c}g</span>`;
    totalFDisplay.innerHTML = `${Math.round(totals.f)}g <span class="macro-goal">/ ${userGoals.f}g</span>`;

    // (Keep the progress bar updates below...)
    updateProgressBar("bar-p", totals.p, userGoals.p);
    updateProgressBar("bar-c", totals.c, userGoals.c);
    updateProgressBar("bar-f", totals.f, userGoals.f);
}

function updateProgressBar(id, current, goal) {
    const bar = document.getElementById(id);
    if (!bar) return; // Safety check
    let percentage = (current / goal) * 100;
    if (percentage > 100) percentage = 100;
    bar.style.width = percentage + "%";
}

function loadEntries() {
    feed.innerHTML = "";
    
    // Header
    const todayString = getDayString(new Date());
    const currentString = getDayString(currentDate);
    dateDisplay.innerText = (currentString === todayString) ? "TODAY" : currentDate.toDateString();
    
    const activeDayString = getDayString(currentDate);
    const todaysEntries = entries.filter(entry => entry.date === activeDayString);

    todaysEntries.forEach(entry => {
        const newItem = document.createElement("div");
        newItem.classList.add("entry-card");
        
        let leftContent = "";
        
        // CHECK IF IT IS A WORKOUT (Future proofing)
        // Since we haven't built 'train' logic fully yet, we check if macros exist.
        if (entry.protein !== undefined) {
            
            // FOOD LAYOUT
            const unitLabel = entry.unit || "g";
            const displayValue = entry.weight ? `${entry.weight}${unitLabel}` : entry.amount;
            
            // Round the numbers for display
            const p = Math.round(entry.protein);
            const c = Math.round(entry.carbs);
            const f = Math.round(entry.fat);

            newItem.style.borderLeft = "3px solid #fff";
            
            leftContent = `
                <span class="entry-text">${entry.item}</span>
                <div class="card-stats">
                    <span>${displayValue}</span>
                    <div class="macro-group">
                        <span class="macro-tag tag-p">${p}p</span>
                        <span class="macro-tag tag-c">${c}c</span>
                        <span class="macro-tag tag-f">${f}f</span>
                    </div>
                </div>
            `;
        } else {
            // LEGACY / GENERIC LAYOUT (For old data or non-food)
            newItem.style.borderLeft = "3px solid #444";
            leftContent = `
                <span class="entry-text">${entry.item}</span>
                <span class="entry-value">${entry.amount || entry.weight}</span>
            `;
        }

        newItem.innerHTML = `
            <div class="card-left">
                ${leftContent}
            </div>
            <button class="delete-btn" onclick="deleteEntry(${entry.id})">×</button>
        `;
        feed.prepend(newItem);
    });

    updateTotals(todaysEntries);
}

// RENDER: Show list of custom foods with delete buttons
function renderCustomLibrary() {
    libraryList.innerHTML = "";
    const names = Object.keys(customFoods).sort();

    if (names.length === 0) {
        libraryList.innerHTML = '<div style="color:#444; font-size:0.8rem; font-style:italic;">No custom foods yet.</div>';
        return;
    }

    names.forEach(name => {
        const item = document.createElement("div");
        item.classList.add("lib-item");
        // We pass the name string to the delete function
        item.innerHTML = `
            <span class="lib-name">${name}</span>
            <button class="lib-delete" onclick="deleteCustomFood('${name}')">×</button>
        `;
        libraryList.appendChild(item);
    });
}

// DELETE: Remove from custom library
window.deleteCustomFood = function(name) {
    if (confirm(`Delete "${name}" from your library?`)) {
        delete customFoods[name];
        localStorage.setItem("qu_custom_foods", JSON.stringify(customFoods));
        
        // Refresh everything
        renderCustomLibrary();
        populateDropdown();
    }
}

// --- 5. CREATOR LOGIC (The New Stuff) ---

// Toggle the form visibility
toggleCreatorBtn.addEventListener("click", () => {
    creatorPanel.classList.toggle("hidden");
    // Change button text based on state
    if (creatorPanel.classList.contains("hidden")) {
        toggleCreatorBtn.innerText = "+ Create New Fuel";
    } else {
        toggleCreatorBtn.innerText = "Close Manager";
        renderCustomLibrary(); // <--- NEW: Show list when opening
    }
});

// Auto-Calculate Calories while typing
function autoCalc() {
    const p = Number(newP.value) || 0;
    const c = Number(newC.value) || 0;
    const f = Number(newF.value) || 0;
    
    // Formula: 4-4-9
    const estCal = (p * 4) + (c * 4) + (f * 9);
    calcCalories.innerText = Math.round(estCal);
}

// Attach listener to all macro inputs
[newP, newC, newF].forEach(input => input.addEventListener("input", autoCalc));

// Save the New Food
saveFoodBtn.addEventListener("click", () => {
    const name = newFoodName.value.trim();
    // Default to 100 if empty
    const serving = Number(newServing.value) || 100; 
    const unit = newUnit.value; // <--- GRAB THE UNIT
    const p = Number(newP.value);
    const c = Number(newC.value);
    const f = Number(newF.value);
    
    if (!name || (p===0 && c===0 && f===0)) {
        alert("Please enter a name and at least one macro.");
        return;
    }
    
    const cal = (p * 4) + (c * 4) + (f * 9); // Final calc
    
    // SAVE UNIT TO DATABASE
    customFoods[name] = { unit, serving, cal, p, c, f };
    localStorage.setItem("qu_custom_foods", JSON.stringify(customFoods));
    
    // Refresh Dropdown and Hide Form
    populateDropdown();
    
    // Auto-select the new food for convenience
    nameInput.value = name; 
    
    // Clear Form
    newFoodName.value = "";
    newServing.value = "";
    newUnit.value = "g"; // Reset to grams
    newP.value = ""; newC.value = ""; newF.value = "";
    calcCalories.innerText = "0";
    creatorPanel.classList.add("hidden");
    toggleCreatorBtn.innerText = "+ Create New Fuel";
    
    // AFTER saving to localStorage:
    renderCustomLibrary(); // <--- NEW: Update list immediately
});

// Toggle the Goals Form
editGoalsBtn.addEventListener("click", () => {
    goalsForm.classList.toggle("hidden");
    // Pre-fill current goals so user sees what they are editing
    if (!goalsForm.classList.contains("hidden")) {
        inputGoalP.value = userGoals.p;
        inputGoalC.value = userGoals.c;
        inputGoalF.value = userGoals.f;
    }
});

// Save New Goals
saveGoalsBtn.addEventListener("click", () => {
    const p = Number(inputGoalP.value);
    const c = Number(inputGoalC.value);
    const f = Number(inputGoalF.value);

    if (p === 0 || c === 0 || f === 0) {
        alert("Please enter valid macro targets.");
        return;
    }

    // Auto-calculate total calories based on new macros
    const newCal = (p * 4) + (c * 4) + (f * 9);

    // Update State
    userGoals = { cal: newCal, p, c, f };
    
    // Save to Browser
    localStorage.setItem("qu_user_goals", JSON.stringify(userGoals));

    // Refresh Dashboard
    goalsForm.classList.add("hidden");
    loadEntries(); // This triggers updateTotals() which redraws the bars
});

// --- 6. EXISTING LISTENERS ---

window.deleteEntry = function(id) {
    entries = entries.filter(item => item.id !== id);
    localStorage.setItem("qu_log", JSON.stringify(entries));
    loadEntries();
}

prevBtn.addEventListener("click", () => { currentDate.setDate(currentDate.getDate() - 1); loadEntries(); });
nextBtn.addEventListener("click", () => { currentDate.setDate(currentDate.getDate() + 1); loadEntries(); });

addBtn.addEventListener("click", function() {
    if (nameInput.value === "" || valueInput.value === "") return;

    const foodName = nameInput.value;
    const weight = Number(valueInput.value);
    
    // We look up from the FULL library now
    const library = getFullLibrary();
    const foodStats = library[foodName];

    const referenceSize = foodStats.serving || 100;
    // Fallback to 'g' if unit is missing (for legacy data compatibility)
    const currentUnit = foodStats.unit || "g"; 
    
    const multiplier = weight / referenceSize;

    let entry = {
        id: Date.now(),
        date: getDayString(currentDate),
        timestamp: new Date(),
        item: foodName,
        weight: weight,
        unit: currentUnit, // <--- SAVE IT TO THE LOG
        calories: foodStats.cal * multiplier,
        protein: foodStats.p * multiplier,
        carbs: foodStats.c * multiplier,
        fat: foodStats.f * multiplier
    };

    entries.push(entry);
    localStorage.setItem("qu_log", JSON.stringify(entries));
    loadEntries(); 
    
    // valueInput.value = ""; // Optional clear
});

// Allow "Enter" key
valueInput.addEventListener("keypress", function(event) {
    if (event.key === "Enter") addBtn.click();
});

// --- INIT ---
populateDropdown(); // Run this first to fill the list
loadEntries();
