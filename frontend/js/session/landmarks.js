/**
 * MediaPipe pose landmark indices (33-point model).
 * Used by rep logic to resolve joint names from exercise JSON.
 */
export const LANDMARK_INDEX_BY_JOINT_NAME = Object.freeze({
  left_shoulder: 11,
  right_shoulder: 12,
  left_elbow: 13,
  right_elbow: 14,
  left_wrist: 15,
  right_wrist: 16,
  left_hip: 23,
  right_hip: 24,
  left_knee: 25,
  right_knee: 26,
  left_ankle: 27,
  right_ankle: 28,
});

/**
 * @param {import('@mediapipe/tasks-vision').NormalizedLandmark[]} landmarks
 * @param {string} jointName
 */
export function getLandmarkByJointName(landmarks, jointName) {
  const index = LANDMARK_INDEX_BY_JOINT_NAME[jointName];
  if (index === undefined) return undefined;
  return landmarks[index];
}

/**
 * Returns a getter bound to the current frame's landmarks.
 * @param {import('@mediapipe/tasks-vision').NormalizedLandmark[]} landmarks
 */
export function createJointGetter(landmarks) {
  return (jointName) => getLandmarkByJointName(landmarks, jointName);
}
