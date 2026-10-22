// GoatCounter: cookieless and aggregate-only. Does nothing unless VITE_GOATCOUNTER_CODE is set.
const CODE = import.meta.env.VITE_GOATCOUNTER_CODE as string | undefined;

type GC = { count: (o: { path: string; title?: string; event?: boolean }) => void };
declare global {
  interface Window { goatcounter?: GC & { no_onload?: boolean } }
}

let queue: { path: string; event?: boolean }[] = [];

export function initAnalytics(): void {
  if (!CODE || typeof document === 'undefined') return;
  window.goatcounter = { no_onload: true } as Window['goatcounter'];
  const s = document.createElement('script');
  s.async = true;
  s.src = 'https://gc.zgo.at/count.js';
  s.dataset.goatcounter = `https://${CODE}.goatcounter.com/count`;
  s.onload = () => {
    const q = queue;
    queue = [];
    q.forEach(send);
  };
  document.head.appendChild(s);
}

function send(o: { path: string; event?: boolean }) {
  if (!CODE) return;
  const gc = window.goatcounter;
  if (gc && typeof gc.count === 'function') gc.count(o);
  else queue.push(o);
}

export const pageview = (path: string) => send({ path });
export const track = (event: 'plan-made' | 'plan-shared' | 'shared-to-own') => send({ path: event, event: true });

/** Public "plans made" total, or null if unavailable, slow, or under 100. */
export async function fetchPlansMade(): Promise<number | null> {
  if (!CODE) return null;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 1500);
    const r = await fetch(`https://${CODE}.goatcounter.com/counter/plan-made.json`, { signal: ctrl.signal });
    clearTimeout(t);
    if (!r.ok) return null;
    const j = (await r.json()) as { count?: string };
    const n = Number(String(j.count ?? '').replace(/[^\d]/g, ''));
    return n >= 100 ? n : null;
  } catch {
    return null;
  }
}
