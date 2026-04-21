/**
 * Workout Planner Module
 * Generates corrective and performance-based training plans.
 */

const correctiveSchema = {
  pushup: {
    name: "Upper Body Stability",
    focus: "Serratus Anterior & Triceps",
    protocol: [
      "Day 1: 3x12 Incline Pushups (Slow Eccentric)",
      "Day 3: 4x10 Plank-to-Pushup Transitions",
      "Day 5: 3x15 Bench Dips (Controlled ROM)"
    ]
  },
  squat: {
    name: "Lower Body Mechanics",
    focus: "Hip Mobility & Quad Drive",
    protocol: [
      "Day 1: 3x10 Goblet Squats (3s Pause at bottom)",
      "Day 3: 4x15 Hip Thrusts (Glute Activation)",
      "Day 5: 3x12 Box Squats (Mastering Depth)"
    ]
  },
  lunge: {
    name: "Unilateral Balance",
    focus: "Knee Stability & Core Control",
    protocol: [
      "Day 1: 3x10 Split Squats (Left/Right)",
      "Day 3: 4x12 Reverse Lunges (Stay Upright)",
      "Day 5: 3x15 Single-Leg Glute Bridges"
    ]
  },
  bicep_curl: {
    name: "Arm Control",
    focus: "Elbow Stability & Bicep Peak",
    protocol: [
      "Day 1: 3x12 Hammer Curls (No swinging)",
      "Day 3: 4x10 Concentration Curls",
      "Day 5: 3x15 Eccentric-Focused Zottman Curls"
    ]
  }
};

/**
 * Generates a 7-day plan text summary
 */
export function generateWeeklyPlan(focusArea, sessions, goal) {
  const normalizedFocus = focusArea.toLowerCase().replace(" ", "_");
  const protocolData = correctiveSchema[normalizedFocus] || {
    name: "General Foundations",
    focus: "Total Body Integration",
    protocol: [
      "Day 1: 3x12 Pushups & 3x12 Squats",
      "Day 3: Full Body Mobility (20 mins)",
      "Day 5: 4x15 Dynamic Planks & Lunges"
    ]
  };

  const planLines = [
    `📅 --- 7-DAY TRANSFORMATION PLAN ---`,
    `Focus Area: ${protocolData.name} (${protocolData.focus})`,
    `Goal Override: ${goal ? goal.toUpperCase().replace("_", " ") : "GENERAL"}`,
    `--------------------------------------`,
    ...protocolData.protocol,
    `--------------------------------------`,
    `💡 Coach Note: Focus on quality over volume for these corrective days.`
  ];

  return {
    title: protocolData.name,
    text: planLines.join("\n"),
    rawProtocol: protocolData.protocol
  };
}
