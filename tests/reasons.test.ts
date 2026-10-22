import { describe, expect, it } from 'vitest';
import catalogJson from '../data/catalog.json';
import type { Catalog } from '../src/engine/catalog';
import { listReason } from '../src/ui/bits';

const catalog = catalogJson as Catalog;

describe('listReason', () => {
  it('drops a closing "On Marvel\'s official list." sentence', () => {
    expect(listReason("Sam's first film. On Marvel's official list.")).toBe("Sam's first film.");
    expect(listReason('Continues season 1. Both seasons are on Marvel\'s official list.')).toBe('Continues season 1.');
    expect(listReason("Loki again. On Marvel's official pre-Doomsday list.")).toBe('Loki again.');
  });

  it('leaves "Not on" / "isn\'t on" sentences whole', () => {
    const a = "Closes out the Guardians trilogy. Not on Marvel's official pre-Doomsday list.";
    const b = "The newest Spider-Man film. It isn't on Marvel's official pre-Doomsday list.";
    expect(listReason(a)).toBe(a);
    expect(listReason(b)).toBe(b);
  });

  it('never cuts a catalog reason mid-sentence', () => {
    for (const it of catalog.items) {
      if (!it.reason) continue;
      const out = listReason(it.reason)!;
      expect(out.length, it.id).toBeGreaterThan(0);
      expect(out, it.id).toMatch(/[.!?]$/);
      expect(it.reason.startsWith(out), it.id).toBe(true);
    }
  });
});
