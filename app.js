// --- 1. CONFIGURATION ---
const baseLibrary = {
    "Chicken Breast (Raw)":  { unit: "g", serving: 100, cal: 120, p: 23, c: 0, f: 2.5 },
    "White Rice (Cooked)":   { unit: "g", serving: 100, cal: 130, p: 2.7, c: 28, f: 0.3 },
    "Egg Whites":            { unit: "ml", serving: 100, cal: 52,  p: 11, c: 0.7, f: 0.2 },
    "Oats (Raw)":            { unit: "g", serving: 100, cal: 389, p: 16.9, c: 66, f: 6.9 },
    "Olive Oil":             { unit: "ml", serving: 100, cal: 884, p: 0, c: 0, f: 100 }
};

const WORKOUT_SPLITS = {
    "LEGS": [
        "Machine Seated Leg Extension",
        "Hip Thrust (Bar/Machine)",
        "Seated Leg Press",
        "Machine Seated Single Leg Curl",
        "DB Rear Foot Elevated Split Squat"
    ],
    "PULL": [
        "Machine Seated Reverse Fly",
        "Cable Pullover (Standing)",
        "Close Grip Pulldown",
        "High to Low Cable Row",
        "Barbell Bent Over Row",
        "Cable Seated Wide Grip Row",
        "Cable Bicep Curl"
    ],
    "PUSH": [
        "Cable Standing Low to High Fly",
        "Machine Seated Chest Fly",
        "DB Incline Bench Press",
        "DB Incline Closegrip Press",
        "DB Press",
        "DB Lateral Raise",
        "DB Shoulder Press",
        "Cable Straight Bar Tricep Pushdown"
    ],
    "SHOULDERS": [
        "Machine Seated Reverse Fly",
        "DB Lateral Raise",
        "Face Pull",
        "DB Seated Shoulder Press",
        "Single Arm Cable Front Raise"
    ]
};

let userGoals = JSON.parse(localStorage.getItem("qu_user_goals")) || { 
    cal: 2460, p: 175, c: 350, f: 40 
};

// --- 2. SELECTORS ---

// Mode Switching
const modeFuelBtn = document.getElementById("mode-fuel");
const modeTrainBtn = document.getElementById("mode-train");
const fuelView = document.getElementById("fuel-view");
const trainView = document.getElementById("train-view");

// Common
const dateDisplay = document.getElementById("current-date-display");
const prevBtn = document.getElementById("prev-day");
const nextBtn = document.getElementById("next-day");

// FUEL Selectors
const nameInput = document.getElementById("entry-name");
const valueInput = document.getElementById("entry-value");
const addBtn = document.getElementById("add-btn");
const feed = document.getElementById("feed");
const totalCalDisplay = document.getElementById("total-cal");
const totalPDisplay = document.getElementById("total-p");
const totalCDisplay = document.getElementById("total-c");
const totalFDisplay = document.getElementById("total-f");

const toggleCreatorBtn = document.getElementById("toggle-creator-btn");
const creatorPanel = document.getElementById("creator-form");
const newFoodName = document.getElementById("new-food-name");
const newServing = document.getElementById("new-serving");
const newUnit = document.getElementById("new-unit");
const newP = document.getElementById("new-p");
const newC = document.getElementById("new-c");
const newF = document.getElementById("new-f");
const calcCalories = document.getElementById("calc-calories");
const saveFoodBtn = document.getElementById("save-food-btn");
const libraryList = document.getElementById("library-list");
const editGoalsBtn = document.getElementById("edit-goals-btn");
const goalsForm = document.getElementById("goals-form");
const saveGoalsBtn = document.getElementById("save-goals-btn");
const inputGoalP = document.getElementById("goal-p");
const inputGoalC = document.getElementById("goal-c");
const inputGoalF = document.getElementById("goal-f");

// TRAIN SELECTORS
const trainSelector = document.getElementById("train-selector");
const trainActive = document.getElementById("train-active");
const activeSplitName = document.getElementById("active-split-name");
const exerciseList = document.getElementById("exercise-list");
const backToSplitBtn = document.getElementById("back-to-split");


// --- 3. STATE ---
let currentMode = localStorage.getItem("qu_mode") || "FUEL"; 
let entries = JSON.parse(localStorage.getItem("qu_log")) || [];
let trainingLog = JSON.parse(localStorage.getItem("qu_training_log")) || []; 
let customFoods = JSON.parse(localStorage.getItem("qu_custom_foods")) || {};
let completedSessions = JSON.parse(localStorage.getItem("qu_sessions")) || []; 
let currentDate = new Date(); 


// --- 4. VIEW LOGIC ---
function updateView() {
    if (currentMode === "FUEL") {
        fuelView.classList.remove("hidden");
        trainView.classList.add("hidden");
        modeFuelBtn.classList.add("active");
        modeTrainBtn.classList.remove("active");
    } else {
        fuelView.classList.add("hidden");
        trainView.classList.remove("hidden");
        modeFuelBtn.classList.remove("active");
        modeTrainBtn.classList.add("active");
    }
    const todayString = getDayString(new Date());
    const currentString = getDayString(currentDate);
    dateDisplay.innerText = (currentString === todayString) ? "TODAY" : currentDate.toDateString();
}

modeFuelBtn.addEventListener("click", () => { currentMode = "FUEL"; localStorage.setItem("qu_mode", "FUEL"); updateView(); });
modeTrainBtn.addEventListener("click", () => { currentMode = "TRAIN"; localStorage.setItem("qu_mode", "TRAIN"); updateView(); });


// --- 5. CORE FUNCTIONS ---

function getFullLibrary() { return { ...baseLibrary, ...customFoods }; }

function populateDropdown() {
    const library = getFullLibrary();
    nameInput.innerHTML = '<option value="" disabled selected>Select Fuel</option>';
    Object.keys(library).sort().forEach(foodName => {
        const option = document.createElement("option");
        option.value = foodName;
        option.innerText = foodName;
        nameInput.appendChild(option);
    });
}

function getDayString(dateObj) {
    return dateObj.toLocaleDateString('en-CA');
}

// --- FUEL RENDER ---
function updateTotals(todaysEntries) {
    let totals = todaysEntries.reduce((acc, entry) => {
        return {
            cal: acc.cal + (entry.calories || 0),
            p: acc.p + (entry.protein || 0),
            c: acc.c + (entry.carbs || 0),
            f: acc.f + (entry.fat || 0)
        };
    }, { cal: 0, p: 0, c: 0, f: 0 });

    totalCalDisplay.innerHTML = `${Math.round(totals.cal)} <span class="goal-text">/ ${userGoals.cal}</span>`;
    totalPDisplay.innerHTML = `${Math.round(totals.p)}g <span class="macro-goal">/ ${userGoals.p}g</span>`;
    totalCDisplay.innerHTML = `${Math.round(totals.c)}g <span class="macro-goal">/ ${userGoals.c}g</span>`;
    totalFDisplay.innerHTML = `${Math.round(totals.f)}g <span class="macro-goal">/ ${userGoals.f}g</span>`;

    updateProgressBar("bar-p", totals.p, userGoals.p);
    updateProgressBar("bar-c", totals.c, userGoals.c);
    updateProgressBar("bar-f", totals.f, userGoals.f);
}

function updateProgressBar(id, current, goal) {
    const bar = document.getElementById(id);
    if (!bar) return; 
    let percentage = (current / goal) * 100;
    if (percentage > 100) percentage = 100;
    bar.style.width = percentage + "%";
}

function loadEntries() {
    // 1. Load Food
    feed.innerHTML = "";
    const activeDayString = getDayString(currentDate);
    
    // Filter Food
    const todaysFood = entries.filter(entry => entry.date === activeDayString);
    todaysFood.forEach(entry => {
        const newItem = document.createElement("div");
        newItem.classList.add("entry-card");
        
        const unitLabel = entry.unit || "g";
        const displayValue = entry.weight ? `${entry.weight}${unitLabel}` : entry.amount;
        const p = Math.round(entry.protein);
        const c = Math.round(entry.carbs);
        const f = Math.round(entry.fat);

        newItem.style.borderLeft = "3px solid #fff";
        
        newItem.innerHTML = `
            <div class="card-left">
                <span class="entry-text">${entry.item}</span>
                <div class="card-stats">
                    <span>${displayValue}</span>
                    <div class="macro-group">
                        <span class="macro-tag tag-p">${p}p</span>
                        <span class="macro-tag tag-c">${c}c</span>
                        <span class="macro-tag tag-f">${f}f</span>
                    </div>
                </div>
            </div>
            <button class="delete-btn" onclick="deleteEntry(${entry.id})">×</button>
        `;
        feed.prepend(newItem);
    });
    updateTotals(todaysFood);
}

// --- TRAIN VIEW LOGIC ---

// 1. Start the Workout
window.startWorkout = function(splitName) {
    trainSelector.classList.add("hidden");
    trainActive.classList.remove("hidden");
    activeSplitName.innerText = splitName;
    renderWorkoutPage(splitName);
}

// 2. Go Back (Standard Navigation)
backToSplitBtn.addEventListener("click", () => {
    trainActive.classList.add("hidden");
    trainSelector.classList.remove("hidden");
    updateSplitStatus(); 
});

// 3. Render the Exercise Cards (Fixed Logic)
function renderWorkoutPage(splitName) {
    exerciseList.innerHTML = "";
    const exercises = WORKOUT_SPLITS[splitName];
    const activeDate = getDayString(currentDate);

    // CHECK LOCKED STATUS
    const isLocked = completedSessions.some(s => 
        s.date === activeDate && s.split === splitName
    );

    exercises.forEach(exerciseName => {
        // A. GET HISTORY
        const history = trainingLog.filter(t => t.exercise === exerciseName).pop();
        let historyText = "no history"; 
        
        if (history) {
            historyText = `last: ${history.weight}lbs × ${history.reps}`;
        }

        // B. GET TODAY'S LOGS
        const todaysLogs = trainingLog.filter(t => 
            t.date === activeDate && 
            t.exercise === exerciseName
        );

        // 1. Generate the History HTML
        let logsHtml = "";
        todaysLogs.forEach(log => {
            const deleteVisibility = isLocked ? 'hidden-visibility' : '';
            logsHtml += `
                <div class="mini-log">
                    <span>${log.weight}lbs × ${log.reps}</span> 
                    <button class="mini-delete ${deleteVisibility}" onclick="deleteSet(${log.id}, '${splitName}')">×</button>
                </div>`;
        });

        // 2. Determine Button State (Plus vs Checkmark)
        let actionButtonHtml = '';
        if (isLocked) {
            actionButtonHtml = `<button class="log-set-btn locked-indicator">✓</button>`;
        } else {
            actionButtonHtml = `<button class="log-set-btn" onclick="logSet('${exerciseName}', '${splitName}')">+</button>`;
        }

        // 3. Determine Input State
        const disabledAttr = isLocked ? 'disabled' : '';

        // C. CREATE CARD HTML
        const card = document.createElement("div");
        card.classList.add("exercise-card");

        card.innerHTML = `
            <div class="ex-header">
                <div>
                    <span class="ex-name">${exerciseName}</span>
                    <span class="ex-history">${historyText}</span>
                </div>
            </div>
            
            <div class="today-logs">${logsHtml}</div>

            <div class="set-input-row">
                <input type="number" placeholder="lbs" id="weight-${cleanId(exerciseName)}" style="flex:1" ${disabledAttr}>
                <input type="number" placeholder="reps" id="reps-${cleanId(exerciseName)}" style="flex:1" ${disabledAttr}>
                ${actionButtonHtml}
            </div>
        `;
        
        exerciseList.appendChild(card);
    });

    // D. RENDER BOTTOM BUTTON
    if (isLocked) {
        const unlockBtn = document.createElement("button");
        unlockBtn.id = "unlock-workout-btn";
        unlockBtn.innerText = "Unlock / Edit Session";
        unlockBtn.onclick = function() {
            completedSessions = completedSessions.filter(s => 
                !(s.date === activeDate && s.split === splitName)
            );
            localStorage.setItem("qu_sessions", JSON.stringify(completedSessions));
            renderWorkoutPage(splitName);
            updateSplitStatus(); 
        };
        exerciseList.appendChild(unlockBtn);
    } else {
        const finishBtn = document.createElement("button");
        finishBtn.id = "finish-workout-btn";
        finishBtn.innerText = "Complete Session";
        finishBtn.onclick = function() {
            if (!confirm("Finish session? This will lock your logs.")) return;
            const sessionEntry = { date: activeDate, split: splitName };
            const alreadySaved = completedSessions.some(s => 
                s.date === sessionEntry.date && s.split === sessionEntry.split
            );
            if (!alreadySaved) {
                completedSessions.push(sessionEntry);
                localStorage.setItem("qu_sessions", JSON.stringify(completedSessions));
            }
            trainActive.classList.add("hidden");
            trainSelector.classList.remove("hidden");
            updateSplitStatus(); 
        };
        exerciseList.appendChild(finishBtn);
    }
}

function cleanId(str) { return str.replace(/[^a-zA-Z0-9]/g, ''); }

window.logSet = function(exerciseName, splitName) {
    const weightInput = document.getElementById(`weight-${cleanId(exerciseName)}`);
    const repsInput = document.getElementById(`reps-${cleanId(exerciseName)}`);
    
    const weight = weightInput.value;
    const reps = repsInput.value;

    if (!weight || !reps) return;

    const newSet = {
        id: Date.now(),
        date: getDayString(currentDate),
        exercise: exerciseName,
        weight: weight,
        reps: reps
    };

    trainingLog.push(newSet);
    localStorage.setItem("qu_training_log", JSON.stringify(trainingLog));
    renderWorkoutPage(splitName);
}

window.deleteSet = function(id, splitName) {
    if(confirm("Delete this set?")) {
        trainingLog = trainingLog.filter(item => item.id !== id);
        localStorage.setItem("qu_training_log", JSON.stringify(trainingLog));
        renderWorkoutPage(splitName);
    }
}

function updateSplitStatus() {
    const buttons = document.querySelectorAll(".split-btn");
    const activeDate = getDayString(currentDate);

    buttons.forEach(btn => {
        const splitName = btn.innerText.replace("✓", "").trim(); 
        const isFinished = completedSessions.some(s => 
            s.date === activeDate && s.split === splitName
        );
        if (isFinished) {
            btn.classList.add("completed");
        } else {
            btn.classList.remove("completed");
        }
    });
}

// --- 6. EVENT LISTENERS ---
addBtn.addEventListener("click", function() {
    if (nameInput.value === "" || valueInput.value === "") return;
    const foodName = nameInput.value;
    const weight = Number(valueInput.value);
    const library = getFullLibrary();
    const foodStats = library[foodName];
    const referenceSize = foodStats.serving || 100;
    const currentUnit = foodStats.unit || "g"; 
    const multiplier = weight / referenceSize;

    let entry = {
        id: Date.now(),
        date: getDayString(currentDate),
        item: foodName,
        weight: weight,
        unit: currentUnit, 
        calories: foodStats.cal * multiplier,
        protein: foodStats.p * multiplier,
        carbs: foodStats.c * multiplier,
        fat: foodStats.f * multiplier
    };

    entries.push(entry);
    localStorage.setItem("qu_log", JSON.stringify(entries));
    loadEntries(); 
    valueInput.value = "";           
    nameInput.selectedIndex = 0;     
});

window.deleteEntry = function(id) {
    entries = entries.filter(item => item.id !== id);
    localStorage.setItem("qu_log", JSON.stringify(entries));
    loadEntries();
}

prevBtn.addEventListener("click", () => { currentDate.setDate(currentDate.getDate() - 1); updateView(); loadEntries(); updateSplitStatus(); });
nextBtn.addEventListener("click", () => { currentDate.setDate(currentDate.getDate() + 1); updateView(); loadEntries(); updateSplitStatus(); });

toggleCreatorBtn.addEventListener("click", () => {
    creatorPanel.classList.toggle("hidden");
    if (creatorPanel.classList.contains("hidden")) {
        toggleCreatorBtn.innerText = "+ Create New Fuel";
    } else {
        toggleCreatorBtn.innerText = "Close Manager";
        renderCustomLibrary(); 
    }
});
[newP, newC, newF].forEach(input => input.addEventListener("input", autoCalc));
function autoCalc() {
    const p = Number(newP.value) || 0;
    const c = Number(newC.value) || 0;
    const f = Number(newF.value) || 0;
    const estCal = (p * 4) + (c * 4) + (f * 9);
    calcCalories.innerText = Math.round(estCal);
}
saveFoodBtn.addEventListener("click", () => {
    const name = newFoodName.value.trim();
    const serving = Number(newServing.value) || 100; 
    const unit = newUnit.value; 
    const p = Number(newP.value);
    const c = Number(newC.value);
    const f = Number(newF.value);
    
    // VALIDATE NEGATIVES
    if (!name || p < 0 || c < 0 || f < 0) {
        alert("Invalid food values.");
        return;
    }
    
    const cal = (p * 4) + (c * 4) + (f * 9); 
    customFoods[name] = { unit, serving, cal, p, c, f };
    localStorage.setItem("qu_custom_foods", JSON.stringify(customFoods));
    populateDropdown();
    nameInput.value = name; 
    newFoodName.value = ""; newServing.value = ""; newUnit.value = "g";
    newP.value = ""; newC.value = ""; newF.value = "";
    calcCalories.innerText = "0";
    creatorPanel.classList.add("hidden");
    toggleCreatorBtn.innerText = "+ Create New Fuel";
    renderCustomLibrary(); 
});
editGoalsBtn.addEventListener("click", () => {
    goalsForm.classList.toggle("hidden");
    if (!goalsForm.classList.contains("hidden")) {
        inputGoalP.value = userGoals.p;
        inputGoalC.value = userGoals.c;
        inputGoalF.value = userGoals.f;
    }
});
saveGoalsBtn.addEventListener("click", () => {
    // FIX: Parse as number, but treat empty as 0
    const p = Number(inputGoalP.value);
    const c = Number(inputGoalC.value);
    const f = Number(inputGoalF.value);

    // FIX: Block negatives
    if (p < 0 || c < 0 || f < 0) {
        alert("Goals cannot be negative.");
        return;
    }

    const newCal = (p * 4) + (c * 4) + (f * 9);
    userGoals = { cal: newCal, p, c, f };
    localStorage.setItem("qu_user_goals", JSON.stringify(userGoals));
    goalsForm.classList.add("hidden");
    loadEntries(); 
});
function renderCustomLibrary() {
    libraryList.innerHTML = "";
    const names = Object.keys(customFoods).sort();
    if (names.length === 0) { libraryList.innerHTML = '<div style="color:#444; font-size:0.8rem;">No custom foods yet.</div>'; return; }
    names.forEach(name => {
        const item = document.createElement("div");
        item.classList.add("lib-item");
        item.innerHTML = `<span class="lib-name">${name}</span><button class="lib-delete" onclick="deleteCustomFood('${name}')">×</button>`;
        libraryList.appendChild(item);
    });
}
window.deleteCustomFood = function(name) {
    if (confirm(`Delete "${name}"?`)) {
        delete customFoods[name];
        localStorage.setItem("qu_custom_foods", JSON.stringify(customFoods));
        renderCustomLibrary(); populateDropdown();
    }
}

// --- INIT ---
populateDropdown();
updateView(); 
loadEntries(); 
updateSplitStatus();
