export function stepSequenceExercise(exercise, landmarks, session, hud) {
  const headY = landmarks[0].y;
  const stageName = exercise.stages[session.currentStageIndex];
  let stageReached = false;

  if (stageName === "STANDING" && headY < 0.4) stageReached = true;
  if (stageName === "SQUAT" && headY > 0.7) stageReached = true;
  if (stageName === "PLANK" && Math.abs(landmarks[11].y - landmarks[23].y) < 0.1) {
    stageReached = true;
  }
  if (stageName === "JUMP" && headY < 0.2) stageReached = true;

  if (!stageReached) return;

  if (stageName === exercise.count_on) {
    session.count += 1;
    hud.repCountEl.innerText = String(session.count);
  }
  session.currentStageIndex =
    (session.currentStageIndex + 1) % exercise.stages.length;
}
