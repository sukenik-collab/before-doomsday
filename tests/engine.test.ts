import { describe, expect, it } from 'vitest';
import catalogJson from '../data/catalog.json';
import type { Catalog } from '../src/engine/catalog';
import { validateCatalog } from '../src/engine/catalog';
import { buildPlan, hours, type Statuses } from '../src/engine/plan';
import { decodeShare, encodeShare } from '../src/engine/share';

const catalog = catalogJson as Catalog;
const TODAY = '2026-11-12';
const ids = (b: { entries: { id: string }[] }) => b.entries.map((e) => e.id);
const all = (s: 0 | 1 | 2): Statuses =>
  Object.fromEntries(catalog.items.filter((i) => i.group !== 'refresher').map((i) => [i.id, s]));

describe('catalog', () => {
  it('is valid', () => expect(validateCatalog(catalog)).toEqual([]));
});

describe('buildPlan', () => {
  it('nothing seen: 10 must-watch, Far From Home is worth it', () => {
    const p = buildPlan(catalog, {}, TODAY);
    expect(p.mustWatch.entries).toHaveLength(10);
    expect(ids(p.mustWatch)).not.toContain('far-from-home');
    expect(ids(p.worthIt)).toContain('far-from-home');
    expect(ids(p.mustWatch).indexOf('loki-s1')).toBeLessThan(ids(p.mustWatch).indexOf('loki-s2'));
    expect(p.worthIt.entries).toHaveLength(6);
    expect(p.ready).toBe(false);
  });

  // The live catalog has no cross-bucket prerequisites right now, so pull-in is tested on a copy that does.
  const withPull: Catalog = {
    ...catalog,
    items: catalog.items.map((i) => (i.id === 'no-way-home' ? { ...i, dependsOn: ['far-from-home'] } : i)),
  };

  it('pulls an unseen prerequisite up into its dependent\'s bucket, in order', () => {
    const p = buildPlan(withPull, {}, TODAY);
    expect(p.mustWatch.entries[0]).toMatchObject({ id: 'far-from-home', pulledFor: 'no-way-home' });
    expect(ids(p.mustWatch).indexOf('far-from-home')).toBeLessThan(ids(p.mustWatch).indexOf('no-way-home'));
  });

  it('everything seen: ready, empty buckets, only always-on refreshers', () => {
    const p = buildPlan(catalog, all(2), TODAY);
    expect(p.ready).toBe(true);
    expect(p.mustWatch.entries).toHaveLength(0);
    expect(p.refreshers.every((id) => catalog.items.find((i) => i.id === id)!.always)).toBe(true);
  });

  it('started items lead their bucket with finish set', () => {
    const p = buildPlan(catalog, { 'loki-s2': 1, 'loki-s1': 2 }, TODAY);
    expect(p.mustWatch.entries[0]).toMatchObject({ id: 'loki-s2', finish: true });
  });

  it('seen prerequisite is not pulled in', () => {
    const p = buildPlan(withPull, { 'far-from-home': 2 }, TODAY);
    expect(ids(p.mustWatch)).not.toContain('far-from-home');
    expect(ids(p.skippable)).not.toContain('far-from-home');
  });

  it('pull-in never moves an item down', () => {
    // brand-new-day (optional) depends on no-way-home (essential): no-way-home stays essential.
    const p = buildPlan(catalog, {}, TODAY);
    expect(ids(p.mustWatch)).toContain('no-way-home');
    expect(ids(p.skippable)).toContain('brand-new-day');
  });

  it('upcoming items are listed but not counted', () => {
    const p = buildPlan(catalog, {}, '2026-10-01');
    const vq = p.skippable.entries.find((e) => e.id === 'visionquest')!;
    expect(vq.upcoming).toBe(true);
    expect(p.skippable.upcomingMinutes).toBeGreaterThan(0);
  });

  it('triggered refreshers follow the plan', () => {
    expect(buildPlan(catalog, {}, TODAY).refreshers).toContain('ref-logan');
    expect(buildPlan(catalog, { 'deadpool-wolverine': 2 }, TODAY).refreshers).not.toContain('ref-logan');
  });

  it('is deterministic', () => {
    expect(buildPlan(catalog, { 'wandavision': 1 }, TODAY)).toEqual(buildPlan(catalog, { 'wandavision': 1 }, TODAY));
  });

  it('formats hours to the nearest half', () => {
    expect(hours(1786)).toBe('30 h');
    expect(hours(600)).toBe('10 h');
    expect(hours(1650)).toBe('27.5 h');
  });
});

describe('share links', () => {
  const state = { planId: '3754', name: "Bob's plan", statuses: { 'loki-s1': 1 as const, 'black-widow': 2 as const, 'kraven': 2 as const } };

  it('round-trips', () => {
    const enc = encodeShare(catalog, state);
    expect(enc.startsWith('v1.3754.')).toBe(true);
    expect(decodeShare(catalog, '#' + enc)).toEqual(state);
  });

  it('handles names with dots and unicode', () => {
    const s = { ...state, name: 'Dr. Strange fan ✨' };
    expect(decodeShare(catalog, encodeShare(catalog, s))!.name).toBe('Dr. Strange fan ✨');
  });

  it('decodes an old, shorter link against a longer catalog', () => {
    const enc = encodeShare(catalog, { planId: '1234', statuses: { 'far-from-home': 2 } });
    const longer: Catalog = {
      ...catalog,
      items: [...catalog.items, { ...catalog.items[0], id: 'new-title', slot: 200 }],
    };
    expect(decodeShare(longer, enc)!.statuses).toEqual({ 'far-from-home': 2 });
  });

  it('rejects garbage', () => {
    expect(decodeShare(catalog, '#checklist')).toBeNull();
    expect(decodeShare(catalog, '#v1.12.AA')).toBeNull();
    expect(decodeShare(catalog, '#v1.1234.$$')).toBeNull();
  });

  it('stays short', () => {
    expect(encodeShare(catalog, { planId: '1234', statuses: all(2) }).length).toBeLessThan(40);
  });
});
