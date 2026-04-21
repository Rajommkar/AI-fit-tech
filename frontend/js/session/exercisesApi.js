const DEFAULT_API_BASE = "http://localhost:8000";

export function getExercisesApiBaseUrl() {
  const fromEnv = import.meta.env?.VITE_API_BASE_URL;
  if (typeof fromEnv === "string" && fromEnv.length > 0) {
    return fromEnv.replace(/\/$/, "");
  }
  return DEFAULT_API_BASE;
}

export async function fetchExerciseDefinitions() {
  const base = getExercisesApiBaseUrl();
  const response = await fetch(`${base}/exercises`);
  if (!response.ok) {
    throw new Error(`Exercises request failed: ${response.status}`);
  }
  return response.json();
}
