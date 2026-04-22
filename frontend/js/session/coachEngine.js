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

  return {
    positive: strongExercises.length > 0
      ? `Great performance in ${strongExercises.slice(0, 3).join(", ")}. Your movement looked confident and repeatable.`
      : streak > 1
        ? `You are building momentum with a ${streak}-session streak. ${habitReward}`
        : "Good consistency overall.",
    problem: weakExercises.length > 0
      ? `You need to improve ${weakExercises.slice(0, 3).join(", ")}. Slow down a little and stay more controlled through each rep.`
      : "No major issues detected.",
    action: goalActions[profile?.goal || "maintenance"] || "Focus on controlled movement and proper form.",
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
