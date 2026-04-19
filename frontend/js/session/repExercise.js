import { jointAngleDegrees, evaluateAngleCondition } from "./geometry.js";
import { updateConsistencyMeter } from "./consistency.js";

/**
 * State-machine rep counting driven by `exercises.json` (`type: "rep"`).
 * Mutates `session` and DOM elements (same behavior as monolithic main.js).
 *
 * @param {object} exercise
 * @param {(name: string) => import('@mediapipe/tasks-vision').NormalizedLandmark | undefined} getJoint
 * @param {{
 *   currentState: string,
 *   count: number,
 *   repAngles: number[],
 * }} session
 * @param {{ repCountEl: HTMLElement, consistencyMeterEl: HTMLElement }} hud
 */
export function stepRepExercise(exercise, getJoint, session, hud) {
  const joints = exercise.joints.map((j) => getJoint(j));
  if (!joints.every(Boolean)) return;

  const angle = jointAngleDegrees(joints[0], joints[1], joints[2]);
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
