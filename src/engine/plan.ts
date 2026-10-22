import type { Catalog, Item } from './catalog';

/** 0 not yet · 1 started · 2 seen it */
export type Status = 0 | 1 | 2;
export type Statuses = Record<string, Status | undefined>;

export interface PlanEntry {
  id: string;
  finish: boolean;
  pulledFor?: string;
  upcoming: boolean;
}
export interface Bucket {
  entries: PlanEntry[];
  minutes: number;
  upcomingMinutes: number;
}
export interface Plan {
  mustWatch: Bucket;
  worthIt: Bucket;
  skippable: Bucket;
  refreshers: string[];
  ready: boolean;
}

const RANK = { essential: 0, recommended: 1, optional: 2 } as const;

export function isUpcoming(item: Item, today: string): boolean {
  return item.releaseDate > today;
}

/** Pure: same inputs, same plan. `today` is an ISO date (YYYY-MM-DD). */
export function buildPlan(catalog: Catalog, statuses: Statuses, today: string): Plan {
  const items = catalog.items.filter((i) => i.group !== 'refresher' && !i.retired);
  const byId = new Map(items.map((i) => [i.id, i]));
  const seen = (id: string) => statuses[id] === 2;

  // 1. Bucket every unseen item by priority.
  const bucket = new Map<string, number>();
  const pulledFor = new Map<string, string>();
  for (const it of items) if (!seen(it.id)) bucket.set(it.id, RANK[it.priority]);

  // 2. Dependency pull-in: prerequisites move up to their dependent's bucket, never down.
  const pull = (id: string, rank: number, forId: string) => {
    const it = byId.get(id);
    if (!it) return;
    for (const dep of it.dependsOn ?? []) {
      if (!bucket.has(dep)) continue;
      if (bucket.get(dep)! > rank) {
        bucket.set(dep, rank);
        pulledFor.set(dep, forId);
      }
      pull(dep, rank, forId);
    }
  };
  // Process from the highest bucket down so the strongest pull wins.
  for (const rank of [0, 1, 2]) {
    for (const [id, r] of [...bucket]) if (r === rank) pull(id, rank, id);
  }

  // 3. Order each bucket: topological on dependsOn, ties by narrativeOrder, releaseDate, id.
  const order = (ids: string[]): string[] => {
    const set = new Set(ids);
    const tie = (a: string, b: string) => {
      const x = byId.get(a)!, y = byId.get(b)!;
      return x.narrativeOrder - y.narrativeOrder || x.releaseDate.localeCompare(y.releaseDate) || a.localeCompare(b);
    };
    const out: string[] = [];
    const placed = new Set<string>();
    const remaining = [...ids].sort(tie);
    while (remaining.length) {
      const idx = remaining.findIndex((id) =>
        (byId.get(id)!.dependsOn ?? []).every((d) => !set.has(d) || placed.has(d)));
      const [next] = remaining.splice(idx === -1 ? 0 : idx, 1);
      out.push(next);
      placed.add(next);
    }
    // Started items move to the front, keeping their relative order.
    const started = out.filter((id) => statuses[id] === 1);
    return [...started, ...out.filter((id) => statuses[id] !== 1)];
  };

  const make = (rank: number): Bucket => {
    const ids = order([...bucket].filter(([, r]) => r === rank).map(([id]) => id));
    const b: Bucket = { entries: [], minutes: 0, upcomingMinutes: 0 };
    for (const id of ids) {
      const it = byId.get(id)!;
      const upcoming = isUpcoming(it, today);
      b.entries.push({ id, finish: statuses[id] === 1, pulledFor: pulledFor.get(id), upcoming });
      if (upcoming) b.upcomingMinutes += it.runtimeMin;
      else b.minutes += it.runtimeMin;
    }
    return b;
  };

  const mustWatch = make(0);
  const worthIt = make(1);
  const skippable = make(2);

  // 5. Refreshers: always-on, plus those whose triggers are in Must-watch or Worth it.
  const active = new Set([...mustWatch.entries, ...worthIt.entries].map((e) => e.id));
  const refreshers = catalog.items
    .filter((i) => i.group === 'refresher' && !i.retired)
    .filter((i) => i.always || (i.triggers ?? []).some((t) => active.has(t)))
    .sort((a, b) => a.narrativeOrder - b.narrativeOrder)
    .map((i) => i.id);

  return {
    mustWatch,
    worthIt,
    skippable,
    refreshers,
    ready: mustWatch.entries.every((e) => e.upcoming),
  };
}

/** Rounds minutes to the nearest half hour, for display. */
export function hours(minutes: number): string {
  const h = Math.round((minutes / 60) * 2) / 2;
  return `${h % 1 === 0 ? h.toFixed(0) : h.toFixed(1)} h`;
}
