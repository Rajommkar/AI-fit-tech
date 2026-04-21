export function jointAngleDegrees(pointA, pointB, pointC) {
  const radians =
    Math.atan2(pointC.y - pointB.y, pointC.x - pointB.x) -
    Math.atan2(pointA.y - pointB.y, pointA.x - pointB.x);
  let degrees = Math.abs((radians * 180) / Math.PI);
  if (degrees > 180) degrees = 360 - degrees;
  return degrees;
}

export function evaluateAngleCondition(condition, angleDegrees) {
  if (condition.includes(">")) {
    return angleDegrees > parseFloat(condition.split(">")[1]);
  }
  if (condition.includes("<")) {
    return angleDegrees < parseFloat(condition.split("<")[1]);
  }
  return false;
}
