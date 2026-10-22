import type { Statuses } from './engine/plan';

export interface SavedPlan {
  planId: string | null;
  name?: string;
  statuses: Statuses;
  counted?: boolean; // plan-made event already sent for this planId
  updatedAt?: string;
}

const KEY = 'bd:plan';
let memory: SavedPlan | null = null; // fallback when storage is blocked

export function emptyPlan(): SavedPlan {
  return { planId: null, statuses: {} };
}

export function loadPlan(): SavedPlan {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const p = JSON.parse(raw) as SavedPlan;
      if (p && typeof p.statuses === 'object') return p;
    }
  } catch {
    /* storage unavailable: fall through */
  }
  return memory ?? emptyPlan();
}

export function savePlan(p: SavedPlan): void {
  const withTime = { ...p, updatedAt: new Date().toISOString() };
  memory = withTime;
  try {
    localStorage.setItem(KEY, JSON.stringify(withTime));
  } catch {
    /* in-memory only */
  }
}

export function hasProgress(p: SavedPlan): boolean {
  return Object.values(p.statuses).some((s) => s === 1 || s === 2);
}
