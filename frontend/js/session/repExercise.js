import { jointAngleDegrees, evaluateAngleCondition } from "./geometry.js";
import { updateConsistencyMeter } from "./consistency.js";

/**
 * Evaluate geometry to provide real-time form correction.
 * Returns a dictionary object containing feedback and color.
 */
function provideExerciseFeedback(exercise, angle, session, getJoint) {
  const id = exercise.id;
  const phase = session.repPhase || session.currentState;
  const flexMax = exercise.rep_accuracy?.flexed_max_angle || 90;
  
  let feedback = "";
  let color = "#00ff00"; // Default Green

  if (id === "pushup") {
    const s = getJoint("left_shoulder");
    const h = getJoint("left_hip");
    const a = getJoint("left_ankle");
    let backAngle = 180;
    if (s && h && a) backAngle = jointAngleDegrees(s, h, a);

    if (backAngle < 160) {
      feedback = "Keep back straight";
      color = "#ffff00"; // Yellow Warning
    } else if (phase === "extended" && angle > flexMax && angle < 140) {
      feedback = "Go lower";
      color = "#ff4444"; // Red Danger
    } else if (phase === "extended") {
      feedback = "Ready. Keep back straight.";
      color = "#ffffff";
    } else {
      feedback = "Good depth! Push up!";
      color = "#00ff00"; // Green Good
    }
  } else if (id === "squat") {
    if (phase === "extended" && angle > flexMax && angle < 150) {
      feedback = "Go deeper";
      color = "#ff4444";
    } else if (phase === "extended") {
      feedback = "Ready. Keep chest up.";
      color = "#ffffff";
    } else {
      feedback = "Great depth! Drive up!";
      color = "#00ff00";
    }
  } else if (id === "lunge") {
    if (phase === "extended" && angle > flexMax && angle < 150) {
      feedback = "Step deeper";
      color = "#ff4444";
    } else if (phase === "extended") {
      feedback = "Ready. Core tight.";
      color = "#ffffff";
    } else {
      feedback = "Good lunge! Drive back up.";
      color = "#00ff00";
    }
  } else if (id === "bicep_curl") {
    if (phase === "extended" && angle < 40) {
      feedback = "Don't swing your arm";
      color = "#ffff00";
    } else if (phase === "extended" && angle > 100 && angle < 150) {
      feedback = "Fully extend your arm";
      color = "#ffff00";
    } else if (phase === "extended") {
      feedback = "Ready. Control movement.";
      color = "#ffffff";
    } else {
      feedback = "Control movement";
      color = "#00ff00";
    }
  }

  if (!feedback) {
    feedback = "Good form";
    color = "#00ff00";
  }

  return { feedback, color };
}

/**
 * Legacy JSON state machine (single-frame transition when condition is true).
 */
function stepRepExerciseLegacy(exercise, angle, session, hud) {
  const stateConfig = exercise.states[session.currentState];
  const conditionMet = evaluateAngleCondition(stateConfig.condition, angle);

  if (!conditionMet) return;

  if (stateConfig.count_on === session.currentState) {
    session.count += 1;
    session.repAngles.push(angle);
    updateConsistencyMeter(session.repAngles, hud.consistencyMeterEl);
    hud.repCountEl.innerText = String(session.count);
  }
  session.currentState = stateConfig.next;
}

/**
 * Stable rep counting: hysteresis via separate flex/extend thresholds,
 * N consecutive frames in-bucket, optional cooldown between counted reps.
 * Full ROM: extended → flexed → extended = one rep (when count fires on return to extended).
 *
 * Expects `exercise.rep_accuracy`:
 * - flexed_max_angle — angle must stay below this to build "flexed" stability
 * - extended_min_angle — angle must stay above this for "extended" stability
 * - required_frames (optional, default 3)
 * - cooldown_ms (optional, default 500)
 * - min_rep_duration_ms (optional, default 800) — floor time between counted reps; uses max(cooldown_ms, this) so fast bounces cannot slip through a short cooldown alone
 * - start_phase (optional): "extended" | "flexed"
 */
function stepRepExerciseStable(exercise, angle, session, hud) {
  const ra = exercise.rep_accuracy;
  const flexMax = ra.flexed_max_angle;
  const extMin = ra.extended_min_angle;
  if (!(flexMax < extMin)) return;

  const requiredFrames = ra.required_frames ?? 3;
  const cooldownMs = ra.cooldown_ms ?? 500;
  const minRepDurationMs = ra.min_rep_duration_ms ?? 800;
  const minGapMs = Math.max(cooldownMs, minRepDurationMs);

  if (angle < flexMax) {
    session.flexedStableFrames += 1;
  } else {
    session.flexedStableFrames = 0;
  }
  if (angle > extMin) {
    session.extendedStableFrames += 1;
  } else {
    session.extendedStableFrames = 0;
  }

  if (session.repPhase === "extended" && session.flexedStableFrames >= requiredFrames) {
    session.repPhase = "flexed";
    session.flexedStableFrames = 0;
    session.extendedStableFrames = 0;
    return;
  }

  if (session.repPhase === "flexed" && session.extendedStableFrames >= requiredFrames) {
    const now = Date.now();
    if (now - session.lastRepTimeMs >= minGapMs) {
      session.count += 1;
      session.lastRepTimeMs = now;
      session.repAngles.push(angle);
      updateConsistencyMeter(session.repAngles, hud.consistencyMeterEl);
      hud.repCountEl.innerText = String(session.count);
    }
    session.repPhase = "extended";
    session.flexedStableFrames = 0;
    session.extendedStableFrames = 0;
  }
}

/**
 * Rep counting for `type: "rep"`.
 * Uses `exercise.rep_accuracy` when present; otherwise the legacy `states` machine.
 *
 * @param {object} exercise
 * @param {(name: string) => import('@mediapipe/tasks-vision').NormalizedLandmark | undefined} getJoint
 * @param {{
 *   currentState: string,
 *   count: number,
 *   repAngles: number[],
 *   repPhase: string,
 *   flexedStableFrames: number,
 *   extendedStableFrames: number,
 *   lastRepTimeMs: number,
 * }} session
 * @param {{ repCountEl: HTMLElement, consistencyMeterEl: HTMLElement }} hud
 */
export function stepRepExercise(exercise, getJoint, session, hud) {
  const joints = exercise.joints.map((j) => getJoint(j));
  if (!joints.every(Boolean)) return { reps: session.count, feedback: "No pose detected", color: "#ffffff" };

  const angle = jointAngleDegrees(joints[0], joints[1], joints[2]);

  if (exercise.rep_accuracy) {
    stepRepExerciseStable(exercise, angle, session, hud);
  } else {
    stepRepExerciseLegacy(exercise, angle, session, hud);
  }

  const { feedback, color } = provideExerciseFeedback(exercise, angle, session, getJoint);

  return {
    reps: session.count,
    feedback: feedback,
    color: color
  };
}

/**
 * Live values for tuning JSON (`?repDebug=1` on the tracker page).
 * @param {object} exercise
 * @param {(name: string) => import('@mediapipe/tasks-vision').NormalizedLandmark | undefined} getJoint
 * @param {{ currentState: string, repPhase: string, flexedStableFrames: number, extendedStableFrames: number }} session
 */
export function getRepDebugSnapshot(exercise, getJoint, session) {
  const joints = exercise.joints.map((j) => getJoint(j));
  if (!joints.every(Boolean)) {
    return {
      angle: null,
      phase: exercise.rep_accuracy
        ? session.repPhase
        : session.currentState || "—",
      state: session.currentState || "—",
      mode: exercise.rep_accuracy ? "stable" : "legacy",
      flexedStableFrames: session.flexedStableFrames,
      extendedStableFrames: session.extendedStableFrames,
    };
  }
  const angle = jointAngleDegrees(joints[0], joints[1], joints[2]);
  return {
    angle,
    phase: exercise.rep_accuracy
      ? session.repPhase
      : session.currentState || "—",
    state: session.currentState || "—",
    mode: exercise.rep_accuracy ? "stable" : "legacy",
    flexedStableFrames: session.flexedStableFrames,
    extendedStableFrames: session.extendedStableFrames,
  };
}
