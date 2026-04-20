export function generateCoachAdvice(profile, sessions, exerciseStats) {
  let advice = [];
  
  // 1. Weak Exercise Detection
  const weakExercises = Object.entries(exerciseStats)
    .filter(([_, stat]) => stat.avgForm < 70)
    .map(([name]) => name);

  if (weakExercises.length > 0) {
    advice.push(`🔥 Focus: Improve form on ${weakExercises.join(", ")}`);
  }

  // 2. Strong Exercise Detection
  const strongExercises = Object.entries(exerciseStats)
    .filter(([_, stat]) => stat.avgForm > 85)
    .map(([name]) => name);

  if (strongExercises.length > 0) {
    advice.push(`💪 Strong: Great performance in ${strongExercises.join(", ")}`);
  }

  // 3. Goal-Based Advice
  if (profile) {
    if (profile.goal === "muscle_gain") {
      advice.push("Increase resistance and focus on progressive overload.");
    }
    if (profile.goal === "fat_loss") {
      advice.push("Add more cardio and maintain consistency.");
    }
    if (profile.goal === "endurance") {
      advice.push("Focus on pace and shortening rest intervals.");
    }
  }

  // 4. Trend-Based Advice
  if (sessions.length >= 2) {
    const last = sessions[sessions.length - 1]; // Current session is NOT inside sessions yet when this runs? 
    // Wait, in endWorkoutSession, sessions.push(...) might happen before this is called.
    // If the array ends with the *current* session, then current is last, prev is length - 2.
    // I need to ensure this logic is solid.
    const prev = sessions[sessions.length - 2];
    
    if (prev && last.overallScore < prev.overallScore) {
      advice.push("Your performance dropped — focus on form and recovery.");
    } else if (prev && last.overallScore > prev.overallScore) {
      advice.push("Awesome improvement — keep building on this momentum.");
    }
  }

  // 5. Next Workout Suggestion
  let nextWorkout = [];
  if (weakExercises.length > 0) {
    nextWorkout = weakExercises.slice(0, 3);
  } else {
    nextWorkout = Object.keys(exerciseStats).slice(0, 3);
  }

  advice.push(`➡️ Next: Try focusing on ${nextWorkout.join(", ")}`);

  return {
    advice,
    nextWorkout
  };
}
