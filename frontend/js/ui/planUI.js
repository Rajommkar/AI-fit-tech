const elements = {
    planContainer: null,
    copyButton: null,
    currentPlan: [],
};

export function initPlanUI() {
    elements.planContainer = document.getElementById("planContent");
    elements.copyButton = document.getElementById("copyPlanBtn");
    elements.copyButton?.addEventListener("click", copyPlan);
}

export function showPlanLoading() {
    if (elements.planContainer) {
        elements.planContainer.innerHTML = `<div class="plan-day">Building your next 7 days...</div>`;
    }
}

export function renderPlan(planData) {
    if (!elements.planContainer) return;

    elements.currentPlan = Array.isArray(planData) ? planData : [];
    elements.planContainer.innerHTML = "";

    if (!elements.currentPlan.length) {
        elements.planContainer.innerHTML = "No plan available.";
        return;
    }

    elements.currentPlan.forEach((day, index) => {
        const div = document.createElement("div");
        div.className = "plan-day";

        let itemsHTML = "";
        day.exercises.forEach((exercise) => {
            itemsHTML += `
                <div class="plan-item">
                    ${exercise.name} — ${exercise.sets}x${exercise.reps}
                </div>
            `;
        });

        div.innerHTML = `
            <h3>Day ${day.day || index + 1}</h3>
            ${itemsHTML}
        `;

        elements.planContainer.appendChild(div);
    });
}

async function copyPlan() {
    if (!elements.currentPlan.length) return;

    const text = elements.currentPlan
        .map((day, index) => {
            const exercises = day.exercises
                .map((exercise) => `${exercise.name} - ${exercise.sets}x${exercise.reps}`)
                .join("\n");

            return `Day ${day.day || index + 1}\n${exercises}`;
        })
        .join("\n\n");

    try {
        await navigator.clipboard.writeText(text);
        if (elements.copyButton) elements.copyButton.innerText = "Copied";
        window.setTimeout(() => {
            if (elements.copyButton) elements.copyButton.innerText = "Copy Plan";
        }, 1500);
    } catch (error) {
        console.error("Copy failed", error);
    }
}
