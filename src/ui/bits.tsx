import type { Item, Priority } from '../engine/catalog';
import type { Status } from '../engine/plan';
import { copy } from '../copy';

export function runtime(it: Item): string {
  const m = it.runtimeApprox ? Math.round(it.runtimeMin / 10) * 10 : it.runtimeMin;
  const h = Math.floor(m / 60), r = m % 60;
  const s = h ? (r ? `${h}h ${r}m` : `${h}h`) : `${r}m`;
  return it.runtimeApprox ? `~${s}` : s;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export function shortDate(iso: string): string {
  return `${MONTHS[Number(iso.slice(5, 7)) - 1]} ${Number(iso.slice(8, 10))}`;
}

export function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function daysUntil(target: string, today: string): number {
  return Math.max(0, Math.round((Date.parse(target) - Date.parse(today)) / 864e5));
}

export function formatLabel(it: Item): string {
  return copy.format[it.format];
}

export function PriorityTag({ p }: { p: Priority }) {
  const cls = p === 'essential' ? 'tag-must' : p === 'recommended' ? 'tag-worth' : 'tag-skip';
  return <span class={`tag ${cls}`}>{copy.priority[p]}</span>;
}

export function StatusIcon({ s }: { s: Status }) {
  if (s === 2)
    return (
      <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">
        <circle cx="11" cy="11" r="10" fill="#141414" />
        <path d="M6.5 11.5l3 3 6-6.5" stroke="#F3EFE6" stroke-width="2" fill="none" />
      </svg>
    );
  if (s === 1)
    return (
      <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">
        <circle cx="11" cy="11" r="10" fill="none" stroke="#141414" stroke-width="2" />
        <path d="M11 1a10 10 0 0 1 0 20z" fill="#141414" />
      </svg>
    );
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">
      <circle cx="11" cy="11" r="10" fill="none" stroke="#141414" stroke-width="2" />
    </svg>
  );
}

export function ShareIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
      <circle cx="18" cy="5" r="2.6" />
      <circle cx="6" cy="12" r="2.6" />
      <circle cx="18" cy="19" r="2.6" />
      <path d="M8.3 10.8l7.4-4.4M8.3 13.2l7.4 4.4" />
    </svg>
  );
}

/** Native share sheet when available, otherwise copy to clipboard. */
export async function shareOrCopy(text: string, url: string, onCopied: () => void): Promise<boolean> {
  try {
    if (navigator.share) {
      await navigator.share({ text, url });
      return true;
    }
  } catch (e) {
    if ((e as Error)?.name === 'AbortError') return false;
  }
  try {
    await navigator.clipboard.writeText(`${text} ${url}`);
  } catch {
    const ta = document.createElement('textarea');
    ta.value = `${text} ${url}`;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
  }
  onCopied();
  return true;
}

/** Reason text for lists already headed "Marvel's official list": drops the repeated suffix. */
export function listReason(reason: string | null): string | null {
  return reason ? reason.replace(/\s*(Both seasons are )?[Oo]n Marvel's official (pre-Doomsday )?list\.$/, '').trim() || reason : reason;
}
