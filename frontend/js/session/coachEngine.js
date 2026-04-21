/**
 * Advanced Biometric Engine
 * Analyzes session metrics to provide elite-level technical coaching.
 */
export function generateCoachAdvice(profile, sessions, exerciseStats) {
  let advice = [];
  
  // 1. Technical Consistency Analysis (Standard Deviation Mock/Metric)
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
      advice.push(`<strong>Critical Focus:</strong> Your ${weakest[0]} kinetic chain shows instability (Avg ${Math.round(weakest[1].avgForm)}%). Prioritize concentric control.`);
    }

    if (strongest[1].avgForm > 90) {
      advice.push(`<strong>Elite Performance:</strong> Technical mastery achieved in ${strongest[0]}. Consider progressive overload or advanced variations.`);
    }
  }

  // 3. Goal-Specific Optimization (Technical Tone)
  if (profile) {
    const goalMap = {
      muscle_gain: "Focus on TUT (Time Under Tension). Slow the eccentric phase to maximize muscle fiber recruitment.",
      fat_loss: "Increase power output. Target explosive transitions and maintain a sub-60s rest interval.",
      endurance: "Metabolic conditioning priority. Focus on rhythmic breathing and maintaining form under fatigue.",
      maintenance: "Consistency is key. Focus on full ROM (Range of Motion) and joint stability."
    };
    advice.push(goalMap[profile.goal || "maintenance"]);
  }

  // 4. Longitudinal Trend Analysis (Streak & Frequency)
  const streak = calculateStreak(sessions);
  if (streak > 3) {
    advice.push(`🔥 <strong>${streak}-Day Momentum:</strong> Your neural pathways are adapting. Consistency is outstanding.`);
  } else if (sessions.length > 0 && streak === 0) {
    advice.push("Welcome back. Focus on a high-volume foundational session to reactivate muscle memory.");
  }

  // --- START USER REQUESTED LOGIC ---
  const last = sessions[sessions.length - 1];
  const prev = sessions[sessions.length - 2];
  let performanceDelta = 0;

  if (prev && last) {
    performanceDelta = last.overallScore - prev.overallScore;
    
    // Task 2: Intelligent Feedback
    if (performanceDelta > 5) {
      advice.push("Great improvement! Increase intensity slightly.");
    } else if (performanceDelta < -5) {
      advice.push("Performance dropped. Focus on recovery and form.");
    }

    // Task 4: Fatigue Detection
    // Note: avgSpeed in our system is ms/rep. Higher value = slower.
    // User requested: last.avgSpeed > prev.avgSpeed (meaning person slowed down)
    if (performanceDelta < -10 && last.avgSpeed > prev.avgSpeed) {
      advice.push("You might be fatigued. Consider a rest day.");
    }
  }

  // Task 3: Exercise-Level Insight
  Object.entries(exerciseStats).forEach(([ex, stat]) => {
    if (stat.avgForm < 70) {
      advice.push(`Your ${ex} form is weak (${Math.round(stat.avgForm)}%). Slow down and control movement.`);
    }
  });
  // --- END USER REQUESTED LOGIC ---

  // 5. Strategic Next Workout
  const weakExNames = sortedByForm.filter(x => x[1].avgForm < 80).map(x => x[0]);
  const focusArea = weakExNames.length > 0 ? weakExNames[0] : "General Form";

  if (weakExNames.length > 0) {
    advice.push(`➡️ <strong>Recommended:</strong> Corrective session targeting <u>${weakExNames.slice(0, 2).join(" & ")}</u>.`);
  } else {
    advice.push("➡️ <strong>Recommended:</strong> Full-body hypertrophy session with increased relative intensity.");
  }

  // 6. Coach Confidence (Based on Data Density)
  const dataDensity = Math.min(100, (totalReps / 20) * 100);
  const confidence = Math.round((precisionMetric * 0.4) + (dataDensity * 0.6));
  advice.unshift(`<strong>AI Coach Confidence: ${confidence}%</strong> (Session Data Density: ${Math.round(dataDensity)}%)`);

  return {
    advice,
    focusArea,
    nextWorkout: weakExNames.slice(0, 3)
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

