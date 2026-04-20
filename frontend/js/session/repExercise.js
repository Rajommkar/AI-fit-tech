import { jointAngleDegrees, evaluateAngleCondition } from "./geometry.js";
import { updateConsistencyMeter } from "./consistency.js";

/**
 * Evaluate geometry to provide real-time form correction.
 * Returns a dictionary object containing feedback and color.
 */
function checkGenericForm(exercise, angle, session, getJoint) {
  const phase = session.repPhase || session.currentState;
  const flexMax = exercise.rep_accuracy?.flexed_max_angle || 90;
  
  let feedback = "Good form";
  let color = "#00ff00";

  // Check bad posture (generic core tracking if available)
  const shoulder = getJoint("left_shoulder");
  const hip = getJoint("left_hip");
  const ankle = getJoint("left_ankle");
  if (shoulder && hip && ankle) {
    const coreAngle = jointAngleDegrees(shoulder, hip, ankle);
    // Any exercise tracking the spine
    if (coreAngle < 155) {
      if (session.repFlags) session.repFlags.badPosture = true;
      feedback = "Keep back straight";
      color = "#ffff00";
    }
  }

  // Check incomplete rep (generic max flex targeting)
  if (phase === "extended" && angle > flexMax && angle < flexMax + 60) {
      if (session.repFlags) session.repFlags.incompleteRep = true;
      feedback = "Go deeper";
      color = "#ff4444";
  } else if (phase === "extended" && feedback === "Good form") {
      feedback = "Ready.";
      color = "#ffffff";
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
    session.repStartTime = Date.now();
    session.flexedStableFrames = 0;
    session.extendedStableFrames = 0;
    return null;
  }

  if (session.repPhase === "flexed" && session.extendedStableFrames >= requiredFrames) {
    const now = Date.now();
    let speedFeedback = null;
    let rating = null;

    if (now - session.lastRepTimeMs >= minGapMs) {
      session.count += 1;
      const duration = session.repStartTime ? now - session.repStartTime : 0;
      session.lastRepTimeMs = now;
      session.repAngles.push(angle);
      updateConsistencyMeter(session.repAngles, hud.consistencyMeterEl);
      hud.repCountEl.innerText = String(session.count);

      const min_time = exercise.scoring?.min_time || 800;
      const max_time = exercise.scoring?.max_time || 3000;
      
      speedFeedback = "Good Speed";
      if (duration > 0 && duration < min_time) speedFeedback = "Too Fast";
      else if (duration > max_time) speedFeedback = "Too Slow";

      if (session.repFlags?.badPosture) session.formScore -= 30;
      if (session.repFlags?.incompleteRep) session.formScore -= 40;

      rating = "Good Rep";
      if (session.formScore > 80 && speedFeedback === "Good Speed") rating = "Perfect Rep";
      else if (session.formScore < 60) rating = "Bad Rep";

      if (session.repHistory) {
        session.repHistory.push({
          duration,
          formScore: session.formScore,
          rating,
          speed: speedFeedback
        });
      }

      session.formScore = 100;
      if (session.repFlags) {
        session.repFlags.badPosture = false;
        session.repFlags.incompleteRep = false;
      }
    }
    
    session.repPhase = "extended";
    session.flexedStableFrames = 0;
    session.extendedStableFrames = 0;
    
    return speedFeedback ? { speed: speedFeedback, rating } : null;
  }
  return null;
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

  let metrics = null;
  if (exercise.rep_accuracy) {
    metrics = stepRepExerciseStable(exercise, angle, session, hud);
  } else {
    stepRepExerciseLegacy(exercise, angle, session, hud);
  }

  const { feedback, color } = checkGenericForm(exercise, angle, session, getJoint);

  return {
    reps: session.count,
    feedback: feedback,
    color: color,
    speed: metrics ? metrics.speed : null,
    rating: metrics ? metrics.rating : null
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
