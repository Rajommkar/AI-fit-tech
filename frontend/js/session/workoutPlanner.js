const correctiveSchema = {
  pushup: {
    name: "Upper Body Stability",
    focus: "Serratus Anterior & Triceps",
    protocol: [
      "Day 1: 3x12 Incline Pushups",
      "Day 3: 4x10 Plank-to-Pushup Transitions",
      "Day 5: 3x15 Bench Dips"
    ]
  },
  squat: {
    name: "Lower Body Mechanics",
    focus: "Hip Mobility & Quad Drive",
    protocol: [
      "Day 1: 3x10 Goblet Squats",
      "Day 3: 4x15 Hip Thrusts",
      "Day 5: 3x12 Box Squats"
    ]
  },
  lunge: {
    name: "Unilateral Balance",
    focus: "Knee Stability & Core Control",
    protocol: [
      "Day 1: 3x10 Split Squats",
      "Day 3: 4x12 Reverse Lunges",
      "Day 5: 3x15 Single-Leg Glute Bridges"
    ]
  },
  bicep_curl: {
    name: "Arm Control",
    focus: "Elbow Stability & Bicep Peak",
    protocol: [
      "Day 1: 3x12 Hammer Curls",
      "Day 3: 4x10 Concentration Curls",
      "Day 5: 3x15 Zottman Curls"
    ]
  }
};

export function generateWeeklyPlan(focusArea, sessions, goal) {
  const normalizedFocus = focusArea.toLowerCase().replace(/\s+/g, "_");
  const protocolData = correctiveSchema[normalizedFocus] || {
    name: "General Foundations",
    focus: "Total Body Integration",
    protocol: [
      "Day 1: 3x12 Pushups",
      "Day 2: 3x12 Squats",
      "Day 3: 3x10 Lunges",
      "Day 4: 3x30 Plank",
      "Day 5: 4x12 Glute Bridges",
      "Day 6: 3x12 Mountain Climbers",
      "Day 7: 3x10 Burpees"
    ]
  };

  const structuredDays = protocolData.protocol.map((line, index) => {
    const [, detail = line] = line.split(":");
    const segments = detail
      .split("&")
      .map((segment) => segment.trim())
      .filter(Boolean);

    const exercises = segments.map((segment) => {
      const match = segment.match(/(\d+)x(\d+)\s+(.+)/i);
      if (!match) {
        return { name: segment, sets: 1, reps: "session" };
      }

      return {
        name: match[3].trim(),
        sets: Number(match[1]),
        reps: Number(match[2])
      };
    });

    return {
      day: index + 1,
      focus: protocolData.focus,
      goal: goal ? goal.toUpperCase().replace("_", " ") : "GENERAL",
      exercises
    };
  });

  return {
    title: protocolData.name,
    days: structuredDays
  };
}

export function generateWorkoutPlan(profile, exerciseStats) {
  let plan = [];

  const weak = Object.entries(exerciseStats)
    .filter(([, stat]) => stat.avgForm < 70)
    .map(([name]) => name);

  if (weak.length > 0) {
    plan.push(...weak.slice(0, 3));
  } else if (Object.keys(exerciseStats).length > 0) {
    plan.push(...Object.keys(exerciseStats).slice(0, 3));
  } else {
    plan.push("Pushups", "Squats", "Plank");
  }

  const baseReps =
    profile?.goal === "muscle_gain" ? 10 :
    profile?.goal === "endurance" ? 15 :
    12;

  return plan.map((exercise, index) => ({
    day: index + 1,
    exercises: [
      {
        name: exercise,
        sets: 3,
        reps: baseReps
      }
    ]
  }));
}
