export function updateConsistencyMeter(repAngles, meterElement) {
  if (repAngles.length < 2) return;
  const mean = repAngles.reduce((a, b) => a + b, 0) / repAngles.length;
  const variance =
    repAngles.reduce((sum, v) => sum + (v - mean) ** 2, 0) / repAngles.length;
  const stdDev = Math.sqrt(variance);
  const score = Math.max(0, 100 - stdDev * 5);
  meterElement.innerText = `${Math.floor(score)}%`;
}
