/**
 * Habit Tracking System
 * Manages long-term consistency goals and habit scores.
 */

const DEFAULT_GOAL_SESSIONS_PER_WEEK = 3;

/**
 * Initializes and retrieves the Habit state from localStorage
 */
export function getHabitState() {
  const data = localStorage.getItem("habitState");
  if (!data) {
    return {
      weeklyGoal: DEFAULT_GOAL_SESSIONS_PER_WEEK,
      consistencyScore: 0,
      totalSessionsAllTime: 0,
      lastSessionDate: null,
      currentWeekSessions: 0
    };
  }
  return JSON.parse(data);
}

/**
 * Updates habit logic after a session
 */
export function processSessionForHabit(sessions) {
  const state = getHabitState();
  
  // 1. Calculate weekly session count
  const now = new Date();
  const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
  startOfWeek.setHours(0, 0, 0, 0);

  const thisWeekSessions = sessions.filter(s => new Date(s.date) >= startOfWeek).length;
  
  // 2. Calculate Consistency Score (0-100)
  // Formula: (Sessions This Week / Goal) * Weight + (All Time Volume / Scale)
  const weeklyRatio = Math.min(1, thisWeekSessions / state.weeklyGoal);
  const volumeBonus = Math.min(20, sessions.length / 5); // 1 point for every 5 sessions, max 20
  
  state.currentWeekSessions = thisWeekSessions;
  state.consistencyScore = Math.round((weeklyRatio * 80) + volumeBonus);
  state.totalSessionsAllTime = sessions.length;
  state.lastSessionDate = now.toISOString();

  // Task 1 & 4: Calculate and Store Streak
  const streak = calculateDailyStreak(sessions);
  state.currentStreak = streak;
  localStorage.setItem("streak", streak);

  // Task 2: Missed Day Detection
  state.lastWarning = "";
  if (sessions.length >= 1) {
    const lastSession = new Date(sessions[sessions.length - 1].date);
    const diffDays = (now.getTime() - lastSession.getTime()) / (1000 * 60 * 60 * 24);
    if (diffDays > 2) {
      state.lastWarning = "You missed workouts. Stay consistent!";
    }
  }

  localStorage.setItem("habitState", JSON.stringify(state));
  return state;
}

/**
 * Task 1: Calculate Streak
 */
function calculateDailyStreak(sessions) {
  if (sessions.length === 0) return 0;
  let streak = 1;

  // Sorting strictly to ensure diff is positive
  const sorted = [...sessions].sort((a, b) => new Date(a.date) - new Date(b.date));

  for (let i = sorted.length - 1; i > 0; i--) {
    const d1 = new Date(sorted[i].date);
    const d2 = new Date(sorted[i - 1].date);

    const diff = (d1.getTime() - d2.getTime()) / (1000 * 60 * 60 * 24);

    if (diff <= 1.1) { // 1.1 to allow some buffer for exact timing
       if (Math.floor(diff) === 1) streak++;
    } else {
       break;
    }
  }

  return streak;
}

/**
 * Task 3: Reward System
 */
export function getStreakBadge(streak) {
  if (streak >= 14) return "💪 Consistency King";
  if (streak >= 7) return "🔥 7-Day Warrior";
  return "";
}

/**
 * Returns a motivational "Reward" message based on consistency
 */
export function getHabitRewardMessage(state) {
  const badge = getStreakBadge(state.currentStreak || 0);
  const badgeText = badge ? ` [Badge: ${badge}]` : "";

  if (state.consistencyScore > 90) return `🌟 ELITE CONSISTENCY: Your habits are unbreakable.${badgeText}`;
  if (state.consistencyScore > 70) return `💪 SOLID PROGRESS: You're hitting your weekly targets.${badgeText}`;
  if (state.consistencyScore > 40) return `⚡ STREAK BUILDING: Keep the momentum going!${badgeText}`;
  
  // Return fatigue/missed warning if any
  if (state.lastWarning) return `⚠️ ${state.lastWarning}`;
  
  return "🌱 FOUNDATION PHASE: Every session counts.";
}
