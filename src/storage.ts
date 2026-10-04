import type { Progress } from "./types";
const KEY = "android-study-studio.progress.v1";
export function readProgress(): Record<string, Progress> {
  try {
    return validateProgress(JSON.parse(localStorage.getItem(KEY) || "{}"));
  } catch {
    return {};
  }
}
export function validateProgress(value: unknown): Record<string, Progress> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw Error("Invalid progress file.");
  const entries = Object.entries(value);
  if (entries.length > 1000) throw Error("Progress file is too large.");
  const result: Record<string, Progress> = {};
  for (const [id, p] of entries) {
    if (!/^\d+[A-Z]$/.test(id) || !p || typeof p !== "object")
      throw Error("Invalid topic entry.");
    const row = p as Progress;
    if (
      !["reading", "complete"].includes(row.status) ||
      !Number.isFinite(row.updatedAt) ||
      (row.section !== undefined && typeof row.section !== "string")
    )
      throw Error("Invalid progress entry.");
    result[id] = {
      status: row.status,
      updatedAt: row.updatedAt,
      ...(row.section ? { section: row.section } : {}),
    };
  }
  return result;
}
export function saveProgress(value: Record<string, Progress>) {
  localStorage.setItem(KEY, JSON.stringify(value));
}
export function theme() {
  try {
    return localStorage.getItem("android-study-studio.theme") || "light";
  } catch {
    return "light";
  }
}
