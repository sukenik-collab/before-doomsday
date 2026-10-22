export type Priority = 'essential' | 'recommended' | 'optional';
export type Format = 'movie' | 'season' | 'special' | 'short';
export type Group = 'phase3' | 'phase4' | 'phase5' | 'phase6' | 'nonMcu' | 'refresher';

export interface Item {
  slot: number;
  id: string;
  title: string;
  year: number;
  releaseDate: string;
  format: Format;
  seriesId?: string;
  group: Group;
  priority: Priority;
  runtimeMin: number;
  runtimeApprox?: true;
  finaleDate?: string;
  narrativeOrder: number;
  reason: string | null;
  noReason?: true;
  dependsOn?: string[];
  triggers?: string[];
  always?: true;
  sources: string[];
  verifiedOn: string;
  retired?: true;
}

export interface Catalog {
  version: string;
  targetDate: string;
  items: Item[];
  series: { id: string; title: string }[];
}

/** Returns a list of problems; empty means valid. */
export function validateCatalog(c: Catalog): string[] {
  const errs: string[] = [];
  const ids = new Set<string>();
  const slots = new Set<number>();
  for (const it of c.items) {
    if (ids.has(it.id)) errs.push(`duplicate id ${it.id}`);
    if (slots.has(it.slot)) errs.push(`duplicate slot ${it.slot}`);
    ids.add(it.id);
    slots.add(it.slot);
  }
  const deps = new Map<string, string[]>();
  for (const it of c.items) {
    for (const k of ['id', 'title', 'releaseDate', 'format', 'group', 'priority', 'verifiedOn'] as const) {
      if (!it[k]) errs.push(`${it.id}: missing ${k}`);
    }
    if (!(it.runtimeMin > 0)) errs.push(`${it.id}: runtimeMin must be > 0`);
    for (const d of [...(it.dependsOn ?? []), ...(it.triggers ?? [])]) {
      if (!ids.has(d)) errs.push(`${it.id}: unknown reference ${d}`);
    }
    if (it.format === 'season' && !it.seriesId) errs.push(`${it.id}: season without seriesId`);
    if (it.group !== 'refresher' && (it.triggers || it.always)) errs.push(`${it.id}: triggers/always only on refreshers`);
    if (it.reason === null && !it.noReason) errs.push(`${it.id}: null reason needs noReason`);
    if (it.reason && it.reason.length > 160) errs.push(`${it.id}: reason over 160 chars`);
    if (!it.sources?.length) errs.push(`${it.id}: no sources`);
    deps.set(it.id, it.dependsOn ?? []);
  }
  const visiting = new Set<string>();
  const done = new Set<string>();
  const visit = (id: string, path: string[]) => {
    if (done.has(id)) return;
    if (visiting.has(id)) { errs.push(`dependency cycle: ${[...path, id].join(' → ')}`); return; }
    visiting.add(id);
    for (const d of deps.get(id) ?? []) visit(d, [...path, id]);
    visiting.delete(id);
    done.add(id);
  };
  for (const id of deps.keys()) visit(id, []);
  return errs;
}
