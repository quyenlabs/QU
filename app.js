// --- 0. SUPABASE CONFIG ---
const SUPABASE_URL = 'https://vmmtbbeftdyijuwzhvvv.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZtbXRiYmVmdGR5aWp1d3podnZ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4NDU2MjEsImV4cCI6MjA4MTQyMTYyMX0.0FMniamkalbJm6LZXmUGZW5J9wcjIyfdnbDjvtnkoC8';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

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

const WORKOUT_SPLITS = {
    "LEGS": ["Machine Seated Leg Extension", "Hip Thrust (Bar/Machine)", "Seated Leg Press", "Machine Seated Single Leg Curl", "DB Rear Foot Elevated Split Squat"],
    "PULL": ["Machine Seated Reverse Fly", "Cable Pullover (Standing)", "Close Grip Pulldown", "High to Low Cable Row", "Barbell Bent Over Row", "Cable Seated Wide Grip Row", "Cable Bicep Curl"],
    "PUSH": ["Cable Standing Low to High Fly", "Machine Seated Chest Fly", "DB Incline Bench Press", "DB Incline Closegrip Press", "DB Press", "DB Lateral Raise", "DB Shoulder Press", "Cable Straight Bar Tricep Pushdown"],
    "SHOULDERS": ["Machine Seated Reverse Fly", "DB Lateral Raise", "Face Pull", "DB Seated Shoulder Press", "Single Arm Cable Front Raise"]
};

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

// --- 3. AUTHENTICATION & INIT ---

async function initApp() {
    const { data: { session } } = await supabase.auth.getSession();
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
    
    const { data, error } = await supabase.auth.signInWithPassword({
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

async function loadProfile() {
    let { data, error } = await supabase
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
    const dayStr = currentDate.toISOString().split('T')[0];

    // A. Load Global Food Library
    const { data: foods } = await supabase.from('custom_foods').select('*');
    if (foods) customFoods = foods;
    populateDropdown(); 

    // B. Load Fuel Logs
    const { data: fuel } = await supabase
        .from('fuel_logs')
        .select('*')
        .eq('date', dayStr);
    if (fuel) entries = fuel;

    // C. Load Training Logs
    const { data: train } = await supabase
        .from('training_logs')
        .select('*')
        .eq('date', dayStr);
    if (train) trainingLog = train;
    
    // Refresh UI
    updateView();
    renderFuelFeed();
}

// --- 5. CORE LOGIC: FUEL ---

function getFullLibrary() {
    const formattedCustom = {};
    customFoods.forEach(f => {
        formattedCustom[f.name] = {
            unit: f.unit,
            serving: f.serving_size,
            cal: f.calories,
            p: f.protein,
            c: f.carbs,
            f: f.fat
        };
    });
    
    const baseLibrary = {
        "Chicken Breast (Raw)":  { unit: "g", serving: 100, cal: 120, p: 23, c: 0, f: 2.5 },
        "White Rice (Cooked)":   { unit: "g", serving: 100, cal: 130, p: 2.7, c: 28, f: 0.3 },
        "Egg Whites":            { unit: "ml", serving: 100, cal: 52,  p: 11, c: 0.7, f: 0.2 },
        "Oats (Raw)":            { unit: "g", serving: 100, cal: 389, p: 16.9, c: 66, f: 6.9 },
        "Olive Oil":             { unit: "ml", serving: 100, cal: 884, p: 0, c: 0, f: 100 }
    };

    return { ...baseLibrary, ...formattedCustom };
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
        date: currentDate.toISOString().split('T')[0],
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
    
    const { error } = await supabase.from('fuel_logs').insert([newEntry]);
    if (error) console.error("Save failed:", error);
    else loadData(); // Reload to get real ID
});

// Delete Fuel
window.deleteEntry = async function(id) {
    if (!id) return;
    const { error } = await supabase.from('fuel_logs').delete().eq('id', id);
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
        newItem.innerHTML = `
            <div class="card-left">
                <span class="entry-text">${entry.item_name}</span>
                <div class="card-stats">
                    <span>${entry.weight}${entry.unit}</span>
                    <div class="macro-group">
                        <span class="macro-tag tag-p">${Math.round(entry.protein)}p</span>
                        <span class="macro-tag tag-c">${Math.round(entry.carbs)}c</span>
                        <span class="macro-tag tag-f">${Math.round(entry.fat)}f</span>
                    </div>
                </div>
            </div>
            <button class="delete-btn" onclick="deleteEntry('${entry.id}')">×</button>
        `;
        feed.prepend(newItem);
    });

    document.getElementById("total-cal").innerText = Math.round(totals.cal);
    document.getElementById("total-p").innerText = Math.round(totals.p) + "g";
    document.getElementById("total-c").innerText = Math.round(totals.c) + "g";
    document.getElementById("total-f").innerText = Math.round(totals.f) + "g";
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

    const { error } = await supabase.from('custom_foods').insert([newFood]);
    
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
        date: currentDate.toISOString().split('T')[0],
        exercise: exerciseName,
        weight: weightInput.value,
        reps: repsInput.value
    };

    // Save to DB
    const { error } = await supabase.from('training_logs').insert([newSet]);
    
    if (!error) {
        await loadData(); // Reload to sync
        renderWorkoutPage(splitName);
    }
}

window.deleteSet = async function(id, splitName) {
    if(confirm("Delete this set?")) {
        const { error } = await supabase.from('training_logs').delete().eq('id', id);
        if (!error) {
            await loadData();
            renderWorkoutPage(splitName);
        }
    }
}

// --- 7. UTILS & NAVIGATION ---

function updateView() {
    const isToday = currentDate.toDateString() === new Date().toDateString();
    dateDisplay.innerText = isToday ? "TODAY" : currentDate.toISOString().split('T')[0];
    
    // Auto-calc for creator panel
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
    modeFuelBtn.classList.add("active");
    modeTrainBtn.classList.remove("active");
});
modeTrainBtn.addEventListener("click", () => { 
    fuelView.classList.add("hidden"); 
    trainView.classList.remove("hidden");
    modeFuelBtn.classList.remove("active");
    modeTrainBtn.classList.add("active");
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

// START
initApp();
