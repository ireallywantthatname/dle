const STORAGE_KEY = "dle_recent_v1";
const MAX_RECENT = 6;

export interface RecentRecord {
  id: string;
  viewedAt: number;
}

export function readRecentRecords(): RecentRecord[] {
  if (typeof window === "undefined") {
    return [];
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter(
      (entry): entry is RecentRecord =>
        typeof entry === "object" &&
        entry !== null &&
        typeof entry.id === "string" &&
        typeof entry.viewedAt === "number",
    );
  } catch {
    return [];
  }
}

export function recordRecentItem(id: string): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    const existing = readRecentRecords().filter((entry) => entry.id !== id);
    const next: RecentRecord[] = [
      { id, viewedAt: Date.now() },
      ...existing,
    ].slice(0, MAX_RECENT);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {}
}

export function clearRecentItems(): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {}
}
