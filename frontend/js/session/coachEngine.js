import { generateWeeklyPlan, generateWorkoutPlan } from "./workoutPlanner.js";
import { getHabitState, processSessionForHabit, getHabitRewardMessage } from "./habitSystem.js";

/**
 * Advanced Biometric Engine
 */
export function generateCoachAdvice(profile, sessions, exerciseStats) {
  let advice = [];
  
  // 1. Technical Consistency Analysis
  let totalReps = 0;
  let perfectReps = 0;
  Object.values(exerciseStats).forEach(s => {
    totalReps += s.totalReps;
    perfectReps += s.perfect;
  });
  
  const precisionMetric = totalReps > 0 ? (perfectReps / totalReps) * 100 : 0;
  
  // 2. Weak/Strong Biomechanical Analysis
  const sortedByForm = Object.entries(exerciseStats)
    .sort((a, b) => a[1].avgForm - b[1].avgForm);

  if (sortedByForm.length > 0) {
    const weakest = sortedByForm[0];
    const strongest = sortedByForm[sortedByForm.length - 1];

    if (weakest[1].avgForm < 75) {
      advice.push({
        type: "warning",
        message: `Critical Focus: Your ${weakest[1].name} kinetic chain shows instability (Avg ${Math.round(weakest[1].avgForm)}%). Prioritize concentric control.`
      });
    }

    if (strongest[1].avgForm > 90) {
      advice.push({
        type: "success",
        message: `Elite Performance: Technical mastery achieved in ${strongest[1].name}. Consider progressive overload.`
      });
    }
  }

  // 3. Goal-Specific Optimization
  if (profile) {
    const goalMap = {
      muscle_gain: "Focus on TUT (Time Under Tension). Slow the eccentric phase to maximize muscle fiber recruitment.",
      fat_loss: "Increase power output. Target explosive transitions and maintain a sub-60s rest interval.",
      endurance: "Metabolic conditioning priority. Focus on rhythmic breathing and maintaining form under fatigue.",
      maintenance: "Consistency is key. Focus on full ROM (Range of Motion) and joint stability."
    };
    advice.push({ type: "info", message: goalMap[profile.goal || "maintenance"] });
  }

  // 4. Longitudinal Trend Analysis (Streak & Frequency)
  const streak = calculateStreak(sessions);
  if (streak > 3) {
    advice.push({ type: "achievement", message: `${streak}-Day Momentum: Your neural pathways are adapting. Consistency is outstanding.` });
  } else if (sessions.length > 0 && streak === 0) {
    advice.push({ type: "info", message: "Welcome back. Focus on a high-volume foundational session to reactivate muscle memory." });
  }

  // --- START USER REQUESTED LOGIC ---
  const last = sessions[sessions.length - 1];
  const prev = sessions[sessions.length - 2];
  let performanceDelta = 0;

  if (prev && last) {
    performanceDelta = last.overallScore - prev.overallScore;
    
    if (performanceDelta > 5) {
      advice.push({ type: "success", message: "Great improvement! Increase intensity slightly." });
    } else if (performanceDelta < -5) {
      advice.push({ type: "warning", message: "Performance dropped. Focus on recovery and form." });
    }

    if (performanceDelta < -10 && last.avgSpeed > prev.avgSpeed) {
      advice.push({ type: "warning", message: "You might be fatigued. Consider a rest day." });
    }
  }

  Object.entries(exerciseStats).forEach(([id, stat]) => {
    if (stat.avgForm < 70) {
      advice.push({ type: "warning", message: `Your ${stat.name} form is weak (${Math.round(stat.avgForm)}%). Slow down and control movement.` });
    }
  });
  // --- END USER REQUESTED LOGIC ---

  // 5. Strategic Next Workout
  const weakExNames = sortedByForm.filter(x => x[1].avgForm < 80).map(x => x[1].name);
  const focusArea = weakExNames.length > 0 ? weakExNames[0] : "General Form";

  if (weakExNames.length > 0) {
    advice.push({ type: "plan", message: `Recommended: Corrective session targeting ${weakExNames.slice(0, 2).join(" & ")}.` });
  } else {
    advice.push({ type: "plan", message: "Recommended: Full-body hypertrophy session with increased relative intensity." });
  }

  // 6. Coach Confidence
  const dataDensity = Math.min(100, (totalReps / 20) * 100);
  const confidence = Math.round((precisionMetric * 0.4) + (dataDensity * 0.6));
  advice.unshift({ type: "confidence", message: `AI Coach Confidence: ${confidence}% (Density: ${Math.round(dataDensity)}%)` });

  // 7. Habit Integration
  const habitState = processSessionForHabit(sessions);
  const habitReward = getHabitRewardMessage(habitState);
  advice.push({ type: "achievement", message: `Habit Score: ${habitState.consistencyScore}% — ${habitReward.replace(/^[^\w]+/, "")}` });

  // 8. Weekly Plan Generation
  const weeklyPlan = generateWeeklyPlan(focusArea, sessions, profile?.goal);
  const nextWorkoutBatch = generateWorkoutPlan(profile, exerciseStats);
  
  advice.push({ type: "info", message: `Next 7 Days: ${weeklyPlan.title} protocol generated.` });

  return {
    advice,
    focusArea,
    nextWorkout: nextWorkoutBatch,
    weeklyPlanText: weeklyPlan.text
  };
}

/**
 * Calculates current daily streak from session history
 */
function calculateStreak(sessions) {
  if (sessions.length === 0) return 0;
  let streak = 1;
  const sorted = [...sessions].sort((a, b) => new Date(b.date) - new Date(a.date));
  
  for (let i = 0; i < sorted.length - 1; i++) {
    const d1 = new Date(sorted[i].date).setHours(0,0,0,0);
    const d2 = new Date(sorted[i+1].date).setHours(0,0,0,0);
    const diff = (d1 - d2) / (1000 * 60 * 60 * 24);
    
    if (diff === 1) streak++;
    else if (diff === 0) continue;
    else break;
  }
  return streak;
}

