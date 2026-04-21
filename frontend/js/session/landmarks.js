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

export function getLandmarkByJointName(landmarks, jointName) {
  const index = LANDMARK_INDEX_BY_JOINT_NAME[jointName];
  if (index === undefined) return undefined;
  return landmarks[index];
}

export function createJointGetter(landmarks) {
  return (jointName) => getLandmarkByJointName(landmarks, jointName);
}
