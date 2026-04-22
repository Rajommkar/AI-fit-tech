/**
 * Workout Plan UI Module
 * Handles the display of the 7-day training strategy as visual cards.
 */

const elements = {
    planContainer: null,
};

export function initPlanUI() {
    // We repurpose the workout_plan_text as a container for our cards
    elements.planContainer = document.getElementById("workout_plan_text");
}

export function showPlanLoading() {
    if (elements.planContainer) {
        elements.planContainer.innerHTML = `<div class="plan-loader">Synthesizing elite training strategy...</div>`;
    }
}

/**
 * Parses the raw text plan and renders it as visual Day Cards.
 */
export function renderPlan(planText) {
    if (!elements.planContainer) return;
    
    // Clear the container and change class for layout
    elements.planContainer.innerHTML = "";
    elements.planContainer.className = "plan-container";
    elements.planContainer.style.background = "transparent";
    elements.planContainer.style.border = "none";

    // Split by "Day X:"
    const days = planText.split(/Day \d+:/g).filter(Boolean);
    
    days.forEach((dayContent, idx) => {
        const dayCard = document.createElement("div");
        dayCard.className = "day-card";
        
        const tasks = dayContent.trim().split("\n").filter(line => line.trim().length > 0);
        
        dayCard.innerHTML = `
            <div class="day-card__header">DAY ${idx + 1}</div>
            <div class="day-card__content">
                ${tasks.map(task => `<div class="day-card__task">${task.replace(/^-\s*/, '')}</div>`).join('')}
            </div>
        `;
        
        elements.planContainer.appendChild(dayCard);
    });
}
