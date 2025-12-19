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
let entries = [];         
let trainingLog = [];     
let customFoods = [];     
let userGoals = { cal: 2460, p: 175, c: 350, f: 40 }; 
let bodyLogs = []; 
let viewingUserId = null; 

const WORKOUT_SPLITS = {
    "LEGS": ["Machine Seated Leg Extension", "Hip Thrust (Bar/Machine)", "Seated Leg Press", "Machine Seated Single Leg Curl", "DB Rear Foot Elevated Split Squat"],
    "PULL": ["Machine Seated Reverse Fly", "Cable Pullover (Standing)", "Close Grip Pulldown", "High to Low Cable Row", "Barbell Bent Over Row", "Cable Seated Wide Grip Row", "Cable Bicep Curl"],
    "PUSH": ["Cable Standing Low to High Fly", "Machine Seated Chest Fly", "DB Incline Bench Press", "DB Incline Closegrip Press", "DB Press", "DB Lateral Raise", "DB Shoulder Press", "Cable Straight Bar Tricep Pushdown"],
    "SHOULDERS": ["Machine Seated Reverse Fly", "DB Lateral Raise", "Face Pull", "DB Seated Shoulder Press", "Single Arm Cable Front Raise"]
};

function getLocalDayStr(dateObj) {
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// --- 2. DOM ELEMENTS ---
const authOverlay = document.getElementById("auth-overlay");
const emailInput = document.getElementById("email-input");
const passInput = document.getElementById("password-input");
const loginBtn = document.getElementById("login-btn");
const msgDisplay = document.getElementById("auth-msg");

const modeFuelBtn = document.getElementById("mode-fuel");
const modeTrainBtn = document.getElementById("mode-train");
const modeBodyBtn = document.getElementById("mode-body");

const fuelView = document.getElementById("fuel-view");
const trainView = document.getElementById("train-view");
const bodyView = document.getElementById("body-view");

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

const weightInput = document.getElementById("weight-input");
const logWeightBtn = document.getElementById("log-weight-btn");
const weightFeed = document.getElementById("weight-feed");
const currentWeightDisplay = document.getElementById("current-weight-display");

const editGoalsBtn = document.getElementById("edit-goals-btn");
const goalsForm = document.getElementById("goals-form");
const saveGoalsBtn = document.getElementById("save-goals-btn");
const goalPInput = document.getElementById("goal-p");
const goalCInput = document.getElementById("goal-c");
const goalFInput = document.getElementById("goal-f");

const lockInOverlay = document.getElementById("lock-in-overlay");
const coachSelect = document.getElementById("coach-selector");

const mealsPanel = document.getElementById("meals-panel");
const toggleMealsBtn = document.getElementById("toggle-meals-btn");
const savedMealsList = document.getElementById("saved-meals-list");
const mealBuilderRows = document.getElementById("meal-builder-rows");

const previewEl = document.getElementById("live-preview");
const entryName = document.getElementById("entry-name");
const entryVal = document.getElementById("entry-value");

// --- 3. AUTHENTICATION & INIT ---

async function initApp() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session) {
        currentUser = session.user;
        viewingUserId = currentUser.id; 

        if (authOverlay) authOverlay.classList.add("hidden");
        
        await loadProfile();

        if (currentUser.email === ADMIN_EMAIL) {
            await loadClientList();
            
            const savedView = localStorage.getItem("admin_viewing_id");
            if (savedView && savedView !== "ME") {
                viewingUserId = savedView;
                if (coachSelect) coachSelect.value = savedView; 
                document.body.style.borderTop = "4px solid #4ade80"; 
            }
        }

        await loadData();
        triggerLockIn(); 

    } else {
        if (authOverlay) authOverlay.classList.remove("hidden");
    }
}

if (loginBtn) {
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
            window.location.reload();
        }
    });
}

if (document.getElementById("logout-btn")) {
    document.getElementById("logout-btn").addEventListener("click", async () => {
        const { error } = await supabaseClient.auth.signOut();
        if (!error) {
            window.location.reload(); 
        }
    });
}

async function loadProfile() {
    let { data, error } = await supabaseClient
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .single();
    
    if (data) {
        userProfile = data;
        if (!userProfile.display_name) {
            userProfile.display_name = currentUser.email.split('@')[0];
        }
        updateGreeting();
    } else {
        userProfile = { display_name: currentUser.email.split('@')[0] };
        updateGreeting();
    }
}

function updateGreeting() {
    const greetingEl = document.getElementById("user-greeting");
    if (greetingEl && userProfile) {
        greetingEl.innerText = `Welcome, ${userProfile.display_name}`;
    }
    if (currentUser.email !== ADMIN_EMAIL) {
        if(toggleCreatorBtn) toggleCreatorBtn.classList.add("hidden");
        if(toggleMealsBtn) toggleMealsBtn.classList.add("hidden"); 
    } else {
        if(toggleCreatorBtn) toggleCreatorBtn.classList.remove("hidden");
        if(toggleMealsBtn) toggleMealsBtn.classList.remove("hidden");
    }
}

// --- 4. DATA SYNC ---

async function loadData() {
    if (!viewingUserId) return; 

    const dayStr = getLocalDayStr(currentDate);

    // 1. Load Goals
    const { data: goals } = await supabaseClient
        .from('user_goals')
        .select('*')
        .eq('user_id', viewingUserId)
        .single();

    if (goals) {
        userGoals = { cal: goals.target_calories, p: goals.target_p, c: goals.target_c, f: goals.target_f };
    } else {
        userGoals = { cal: 2000, p: 150, c: 200, f: 60 };
    }

    // A. Load Food Library
    const { data: foods } = await supabaseClient.from('custom_foods').select('*');
    if (foods) customFoods = foods;
    populateDropdown(); 

    // B. Load Fuel Logs
    const { data: fuel } = await supabaseClient.from('fuel_logs').select('*').eq('user_id', viewingUserId).eq('date', dayStr);
    if (fuel) entries = fuel;

    // C. Load Training Logs
    const { data: train } = await supabaseClient.from('training_logs').select('*').eq('user_id', viewingUserId).eq('date', dayStr);
    if (train) trainingLog = train;
    
    // D. Load Body Logs
    const { data: body } = await supabaseClient.from('body_logs').select('*').eq('user_id', viewingUserId).order('date', { ascending: false }).limit(30);
    if (body) {
        bodyLogs = body;
        renderBodyFeed();
    }
    
    updateView();
    renderFuelFeed();
}

// --- 5. CORE LOGIC: FUEL ---

function getFullLibrary() {
    const library = {};
    customFoods.forEach(f => {
        library[f.name] = { unit: f.unit, serving: f.serving_size, cal: f.calories, p: f.protein, c: f.carbs, f: f.fat };
    });
    return library;
}

function populateDropdown() {
    if(!entryName) return;
    entryName.innerHTML = '<option value="" disabled selected>Select Fuel</option>';
    const library = getFullLibrary();
    Object.keys(library).sort().forEach(foodName => {
        const option = document.createElement("option");
        option.value = foodName;
        option.innerText = foodName;
        entryName.appendChild(option);
    });
}

if(entryName) {
    entryName.addEventListener("change", function() {
        const foodName = this.value;
        const library = getFullLibrary();
        const food = library[foodName];
        if (food) {
            entryVal.placeholder = food.unit === 'qty' ? "Quantity (1, 2...)" : `Amount (${food.unit})`;
        }
    });
}

if(document.getElementById("add-btn")) {
    document.getElementById("add-btn").addEventListener("click", async function() {
        if (entryName.value === "" || entryVal.value === "") return;
        
        const foodName = entryName.value;
        const weight = Number(entryVal.value);
        const fullLib = getFullLibrary(); 
        const foodStats = fullLib[foodName];
        
        if (!foodStats) { alert("Error finding food stats"); return; }
        
        const referenceSize = foodStats.serving_size || foodStats.serving || 100;
        const multiplier = weight / referenceSize;

        const newEntry = {
            user_id: viewingUserId,
            date: getLocalDayStr(currentDate), 
            item_name: foodName,
            weight: weight,
            unit: foodStats.unit || 'g',
            calories: (foodStats.cal || foodStats.calories) * multiplier,
            protein: (foodStats.p || foodStats.protein) * multiplier,
            carbs: (foodStats.c || foodStats.carbs) * multiplier,
            fat: (foodStats.f || foodStats.fat) * multiplier
        };

        entries.push(newEntry);
        renderFuelFeed();
        
        entryName.value = "";  
        entryVal.value = ""; 
        entryVal.placeholder = "Amount";
        if(previewEl) previewEl.innerText = ""; 

        const { error } = await supabaseClient.from('fuel_logs').insert([newEntry]);
        if (error) console.error("Save failed:", error);
        else loadData(); 
    });
}

window.deleteEntry = async function(id) {
    if (!id) return;
    const { error } = await supabaseClient.from('fuel_logs').delete().eq('id', id);
    if (!error) { await loadData(); }
};

function renderFuelFeed() {
    if(!feed) return;
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
            <div class="card-left" 
                 onclick="editEntryWeight('${entry.id}', '${entry.item_name}', ${entry.weight})"
                 style="cursor: pointer;">
                 
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

    if(document.getElementById("total-cal")) document.getElementById("total-cal").innerText = Math.round(totals.cal);
    if(document.getElementById("total-p")) document.getElementById("total-p").innerText = Math.round(totals.p) + "g";
    if(document.getElementById("total-c")) document.getElementById("total-c").innerText = Math.round(totals.c) + "g";
    if(document.getElementById("total-f")) document.getElementById("total-f").innerText = Math.round(totals.f) + "g";

    if(document.getElementById("goal-cal-display")) document.getElementById("goal-cal-display").innerText = "/ " + userGoals.cal;
    if(document.getElementById("goal-p-display")) document.getElementById("goal-p-display").innerText = "/ " + userGoals.p + "g";
    if(document.getElementById("goal-c-display")) document.getElementById("goal-c-display").innerText = "/ " + userGoals.c + "g";
    if(document.getElementById("goal-f-display")) document.getElementById("goal-f-display").innerText = "/ " + userGoals.f + "g";

    const pctP = Math.min((totals.p / userGoals.p) * 100, 100);
    const pctC = Math.min((totals.c / userGoals.c) * 100, 100);
    const pctF = Math.min((totals.f / userGoals.f) * 100, 100);

    if(document.getElementById("bar-p")) document.getElementById("bar-p").style.width = `${pctP}%`;
    if(document.getElementById("bar-c")) document.getElementById("bar-c").style.width = `${pctC}%`;
    if(document.getElementById("bar-f")) document.getElementById("bar-f").style.width = `${pctF}%`;
}

// --- 6. CORE LOGIC: TRAIN (WITH HISTORY) ---

// Helper: Remove special chars
function cleanId(str) { return str.replace(/[^a-zA-Z0-9]/g, ''); }

// Helper: Auto-save inputs
window.saveDraft = function(type, exerciseId, value) {
    localStorage.setItem(`draft_${type}_${exerciseId}`, value);
}

// UPDATED: Now Async to fetch history
window.startWorkout = async function(splitName) {
    if(trainSelector) trainSelector.classList.add("hidden");
    if(trainActive) trainActive.classList.remove("hidden");
    if(activeSplitName) activeSplitName.innerText = splitName;
    
    // 1. Fetch History (The Ghost of Workouts Past)
    const historyMap = await fetchWorkoutHistory(splitName);
    
    // 2. Render with History data
    renderWorkoutPage(splitName, historyMap);
}

// NEW: Fetch last known lifts for this split
async function fetchWorkoutHistory(splitName) {
    const exercises = WORKOUT_SPLITS[splitName];
    const history = {};

    // Fetch last 200 logs for this user, newest first
    const { data: logs } = await supabaseClient
        .from('training_logs')
        .select('*')
        .eq('user_id', viewingUserId)
        .in('exercise_name', exercises) 
        .order('date', { ascending: false })
        .limit(200);

    if (logs) {
        const today = getLocalDayStr(currentDate);
        
        logs.forEach(log => {
            // Only grab the first one found (most recent) that ISN'T today
            if (!history[log.exercise_name] && log.date !== today) {
                history[log.exercise_name] = `${log.weight}lbs × ${log.reps}`;
            }
        });
    }
    return history;
}

if(backToSplitBtn) {
    backToSplitBtn.addEventListener("click", () => {
        trainActive.classList.add("hidden");
        trainSelector.classList.remove("hidden");
    });
}

// UPDATED: Now accepts historyMap
function renderWorkoutPage(splitName, historyMap = {}) {
    if(!exerciseList) return;
    exerciseList.innerHTML = "";
    const exercises = WORKOUT_SPLITS[splitName];

    exercises.forEach(exerciseName => {
        const safeId = cleanId(exerciseName);
        
        // Recover Drafts
        const savedWeight = localStorage.getItem(`draft_weight_${safeId}`) || "";
        const savedReps = localStorage.getItem(`draft_reps_${safeId}`) || "";

        // Get Previous Best
        const lastLift = historyMap[exerciseName] || "No history";

        // Filter today's logs
        const todaysLogs = trainingLog.filter(t => t.exercise_name === exerciseName);
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
        
        // RENDER: Added the "ex-history" line below the name
        card.innerHTML = `
            <div class="ex-header">
                <div>
                    <span class="ex-name">${exerciseName}</span>
                    <span class="ex-history" style="color:#666; font-size:0.75rem; font-family:monospace;">Last: ${lastLift}</span>
                </div>
            </div>
            <div class="today-logs">${logsHtml}</div>
            <div class="set-input-row">
                <input type="number" 
                       placeholder="lbs" 
                       id="weight-${safeId}" 
                       value="${savedWeight}"
                       oninput="saveDraft('weight', '${safeId}', this.value)"
                       style="flex:1">
                       
                <input type="number" 
                       placeholder="reps" 
                       id="reps-${safeId}" 
                       value="${savedReps}"
                       oninput="saveDraft('reps', '${safeId}', this.value)"
                       style="flex:1">
                       
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

window.logSet = async function(exerciseName, splitName) {
    const safeId = cleanId(exerciseName);
    const wInput = document.getElementById(`weight-${safeId}`);
    const rInput = document.getElementById(`reps-${safeId}`);
    
    if (!wInput.value || !rInput.value) return;

    const weightVal = Number(wInput.value);
    const repsVal = Number(rInput.value);

    const newSet = {
        user_id: viewingUserId,
        date: getLocalDayStr(currentDate),
        exercise_name: exerciseName, 
        split_name: splitName,       
        weight: weightVal,
        reps: repsVal
    };

    const { error } = await supabaseClient.from('training_logs').insert([newSet]);
    
    if (!error) {
        localStorage.removeItem(`draft_weight_${safeId}`);
        localStorage.removeItem(`draft_reps_${safeId}`);
        wInput.value = "";
        rInput.value = "";

        await loadData();
        // IMPORTANT: We re-fetch history here so if he navigates away and back, it's fresh
        // But for instant re-render, we can just grab the existing history from the DOM? 
        // Simpler: Just re-run startWorkout to refresh everything or pass empty map if lazy.
        // Let's actually just re-fetch the history to be safe.
        const historyMap = await fetchWorkoutHistory(splitName);
        renderWorkoutPage(splitName, historyMap);
    } else {
        alert("Error logging set: " + error.message);
        console.error(error);
    }
}

window.deleteSet = async function(id, splitName) {
    if(confirm("Delete this set?")) {
        const { error } = await supabaseClient.from('training_logs').delete().eq('id', id);
        if (!error) {
            await loadData();
            const historyMap = await fetchWorkoutHistory(splitName);
            renderWorkoutPage(splitName, historyMap);
        }
    }
}

// --- 7. UTILS & NAVIGATION ---

function updateView() {
    const now = new Date();
    const isToday = (
        currentDate.getDate() === now.getDate() &&
        currentDate.getMonth() === now.getMonth() &&
        currentDate.getFullYear() === now.getFullYear()
    );
    const dateText = currentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    if (dateDisplay) {
        if (isToday) {
            dateDisplay.innerText = `TODAY (${dateText})`;
        } else {
            dateDisplay.innerText = getLocalDayStr(currentDate); 
        }
    }
    
    // Auto-calc listener
    const calc = () => {
        const p = Number(document.getElementById("new-p").value) || 0;
        const c = Number(document.getElementById("new-c").value) || 0;
        const f = Number(document.getElementById("new-f").value) || 0;
        document.getElementById("calc-calories").innerText = Math.round((p*4)+(c*4)+(f*9));
    };
    
    ["new-p","new-c","new-f"].forEach(id => {
        const el = document.getElementById(id);
        if(el) el.addEventListener("input", calc);
    });
}

// Mode Switching
if(modeFuelBtn) {
    modeFuelBtn.addEventListener("click", () => { 
        fuelView.classList.remove("hidden"); 
        trainView.classList.add("hidden");
        bodyView.classList.add("hidden");
        modeFuelBtn.classList.add("active");
        modeTrainBtn.classList.remove("active");
        modeBodyBtn.classList.remove("active");
    });
}
if(modeTrainBtn) {
    modeTrainBtn.addEventListener("click", () => { 
        fuelView.classList.add("hidden"); 
        trainView.classList.remove("hidden");
        bodyView.classList.add("hidden");
        modeFuelBtn.classList.remove("active");
        modeTrainBtn.classList.add("active");
        modeBodyBtn.classList.remove("active");
    });
}
if(modeBodyBtn) {
    modeBodyBtn.addEventListener("click", () => {
        fuelView.classList.add("hidden");
        trainView.classList.add("hidden");
        bodyView.classList.remove("hidden");
        modeFuelBtn.classList.remove("active");
        modeTrainBtn.classList.remove("active");
        modeBodyBtn.classList.add("active");
    });
}

if(prevBtn) {
    prevBtn.addEventListener("click", () => {
        currentDate.setDate(currentDate.getDate() - 1);
        loadData();
    });
}
if(nextBtn) {
    nextBtn.addEventListener("click", () => {
        currentDate.setDate(currentDate.getDate() + 1);
        loadData();
    });
}

// --- 8. CORE LOGIC: BODY ---
if(logWeightBtn) {
    logWeightBtn.addEventListener("click", async () => {
        const weight = weightInput.value;
        if (!weight) return;

        const newLog = {
            user_id: viewingUserId,
            date: getLocalDayStr(currentDate),
            metric_type: 'weight',
            value: weight,
            unit: 'lbs'
        };

        bodyLogs.unshift(newLog); 
        renderBodyFeed();
        weightInput.value = "";

        const { error } = await supabaseClient.from('body_logs').insert([newLog]);
        if (error) console.error(error);
        else loadData();
    });
}

function renderBodyFeed() {
    if(!weightFeed) return;
    weightFeed.innerHTML = "";
    if (bodyLogs.length > 0) {
        if(currentWeightDisplay) currentWeightDisplay.innerText = bodyLogs[0].value + " lbs";
    } else {
        if(currentWeightDisplay) currentWeightDisplay.innerText = "--";
    }

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
        bodyLogs = bodyLogs.filter(l => l.id !== id);
        renderBodyFeed();
        const { error } = await supabaseClient.from('body_logs').delete().eq('id', id);
        if (error) loadData(); 
    }
}

// --- 9. GOALS LOGIC ---
if(editGoalsBtn) {
    editGoalsBtn.addEventListener("click", () => {
        goalsForm.classList.toggle("hidden");
        if (!goalsForm.classList.contains("hidden")) {
            goalPInput.value = userGoals.p;
            goalCInput.value = userGoals.c;
            goalFInput.value = userGoals.f;
        }
    });
}

if(saveGoalsBtn) {
    saveGoalsBtn.addEventListener("click", async () => {
        const p = Number(goalPInput.value);
        const c = Number(goalCInput.value);
        const f = Number(goalFInput.value);
        const cal = Math.round((p * 4) + (c * 4) + (f * 9));

        userGoals = { cal, p, c, f };

        goalsForm.classList.add("hidden");
        renderFuelFeed(); 

        const { error } = await supabaseClient.from('user_goals').upsert({
            user_id: viewingUserId,
            target_calories: cal,
            target_p: p,
            target_c: c,
            target_f: f,
            updated_at: new Date()
        });
    });
}

// --- LIVE PREVIEW LOGIC ---
function updateLivePreview() {
    if(!entryName || !entryVal || !previewEl) return;
    const foodName = entryName.value;
    const weight = Number(entryVal.value);

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

        previewEl.innerHTML = `<span style="color:#fff">${cal} cal</span> <span style="color:#666"> • </span> <span style="color:#4ade80">${p}P</span> <span style="color:#60a5fa">${c}C</span> <span style="color:#f87171">${f}F</span>`;
    }
}

// Attach listeners
if(entryName) entryName.addEventListener("change", updateLivePreview);
if(entryVal) entryVal.addEventListener("input", updateLivePreview);

// --- COACH MODE LOGIC ---
async function loadClientList() {
    if (!coachSelect) return; // FIX: Don't run if element is missing

    coachSelect.classList.remove("hidden");
    const { data: profiles } = await supabaseClient
        .from('profiles')
        .select('id, display_name');

    if (profiles) {
        profiles.forEach(p => {
            if (p.id === currentUser.id) return;
            const opt = document.createElement("option");
            opt.value = p.id;
            opt.innerText = p.display_name || "User";
            coachSelect.appendChild(opt);
        });
    }

    coachSelect.addEventListener("change", () => {
        const selection = coachSelect.value;
        localStorage.setItem("admin_viewing_id", selection); 
        
        if (selection === "ME") {
            viewingUserId = currentUser.id;
            document.body.style.borderTop = "none"; 
        } else {
            viewingUserId = selection;
            document.body.style.borderTop = "4px solid #4ade80"; 
        }
        loadData();
    });
}

// --- DAILY LOCK IN PROTOCOL ---
function triggerLockIn() {
    if(!lockInOverlay) return;
    const todayStr = getLocalDayStr(new Date());
    const lastSeen = localStorage.getItem("last_lock_in_date");
    if (lastSeen !== todayStr) {
        lockInOverlay.classList.remove("hidden");
        lockInOverlay.addEventListener("click", () => {
            lockInOverlay.classList.add("hidden");
            localStorage.setItem("last_lock_in_date", todayStr);
        }, { once: true });
    }
}

// --- EDIT FEATURE ---
window.editEntryWeight = async function(id, foodName, currentWeight) {
    const newWeightStr = prompt(`Update amount for ${foodName}:`, currentWeight);
    if (!newWeightStr) return; 
    
    const newWeight = Number(newWeightStr);
    if (!newWeight || newWeight <= 0) return; 

    const fullLib = getFullLibrary(); 
    const foodStats = fullLib[foodName];
    if (!foodStats) {
        alert("Cannot edit: Original food source not found in library.");
        return;
    }

    const referenceSize = foodStats.serving_size || foodStats.serving || 100;
    const multiplier = newWeight / referenceSize;

    const updates = {
        weight: newWeight,
        calories: (foodStats.cal || foodStats.calories) * multiplier,
        protein: (foodStats.p || foodStats.protein) * multiplier,
        carbs: (foodStats.c || foodStats.carbs) * multiplier,
        fat: (foodStats.f || foodStats.fat) * multiplier
    };

    const index = entries.findIndex(e => e.id === id);
    if (index !== -1) {
        entries[index] = { ...entries[index], ...updates };
        renderFuelFeed(); 
    }

    const { error } = await supabaseClient
        .from('fuel_logs')
        .update(updates)
        .eq('id', id);

    if (error) {
        console.error("Update failed:", error);
        loadData(); 
    }
};

// --- MEAL MANAGER LOGIC ---

// 1. Toggle Panel (Fixed)
if(toggleMealsBtn) {
    toggleMealsBtn.addEventListener("click", () => {
        if(mealsPanel) mealsPanel.classList.toggle("hidden");
        // Force close creator if open
        if(creatorPanel) creatorPanel.classList.add("hidden"); 
        if(toggleCreatorBtn) toggleCreatorBtn.innerText = "+ New Fuel";

        if (mealsPanel && !mealsPanel.classList.contains("hidden")) {
            loadMealTemplates();
            // Start with 1 row if empty
            if (mealBuilderRows && mealBuilderRows.children.length === 0) addBuilderRow(); 
        }
    });
}

// 2. Load Templates
async function loadMealTemplates() {
    if(!savedMealsList) return;
    savedMealsList.innerHTML = "Loading...";
    
    const { data: meals } = await supabaseClient
        .from('meal_templates')
        .select('*')
        .eq('user_id', viewingUserId); 
    
    savedMealsList.innerHTML = "";
    
    if (meals && meals.length > 0) {
        meals.forEach(meal => {
            const div = document.createElement("div");
            div.className = "lib-item"; 
            div.innerHTML = `
                <span class="lib-name" style="color:#fff; font-weight:bold;">⚡️ ${meal.name}</span>
                <div style="display:flex; align-items:center;">
                    <button class="log-meal-btn" onclick="window.explodeMeal('${meal.id}')">LOG +</button>
                    <button class="lib-delete" onclick="window.deleteMealTemplate('${meal.id}')">×</button>
                </div>
            `;
            savedMealsList.appendChild(div);
        });
    } else {
        savedMealsList.innerHTML = '<p style="color:#666; font-size:0.8rem;">No saved meals.</p>';
    }
}

// 3. EXPLODE MEAL (Attached to Window for Safety)
window.explodeMeal = async function(mealId) {
    const { data: meal } = await supabaseClient.from('meal_templates').select('*').eq('id', mealId).single();
    if (!meal) return;
    
    // Quick confirm
    if (!confirm(`Log "${meal.name}" now?`)) return;

    const fullLib = getFullLibrary();
    const newLogs = [];

    meal.items.forEach(item => {
        const foodStats = fullLib[item.name];
        if (foodStats) {
            const refSize = foodStats.serving_size || foodStats.serving || 100;
            const multiplier = item.amount / refSize;

            newLogs.push({
                user_id: viewingUserId,
                date: getLocalDayStr(currentDate),
                item_name: item.name,
                weight: item.amount,
                unit: foodStats.unit || 'g',
                calories: (foodStats.cal || foodStats.calories) * multiplier,
                protein: (foodStats.p || foodStats.protein) * multiplier,
                carbs: (foodStats.c || foodStats.carbs) * multiplier,
                fat: (foodStats.f || foodStats.fat) * multiplier
            });
        }
    });

    const { error } = await supabaseClient.from('fuel_logs').insert(newLogs);
    if (!error) {
        loadData(); 
        if(mealsPanel) mealsPanel.classList.add("hidden"); 
    } else {
        alert("Error logging meal: " + error.message);
    }
};

window.deleteMealTemplate = async function(id) {
    if (confirm("Delete this preset?")) {
        await supabaseClient.from('meal_templates').delete().eq('id', id);
        loadMealTemplates();
    }
};

// 4. Meal Builder
if(document.getElementById("add-row-btn")) {
    document.getElementById("add-row-btn").addEventListener("click", addBuilderRow);
}

function addBuilderRow() {
    if(!mealBuilderRows) return;
    const row = document.createElement("div");
    row.className = "input-group-row";
    row.style.marginBottom = "5px";
    
    const select = document.createElement("select");
    select.className = "meal-builder-select";
    select.style.flex = "2";
    if(entryName) select.innerHTML = entryName.innerHTML; 
    
    const input = document.createElement("input");
    input.type = "number";
    input.placeholder = "Amt";
    input.style.flex = "1";
    input.style.minWidth = "50px";

    // Delete Row Button
    const delBtn = document.createElement("button");
    delBtn.className = "row-delete-btn";
    delBtn.innerText = "×";
    delBtn.onclick = () => row.remove();

    // Auto-update Unit
    select.addEventListener("change", () => {
        const lib = getFullLibrary();
        const food = lib[select.value];
        if(food) input.placeholder = food.unit; 
    });

    row.appendChild(select);
    row.appendChild(input);
    row.appendChild(delBtn);
    mealBuilderRows.appendChild(row);
}

// 5. Save Template
if(document.getElementById("save-meal-btn")) {
    document.getElementById("save-meal-btn").addEventListener("click", async () => {
        const name = document.getElementById("meal-builder-name").value;
        if (!name) return alert("Name your meal");

        const items = [];
        const rows = mealBuilderRows.querySelectorAll(".input-group-row");
        
        rows.forEach(row => {
            const foodName = row.querySelector("select").value;
            const amount = Number(row.querySelector("input").value);
            if (foodName && amount) {
                items.push({ name: foodName, amount: amount });
            }
        });

        if (items.length === 0) return alert("Add at least one ingredient");

        const { error } = await supabaseClient.from('meal_templates').insert({
            user_id: viewingUserId,
            name: name,
            items: items
        });

        if (!error) {
            document.getElementById("meal-builder-name").value = "";
            mealBuilderRows.innerHTML = "";
            addBuilderRow();
            loadMealTemplates(); 
        }
    });
}

// START
initApp();