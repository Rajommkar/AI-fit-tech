import { generateWeeklyPlan, generateWorkoutPlan } from "./workoutPlanner.js";
import { processSessionForHabit, getHabitRewardMessage } from "./habitSystem.js";

export function generateCoachAdvice(profile, sessions, exerciseStats) {
  const sortedByForm = Object.entries(exerciseStats)
    .sort((a, b) => a[1].avgForm - b[1].avgForm);

  const weakExercises = sortedByForm
    .filter(([, stat]) => stat.avgForm < 80)
    .map(([, stat]) => stat.name);

  const strongExercises = [...sortedByForm]
    .reverse()
    .filter(([, stat]) => stat.avgForm >= 85)
    .map(([, stat]) => stat.name);

  const habitState = processSessionForHabit(sessions);
  const habitReward = getHabitRewardMessage(habitState).replace(/^[^\w]+/, "");
  const streak = calculateStreak(sessions);

  const goalActions = {
    muscle_gain: "Focus on slower lowering phases and controlled tension on every rep.",
    fat_loss: "Keep your pace honest, but do not let speed break your form.",
    endurance: "Lock in breathing rhythm and stay smooth through later reps.",
    maintenance: "Focus on controlled movement and proper form."
  };

  const focusArea = weakExercises.length > 0 ? weakExercises[0] : "General Form";
  const weeklyPlan = generateWeeklyPlan(focusArea, sessions, profile?.goal);
  const nextWorkoutBatch = generateWorkoutPlan(profile, exerciseStats);
  const avgFormAcrossSession = sortedByForm.length
    ? Math.round(sortedByForm.reduce((sum, [, stat]) => sum + stat.avgForm, 0) / sortedByForm.length)
    : 0;
  const confidence = avgFormAcrossSession >= 82 ? "High" : avgFormAcrossSession >= 65 ? "Medium" : "Building";

  return {
    positive: strongExercises.length > 0
      ? `Nice work on ${strongExercises.slice(0, 3).join(", ")}. Solid progress with controlled, repeatable reps.`
      : streak > 1
        ? `You are building real momentum with a ${streak}-session streak. ${habitReward}`
        : "You showed up and got useful work in today. That's a strong base to build from.",
    problem: weakExercises.length > 0
      ? `Your ${weakExercises.slice(0, 3).join(", ")} need more depth and control. Let's refine that next.`
      : "No major red flags yet. Keep building clean reps so we can coach the smaller details.",
    action: `You're doing well - now let's refine your depth. ${goalActions[profile?.goal || "maintenance"] || "Focus on controlled movement and proper form."}`,
    confidence,
    focus: weakExercises.slice(0, 3),
    nextWorkout: nextWorkoutBatch,
    weeklyPlan: weeklyPlan.days
  };
}

function calculateStreak(sessions) {
  if (sessions.length === 0) return 0;

  let streak = 1;
  const sorted = [...sessions].sort((a, b) => new Date(b.date) - new Date(a.date));

  for (let i = 0; i < sorted.length - 1; i++) {
    const d1 = new Date(sorted[i].date).setHours(0, 0, 0, 0);
    const d2 = new Date(sorted[i + 1].date).setHours(0, 0, 0, 0);
    const diff = (d1 - d2) / (1000 * 60 * 60 * 24);

    if (diff === 1) streak++;
    else if (diff === 0) continue;
    else break;
  }

  return streak;
}
