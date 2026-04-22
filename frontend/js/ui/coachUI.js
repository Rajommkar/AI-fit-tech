/**
 * AI Coach UI Module
 * Handles conversational coaching feedback.
 */

const elements = {
    coachAdviceList: null,
};

export function initCoachUI() {
    elements.coachAdviceList = document.getElementById("coach-advice");
}

/**
 * Renders the AI coach advice list.
 * Follows the Positive -> Problem -> Action structure.
 */
export function renderCoachAdvice(adviceArray) {
    if (!elements.coachAdviceList) return;
    elements.coachAdviceList.innerHTML = "";

    adviceArray.forEach((obj, idx) => {
        const li = document.createElement("li");
        li.className = `coach-advice-item coach-advice--${obj.type}`;
        li.style.animationDelay = `${idx * 0.1}s`;
        
        const icon = document.createElement("span");
        icon.className = "coach-advice-icon";
        
        switch(obj.type) {
            case "warning": icon.innerText = "⚠️"; break;
            case "success": icon.innerText = "✅"; break;
            case "achievement": icon.innerText = "🔥"; break;
            case "confidence": icon.innerText = "🤖"; break;
            case "plan": icon.innerText = "📋"; break;
            default: icon.innerText = "•";
        }

        const text = document.createElement("span");
        text.className = "coach-advice-text";
        text.textContent = obj.message;

        li.appendChild(icon);
        li.appendChild(text);
        elements.coachAdviceList.appendChild(li);
    });
}
