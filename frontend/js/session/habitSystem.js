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

  localStorage.setItem("habitState", JSON.stringify(state));
  return state;
}

/**
 * Returns a motivational "Reward" message based on consistency
 */
export function getHabitRewardMessage(state) {
  if (state.consistencyScore > 90) return "🌟 ELITE CONSISTENCY: Your habits are unbreakable.";
  if (state.consistencyScore > 70) return "💪 SOLID PROGRESS: You're hitting your weekly targets.";
  if (state.consistencyScore > 40) return "⚡ STREAK BUILDING: Keep the momentum going!";
  return "🌱 FOUNDATION PHASE: Every session counts.";
}
