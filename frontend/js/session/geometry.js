/**
 * 2D angle at vertex `b` formed by segments (a→b) and (c→b), in degrees.
 * Uses normalized landmark x/y (same as original tracker).
 */
export function jointAngleDegrees(pointA, pointB, pointC) {
  const radians =
    Math.atan2(pointC.y - pointB.y, pointC.x - pointB.x) -
    Math.atan2(pointA.y - pointB.y, pointA.x - pointB.x);
  let degrees = Math.abs((radians * 180) / Math.PI);
  if (degrees > 180) degrees = 360 - degrees;
  return degrees;
}

/**
 * Parses simple conditions from `exercises.json`, e.g. "angle > 160".
 * @param {string} condition
 * @param {number} angleDegrees
 */
export function evaluateAngleCondition(condition, angleDegrees) {
  if (condition.includes(">")) {
    return angleDegrees > parseFloat(condition.split(">")[1]);
  }
  if (condition.includes("<")) {
    return angleDegrees < parseFloat(condition.split("<")[1]);
  }
  return false;
}
