// --- 0. SUPABASE CONFIG ---
const SUPABASE_URL = 'https://vmmtbbeftdyijuwzhvvv.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZtbXRiYmVmdGR5aWp1d3podnZ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4NDU2MjEsImV4cCI6MjA4MTQyMTYyMX0.0FMniamkalbJm6LZXmUGZW5J9wcjIyfdnbDjvtnkoC8';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ADMIN CONFIG
const ADMIN_EMAIL = "quyenducngo@gmail.com"; 

// --- 1. STATE & CONSTANTS ---
let currentUser = null;
let userProfile = null;
let currentDate = new Date();
let entries = [];         // Fuel Logs
let trainingLog = [];     // Workout Logs
let completedSessions = []; // Session Locks
let customFoods = [];     // The Cloud Library
let userGoals = { cal: 2460, p: 175, c: 350, f: 40 }; // Default/Local for now
let bodyLogs = []; // State for weight

const WORKOUT_SPLITS = {
    "LEGS": ["Machine Seated Leg Extension", "Hip Thrust (Bar/Machine)", "Seated Leg Press", "Machine Seated Single Leg Curl", "DB Rear Foot Elevated Split Squat"],
    "PULL": ["Machine Seated Reverse Fly", "Cable Pullover (Standing)", "Close Grip Pulldown", "High to Low Cable Row", "Barbell Bent Over Row", "Cable Seated Wide Grip Row", "Cable Bicep Curl"],
    "PUSH": ["Cable Standing Low to High Fly", "Machine Seated Chest Fly", "DB Incline Bench Press", "DB Incline Closegrip Press", "DB Press", "DB Lateral Raise", "DB Shoulder Press", "Cable Straight Bar Tricep Pushdown"],
    "SHOULDERS": ["Machine Seated Reverse Fly", "DB Lateral Raise", "Face Pull", "DB Seated Shoulder Press", "Single Arm Cable Front Raise"]
};

// --- HELPER: Get Local Date String (YYYY-MM-DD) ---
// Fixes the "Vancouver vs UTC" bug by using local system time
function getLocalDayStr(dateObj) {
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// --- 2. DOM ELEMENTS ---
// Auth
const authOverlay = document.getElementById("auth-overlay");
const emailInput = document.getElementById("email-input");
const passInput = document.getElementById("password-input");
const loginBtn = document.getElementById("login-btn");
const msgDisplay = document.getElementById("auth-msg");

// App
const modeFuelBtn = document.getElementById("mode-fuel");
const modeTrainBtn = document.getElementById("mode-train");
const fuelView = document.getElementById("fuel-view");
const trainView = document.getElementById("train-view");
const dateDisplay = document.getElementById("current-date-display");
const prevBtn = document.getElementById("prev-day");
const nextBtn = document.getElementById("next-day");
const feed = document.getElementById("feed");
const creatorPanel = document.getElementById("creator-form");
const toggleCreatorBtn = document.getElementById("toggle-creator-btn");
const trainSelector = document.getElementById("train-selector");
const trainActive = document.getElementById("train-active");
const activeSplitName = document.getElementById("active-split-name");
const exerciseList = document.getElementById("exercise-list");
const backToSplitBtn = document.getElementById("back-to-split");
// Body View Elements
const modeBodyBtn = document.getElementById("mode-body");
const bodyView = document.getElementById("body-view");
const weightInput = document.getElementById("weight-input");
const logWeightBtn = document.getElementById("log-weight-btn");
const weightFeed = document.getElementById("weight-feed");
const currentWeightDisplay = document.getElementById("current-weight-display");

// Goals Elements
const editGoalsBtn = document.getElementById("edit-goals-btn");
const goalsForm = document.getElementById("goals-form");
const saveGoalsBtn = document.getElementById("save-goals-btn");
const goalPInput = document.getElementById("goal-p");
const goalCInput = document.getElementById("goal-c");
const goalFInput = document.getElementById("goal-f");


// --- 3. AUTHENTICATION & INIT ---

async function initApp() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session) {
        currentUser = session.user;
        authOverlay.classList.add("hidden");
        console.log("Logged in as:", currentUser.email);
        await loadProfile();
        await loadData();
    } else {
        authOverlay.classList.remove("hidden");
    }
}

// Login Handler
loginBtn.addEventListener("click", async () => {
    const email = emailInput.value;
    const password = passInput.value;
    msgDisplay.innerText = "Authenticating...";
    
    const { data, error } = await supabaseClient.auth.signInWithPassword({
        email: email,
        password: password
    });

    if (error) {
        msgDisplay.innerText = error.message;
    } else {
        currentUser = data.user;
        authOverlay.classList.add("hidden");
        await loadProfile();
        await loadData();
    }
});

// --- LOGOUT LOGIC ---
document.getElementById("logout-btn").addEventListener("click", async () => {
    const { error } = await supabaseClient.auth.signOut();
    if (!error) {
        window.location.reload(); // Reloads page -> shows Auth Overlay
    }
});

async function loadProfile() {
    let { data, error } = await supabaseClient
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .single();
    
    if (data) {
        userProfile = data;
        // FIX: If display_name is null, fallback to email nickname
        if (!userProfile.display_name) {
            userProfile.display_name = currentUser.email.split('@')[0];
        }
        updateGreeting();
    } else {
        // Fallback for new users if DB trigger failed
        userProfile = { display_name: currentUser.email.split('@')[0] };
        updateGreeting();
    }
}

function updateGreeting() {
    const greetingEl = document.getElementById("user-greeting");
    if (greetingEl && userProfile) {
        greetingEl.innerText = `Welcome, ${userProfile.display_name}`;
    }
    
    // ADMIN CHECK: Hide Creator Button if not you
    if (currentUser.email !== ADMIN_EMAIL) {
        toggleCreatorBtn.classList.add("hidden");
    } else {
        toggleCreatorBtn.classList.remove("hidden");
    }
}

// --- 4. DATA SYNC ---

async function loadData() {
    // NEW (Good): Use local date string
    const dayStr = getLocalDayStr(currentDate);

    // 1. Load Goals
    const { data: goals } = await supabaseClient.from('user_goals').select('*').eq('user_id', currentUser.id).single();
    if (goals) {
        userGoals = { 
            cal: goals.target_calories, 
            p: goals.target_p, 
            c: goals.target_c, 
            f: goals.target_f 
        };
    }

    // A. Load Food Library
    const { data: foods } = await supabaseClient.from('custom_foods').select('*');
    if (foods) customFoods = foods;
    populateDropdown(); 

    // B. Load Fuel Logs
    const { data: fuel } = await supabaseClient.from('fuel_logs').select('*').eq('date', dayStr);
    if (fuel) entries = fuel;

    // C. Load Training Logs
    const { data: train } = await supabaseClient.from('training_logs').select('*').eq('date', dayStr);
    if (train) trainingLog = train;
    
    // D. Load Body Logs
    const { data: body } = await supabaseClient
        .from('body_logs')
        .select('*')
        .order('date', { ascending: false })
        .limit(30);
    if (body) {
        bodyLogs = body;
        renderBodyFeed();
    }
    
    updateView();
    renderFuelFeed();
}

// --- 5. CORE LOGIC: FUEL ---

function getFullLibrary() {
    // Now ALL foods come from the Cloud (customFoods)
    const library = {};
    customFoods.forEach(f => {
        library[f.name] = {
            unit: f.unit,
            serving: f.serving_size, // Map DB column to App property
            cal: f.calories,
            p: f.protein,
            c: f.carbs,
            f: f.fat
        };
    });
    return library;
}

function populateDropdown() {
    const nameInput = document.getElementById("entry-name");
    const library = getFullLibrary();
    nameInput.innerHTML = '<option value="" disabled selected>Select Fuel</option>';
    Object.keys(library).sort().forEach(foodName => {
        const option = document.createElement("option");
        option.value = foodName;
        option.innerText = foodName;
        nameInput.appendChild(option);
    });
}

// --- SMART LABEL LOGIC ---
document.getElementById("entry-name").addEventListener("change", function() {
    const foodName = this.value;
    const library = getFullLibrary();
    const food = library[foodName];
    
    if (food) {
        const input = document.getElementById("entry-value");
        // If unit is 'qty', ask for 'Quantity', otherwise 'grams' or 'ml'
        input.placeholder = food.unit === 'qty' ? "Quantity (1, 2...)" : `Amount (${food.unit})`;
    }
});

// Add Fuel
document.getElementById("add-btn").addEventListener("click", async function() {
    const nameInput = document.getElementById("entry-name");
    const valueInput = document.getElementById("entry-value");
    
    if (nameInput.value === "" || valueInput.value === "") return;
    
    const foodName = nameInput.value;
    const weight = Number(valueInput.value);
    
    const fullLib = getFullLibrary(); 
    const foodStats = fullLib[foodName];
    if (!foodStats) { alert("Error finding food stats"); return; }
    
    const referenceSize = foodStats.serving_size || foodStats.serving || 100;
    const multiplier = weight / referenceSize;

    const newEntry = {
        user_id: currentUser.id,
        // NEW:
        date: getLocalDayStr(currentDate), 
        item_name: foodName,
        weight: weight,
        unit: foodStats.unit || 'g',
        calories: (foodStats.cal || foodStats.calories) * multiplier,
        protein: (foodStats.p || foodStats.protein) * multiplier,
        carbs: (foodStats.c || foodStats.carbs) * multiplier,
        fat: (foodStats.f || foodStats.fat) * multiplier
    };

    // Optimistic UI
    entries.push(newEntry);
    renderFuelFeed();
    
    // --- NEW: CLEAR THE FORM ---
    nameInput.value = "";  // Reset Dropdown to "Select Fuel"
    valueInput.value = ""; // Clear the number input
    valueInput.placeholder = "Amount"; // Reset placeholder text
    previewEl.innerText = ""; // <--- ADD THIS LINE
    // ---------------------------

    const { error } = await supabaseClient.from('fuel_logs').insert([newEntry]);
    if (error) console.error("Save failed:", error);
    else loadData(); // Reload to get real ID
});

// Delete Fuel
window.deleteEntry = async function(id) {
    if (!id) return;
    const { error } = await supabaseClient.from('fuel_logs').delete().eq('id', id);
    if (!error) {
        await loadData();
    }
};

// Render Feed
function renderFuelFeed() {
    feed.innerHTML = "";
    let totals = { cal:0, p:0, c:0, f:0 };

    entries.forEach(entry => {
        totals.cal += entry.calories;
        totals.p += entry.protein;
        totals.c += entry.carbs;
        totals.f += entry.fat;

        const newItem = document.createElement("div");
        newItem.classList.add("entry-card");
        
        // UPDATED HTML STRUCTURE:
        // 1. Name is clean on top.
        // 2. Bottom line matches the "Live Preview" format (Weight • Cal • Macros)
        newItem.innerHTML = `
            <div class="card-left">
                <span class="entry-text">${entry.item_name}</span>
                <div class="card-stats">
                    <span>${entry.weight}${entry.unit}</span>
                    
                    <span style="color:#444; margin: 0 6px;">•</span>
                    
                    <span style="color:#fff; font-weight:600;">${Math.round(entry.calories)} cal</span>
                    
                    <span style="color:#444; margin: 0 6px;">•</span>
                    
                    <span class="macro-tag tag-p">${Math.round(entry.protein)}P</span>
                    <span class="macro-tag tag-c" style="margin-left:4px;">${Math.round(entry.carbs)}C</span>
                    <span class="macro-tag tag-f" style="margin-left:4px;">${Math.round(entry.fat)}F</span>
                </div>
            </div>
            <button class="delete-btn" onclick="deleteEntry('${entry.id}')">×</button>
        `;
        feed.prepend(newItem);
    });

    // 1. Update Consumed (The Big Numbers)
    document.getElementById("total-cal").innerText = Math.round(totals.cal);
    document.getElementById("total-p").innerText = Math.round(totals.p) + "g";
    document.getElementById("total-c").innerText = Math.round(totals.c) + "g";
    document.getElementById("total-f").innerText = Math.round(totals.f) + "g";

    // 2. Update Targets
    document.getElementById("goal-cal-display").innerText = "/ " + userGoals.cal;
    document.getElementById("goal-p-display").innerText = "/ " + userGoals.p + "g";
    document.getElementById("goal-c-display").innerText = "/ " + userGoals.c + "g";
    document.getElementById("goal-f-display").innerText = "/ " + userGoals.f + "g";

    // 3. Update Progress Bars
    const pctP = Math.min((totals.p / userGoals.p) * 100, 100);
    const pctC = Math.min((totals.c / userGoals.c) * 100, 100);
    const pctF = Math.min((totals.f / userGoals.f) * 100, 100);

    document.getElementById("bar-p").style.width = `${pctP}%`;
    document.getElementById("bar-c").style.width = `${pctC}%`;
    document.getElementById("bar-f").style.width = `${pctF}%`;
}

// Create Custom Food (Admin)
document.getElementById("save-food-btn").addEventListener("click", async () => {
    const name = document.getElementById("new-food-name").value;
    const p = Number(document.getElementById("new-p").value);
    const c = Number(document.getElementById("new-c").value);
    const f = Number(document.getElementById("new-f").value);
    const cal = (p*4) + (c*4) + (f*9);

    const newFood = {
        user_id: currentUser.id,
        name: name,
        unit: document.getElementById("new-unit").value,
        serving_size: Number(document.getElementById("new-serving").value),
        calories: cal,
        protein: p,
        carbs: c,
        fat: f
    };

    const { error } = await supabaseClient.from('custom_foods').insert([newFood]);
    
    if (!error) {
        alert("Food Saved to Global DB");
        creatorPanel.classList.add("hidden");
        loadData();
    } else {
        alert("Error: " + error.message);
    }
});

// Creator Panel Toggle
toggleCreatorBtn.addEventListener("click", () => {
    creatorPanel.classList.toggle("hidden");
    toggleCreatorBtn.innerText = creatorPanel.classList.contains("hidden") ? "+ Create New Fuel" : "Close Manager";
    // We can add renderCustomLibrary() logic here later if we want to list them
});

// --- 6. CORE LOGIC: TRAIN ---

window.startWorkout = function(splitName) {
    trainSelector.classList.add("hidden");
    trainActive.classList.remove("hidden");
    activeSplitName.innerText = splitName;
    renderWorkoutPage(splitName);
}

backToSplitBtn.addEventListener("click", () => {
    trainActive.classList.add("hidden");
    trainSelector.classList.remove("hidden");
});

function renderWorkoutPage(splitName) {
    exerciseList.innerHTML = "";
    const exercises = WORKOUT_SPLITS[splitName];
    // Simple lock check (can be enhanced with DB 'sessions' table later)
    const isLocked = false; 

    exercises.forEach(exerciseName => {
        // Find logs for today
        const todaysLogs = trainingLog.filter(t => t.exercise === exerciseName);
        
        let logsHtml = "";
        todaysLogs.forEach(log => {
            logsHtml += `
                <div class="mini-log">
                    <span>${log.weight}lbs × ${log.reps}</span> 
                    <button class="mini-delete" onclick="deleteSet('${log.id}', '${splitName}')">×</button>
                </div>`;
        });

        const card = document.createElement("div");
        card.classList.add("exercise-card");
        card.innerHTML = `
            <div class="ex-header">
                <div><span class="ex-name">${exerciseName}</span></div>
            </div>
            <div class="today-logs">${logsHtml}</div>
            <div class="set-input-row">
                <input type="number" placeholder="lbs" id="weight-${cleanId(exerciseName)}" style="flex:1">
                <input type="number" placeholder="reps" id="reps-${cleanId(exerciseName)}" style="flex:1">
                <button class="log-set-btn" onclick="logSet('${exerciseName}', '${splitName}')">+</button>
            </div>
        `;
        exerciseList.appendChild(card);
    });

    const finishBtn = document.createElement("button");
    finishBtn.id = "finish-workout-btn";
    finishBtn.innerText = "Complete Session";
    finishBtn.onclick = function() {
        trainActive.classList.add("hidden");
        trainSelector.classList.remove("hidden");
        alert("Good work.");
    };
    exerciseList.appendChild(finishBtn);
}

function cleanId(str) { return str.replace(/[^a-zA-Z0-9]/g, ''); }

window.logSet = async function(exerciseName, splitName) {
    const weightInput = document.getElementById(`weight-${cleanId(exerciseName)}`);
    const repsInput = document.getElementById(`reps-${cleanId(exerciseName)}`);
    
    if (!weightInput.value || !repsInput.value) return;

    const newSet = {
        user_id: currentUser.id,
        // NEW:
        date: getLocalDayStr(currentDate),
        exercise: exerciseName,
        weight: weightInput.value,
        reps: repsInput.value
    };

    // Save to DB
    const { error } = await supabaseClient.from('training_logs').insert([newSet]);
    
    if (!error) {
        await loadData(); // Reload to sync
        renderWorkoutPage(splitName);
    }
}

window.deleteSet = async function(id, splitName) {
    if(confirm("Delete this set?")) {
        const { error } = await supabaseClient.from('training_logs').delete().eq('id', id);
        if (!error) {
            await loadData();
            renderWorkoutPage(splitName);
        }
    }
}

// --- 7. UTILS & NAVIGATION ---

function updateView() {
    // 1. Compare Local Dates to check if it's "Today"
    const now = new Date();
    const isToday = (
        currentDate.getDate() === now.getDate() &&
        currentDate.getMonth() === now.getMonth() &&
        currentDate.getFullYear() === now.getFullYear()
    );

    // 2. Format the Date (e.g., "Dec 17")
    const dateText = currentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    // 3. Set the Text
    if (isToday) {
        dateDisplay.innerText = `TODAY (${dateText})`;
    } else {
        dateDisplay.innerText = getLocalDayStr(currentDate); 
    }
    
    // Auto-calc for creator panel (Existing logic)
    const calc = () => {
        const p = Number(document.getElementById("new-p").value) || 0;
        const c = Number(document.getElementById("new-c").value) || 0;
        const f = Number(document.getElementById("new-f").value) || 0;
        document.getElementById("calc-calories").innerText = Math.round((p*4)+(c*4)+(f*9));
    };
    ["new-p","new-c","new-f"].forEach(id => document.getElementById(id).addEventListener("input", calc));
}

// Mode Switching
modeFuelBtn.addEventListener("click", () => { 
    fuelView.classList.remove("hidden"); 
    trainView.classList.add("hidden");
    bodyView.classList.add("hidden"); // Add this
    modeFuelBtn.classList.add("active");
    modeTrainBtn.classList.remove("active");
    modeBodyBtn.classList.remove("active"); // Add this
});
modeTrainBtn.addEventListener("click", () => { 
    fuelView.classList.add("hidden"); 
    trainView.classList.remove("hidden");
    bodyView.classList.add("hidden"); // Add this
    modeFuelBtn.classList.remove("active");
    modeTrainBtn.classList.add("active");
    modeBodyBtn.classList.remove("active"); // Add this
});

// Nav Listeners
prevBtn.addEventListener("click", () => {
    currentDate.setDate(currentDate.getDate() - 1);
    loadData();
});
nextBtn.addEventListener("click", () => {
    currentDate.setDate(currentDate.getDate() + 1);
    loadData();
});

// --- 8. CORE LOGIC: BODY ---

// Mode Switching
modeBodyBtn.addEventListener("click", () => {
    fuelView.classList.add("hidden");
    trainView.classList.add("hidden");
    bodyView.classList.remove("hidden");
    
    modeFuelBtn.classList.remove("active");
    modeTrainBtn.classList.remove("active");
    modeBodyBtn.classList.add("active");
});

// Update existing listeners to also hide bodyView
modeFuelBtn.addEventListener("click", () => { 
    fuelView.classList.remove("hidden"); 
    trainView.classList.add("hidden");
    bodyView.classList.add("hidden"); // Add this
    modeFuelBtn.classList.add("active");
    modeTrainBtn.classList.remove("active");
    modeBodyBtn.classList.remove("active"); // Add this
});

modeTrainBtn.addEventListener("click", () => { 
    fuelView.classList.add("hidden"); 
    trainView.classList.remove("hidden");
    bodyView.classList.add("hidden"); // Add this
    modeFuelBtn.classList.remove("active");
    modeTrainBtn.classList.add("active");
    modeBodyBtn.classList.remove("active"); // Add this
});

// Log Weight
logWeightBtn.addEventListener("click", async () => {
    const weight = weightInput.value;
    if (!weight) return;

    const newLog = {
        user_id: currentUser.id,
        // NEW:
        date: getLocalDayStr(currentDate),
        metric_type: 'weight',
        value: weight,
        unit: 'lbs'
    };

    // Optimistic UI
    bodyLogs.unshift(newLog); // Add to top of list
    renderBodyFeed();
    weightInput.value = "";

    const { error } = await supabaseClient.from('body_logs').insert([newLog]);
    if (error) console.error(error);
    else loadData(); // Reload to sync IDs
});

function renderBodyFeed() {
    weightFeed.innerHTML = "";
    
    // Update Big Display (Latest weight)
    if (bodyLogs.length > 0) {
        currentWeightDisplay.innerText = bodyLogs[0].value + " lbs";
    } else {
        currentWeightDisplay.innerText = "--";
    }

    // Render List
    bodyLogs.forEach(log => {
        const item = document.createElement("div");
        item.classList.add("weight-card");
        item.innerHTML = `
            <span class="weight-date">${log.date}</span>
            <div style="display:flex; align-items:center; gap:15px;">
                <span class="weight-val">${log.value} lbs</span>
                <button class="delete-btn" onclick="deleteBodyLog('${log.id}')" style="font-size:1.2rem;">×</button>
            </div>
        `;
        weightFeed.appendChild(item);
    });
}

window.deleteBodyLog = async function(id) {
    if (!id) return;
    if(confirm("Delete this weigh-in?")) {
        // Optimistic remove
        bodyLogs = bodyLogs.filter(l => l.id !== id);
        renderBodyFeed();
        
        const { error } = await supabaseClient.from('body_logs').delete().eq('id', id);
        if (error) loadData(); // Revert on error
    }
}

// --- 9. GOALS LOGIC ---

// Toggle Edit Form
editGoalsBtn.addEventListener("click", () => {
    goalsForm.classList.toggle("hidden");
    if (!goalsForm.classList.contains("hidden")) {
        // Pre-fill inputs with current values
        goalPInput.value = userGoals.p;
        goalCInput.value = userGoals.c;
        goalFInput.value = userGoals.f;
    }
});

// Save Goals
saveGoalsBtn.addEventListener("click", async () => {
    const p = Number(goalPInput.value);
    const c = Number(goalCInput.value);
    const f = Number(goalFInput.value);
    const cal = Math.round((p * 4) + (c * 4) + (f * 9));

    // Update Local State
    userGoals = { cal, p, c, f };

    // Update UI immediately
    goalsForm.classList.add("hidden");
    renderFuelFeed(); // Re-render bars

    // Save to Supabase (Upsert handles Insert or Update)
    const { error } = await supabaseClient.from('user_goals').upsert({
        user_id: currentUser.id,
        target_calories: cal,
        target_p: p,
        target_c: c,
        target_f: f,
        updated_at: new Date()
    });

    if (error) console.error("Error saving goals:", error);
});

// --- LIVE PREVIEW LOGIC ---
const previewEl = document.getElementById("live-preview");
const entryName = document.getElementById("entry-name");
const entryVal = document.getElementById("entry-value");

function updateLivePreview() {
    const foodName = entryName.value;
    const weight = Number(entryVal.value);

    // If data is missing, clear text
    if (!foodName || !weight) {
        previewEl.innerText = ""; 
        return;
    }

    const lib = getFullLibrary();
    const food = lib[foodName];

    if (food) {
        const refSize = food.serving || food.serving_size || 100;
        const ratio = weight / refSize;

        const cal = Math.round(food.cal * ratio);
        const p = Math.round(food.p * ratio);
        const c = Math.round(food.c * ratio);
        const f = Math.round(food.f * ratio);

        // Update the text
        previewEl.innerHTML = `<span style="color:#fff">${cal} cal</span> <span style="color:#666"> • </span> <span style="color:#4ade80">${p}P</span> <span style="color:#60a5fa">${c}C</span> <span style="color:#f87171">${f}F</span>`;
    }
}

// Attach listeners
entryName.addEventListener("change", updateLivePreview);
entryVal.addEventListener("input", updateLivePreview);

// START
initApp();
