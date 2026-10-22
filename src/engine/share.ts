import type { Catalog } from './catalog';
import type { Status, Statuses } from './plan';

export interface SharedState {
  planId: string;
  name?: string;
  statuses: Statuses;
}

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
export const NAME_MAX = 24;

function toB64url(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const n = (bytes[i] << 16) | ((bytes[i + 1] ?? 0) << 8) | (bytes[i + 2] ?? 0);
    const chars = Math.ceil(((Math.min(3, bytes.length - i)) * 8) / 6);
    for (let c = 0; c < chars; c++) out += B64[(n >> (18 - 6 * c)) & 63];
  }
  return out;
}

function fromB64url(s: string): Uint8Array | null {
  const bytes: number[] = [];
  let buf = 0, bits = 0;
  for (const ch of s) {
    const v = B64.indexOf(ch);
    if (v < 0) return null;
    buf = (buf << 6) | v;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((buf >> bits) & 255);
    }
  }
  return new Uint8Array(bytes);
}

/** `v1.<planId>.<bits>[.<name>]` — 2 bits per catalog slot, in slot order. */
export function encodeShare(catalog: Catalog, state: SharedState): string {
  const maxSlot = Math.max(...catalog.items.map((i) => i.slot));
  const bytes = new Uint8Array(Math.ceil(((maxSlot + 1) * 2) / 8));
  for (const it of catalog.items) {
    const s = state.statuses[it.id] ?? 0;
    if (!s || it.group === 'refresher') continue;
    bytes[it.slot >> 2] |= s << ((it.slot & 3) * 2);
  }
  // Trim trailing zero bytes to keep links short.
  let end = bytes.length;
  while (end > 0 && bytes[end - 1] === 0) end--;
  let out = `v1.${state.planId}.${toB64url(bytes.subarray(0, end))}`;
  const name = state.name?.trim().slice(0, NAME_MAX);
  if (name) out += '.' + encodeURIComponent(name).replace(/[!'()*]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase());
  return out;
}

export function decodeShare(catalog: Catalog, hash: string): SharedState | null {
  const parts = hash.replace(/^#/, '').split('.');
  if (parts[0] !== 'v1' || parts.length < 3) return null;
  const [, planId, bits, ...rest] = parts;
  if (!/^\d{4}$/.test(planId)) return null;
  const bytes = fromB64url(bits);
  if (!bytes) return null;
  const statuses: Statuses = {};
  for (const it of catalog.items) {
    if (it.retired || it.group === 'refresher') continue;
    const byte = bytes[it.slot >> 2] ?? 0; // slots newer than the link read as "not yet"
    const s = ((byte >> ((it.slot & 3) * 2)) & 3) as Status | 3;
    if (s === 1 || s === 2) statuses[it.id] = s;
  }
  let name: string | undefined;
  if (rest.length) {
    try {
      name = decodeURIComponent(rest.join('.')).slice(0, NAME_MAX) || undefined;
    } catch {
      name = undefined;
    }
  }
  return { planId, name, statuses };
}

export function newPlanId(): string {
  const a = new Uint32Array(1);
  crypto.getRandomValues(a);
  return String(1000 + (a[0] % 9000));
}
