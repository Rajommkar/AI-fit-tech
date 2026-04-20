export function generateCoachAdvice(profile, sessions, exerciseStats) {
  let advice = [];
  
  // 1. Weak Exercise Detection
  const weakExercisesList = Object.entries(exerciseStats)
    .filter(([_, stat]) => stat.avgForm < 70);

  if (weakExercisesList.length > 0) {
    const focusEx = weakExercisesList[0];
    advice.push(`🎯 Focus Today: ${focusEx[0]}`);

    weakExercisesList.forEach(([name, stat]) => {
      advice.push(`🔥 Your ${name} form dropped to ${Math.round(stat.avgForm)}%. Focus on depth and control.`);
    });
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

  // 4. Trend-Based Advice and Frequency
  if (sessions.length < 3) {
    advice.push("Train at least 3 times per week for better results.");
  }

  if (sessions.length >= 2) {
    const last = sessions[sessions.length - 1];
    const prev = sessions[sessions.length - 2];
    
    if (last.overallScore < prev.overallScore - 10) {
      advice.push("Consider rest or lighter session tomorrow.");
    } else if (last.overallScore < prev.overallScore) {
      advice.push("Your performance dropped slightly — focus on form and recovery.");
    } else if (last.overallScore > prev.overallScore) {
      advice.push("Awesome improvement — keep building on this momentum.");
    }
  }

  // 5. Next Workout Suggestion
  let nextWorkout = [];
  if (weakExercisesList.length > 0) {
    nextWorkout = weakExercisesList.slice(0, 3).map(([name]) => name);
  } else {
    nextWorkout = Object.keys(exerciseStats).slice(0, 3);
  }

  advice.push(`➡️ Next: Try focusing on ${nextWorkout.join(", ")}`);

  // 6. Confidence Score
  // Calculate consistency metric from stats
  let totalPerf = 0;
  let totalRepCount = 0;
  Object.values(exerciseStats).forEach(st => {
    totalPerf += st.perfect;
    totalRepCount += st.totalReps;
  });
  const consistency = totalRepCount > 0 ? (totalPerf / totalRepCount) * 100 : 0;
  const overallScoreComputed = sessions.length > 0 ? (sessions[sessions.length - 1].overallScore || 0) : 0;
  const confidence = Math.round((overallScoreComputed + consistency) / 2);

  advice.unshift(`<strong>Coach Confidence: ${confidence}%</strong>`);

  return {
    advice,
    nextWorkout
  };
}
