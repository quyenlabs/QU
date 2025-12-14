// 1. SELECTORS
const nameInput = document.getElementById("entry-name");
const valueInput = document.getElementById("entry-value");
const addBtn = document.getElementById("add-btn");
const feed = document.getElementById("feed");
const totalDisplay = document.getElementById("total-number"); // A. SELECTOR FOR TOTAL

// 2. STATE
let entries = JSON.parse(localStorage.getItem("qu_log")) || [];

// B. THE MATH FUNCTION
function updateTotal() {
    // .reduce( (accumulator, currentItem) => math, startingValue )
    let total = entries.reduce((sum, entry) => sum + entry.amount, 0);
    
    // Display it
    totalDisplay.innerText = total;
}

// 3. INITIALIZER
function loadEntries() {
    feed.innerHTML = "";
    
    entries.forEach(entry => {
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

    // Recalculate total whenever we load/reload list
    updateTotal();
}

// 4. THE DELETE FUNCTION
window.deleteEntry = function(id) {
    console.log("Deleting ID:", id);
    
    entries = entries.filter(item => item.id !== id);
    
    localStorage.setItem("qu_log", JSON.stringify(entries));
    
    loadEntries();
}

// Load on startup
loadEntries();

// 5. THE ADD ACTION
addBtn.addEventListener("click", function() {
    if (nameInput.value === "") return;

    let entry = {
        id: Date.now(),
        item: nameInput.value,
        amount: Number(valueInput.value), // <--- CRITICAL FIX (ensures math works)
        timestamp: new Date()
    };

    entries.push(entry);
    localStorage.setItem("qu_log", JSON.stringify(entries));
    loadEntries(); 

    nameInput.value = "";
    valueInput.value = "";
});
