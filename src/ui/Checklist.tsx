import { useMemo, useState } from 'preact/hooks';
import type { Group, Item, Priority } from '../engine/catalog';
import { buildPlan, hours, type Status, type Statuses } from '../engine/plan';
import { copy } from '../copy';
import type { Ctx } from './App';
import { catalog } from '../data';
import { PriorityTag, StatusIcon, formatLabel, runtime, shortDate, daysUntil } from './bits';
import { Masthead } from './Masthead';

const GROUPS: Group[] = ['phase3', 'phase4', 'phase5', 'phase6', 'nonMcu'];

// Effective priority: a prerequisite pulled into Must-watch shows as Must-watch on the checklist too.
const baseline = buildPlan(catalog, {}, '9999-12-31');
const effective = new Map<string, Priority>([
  ...baseline.mustWatch.entries.map((e) => [e.id, 'essential'] as const),
  ...baseline.worthIt.entries.map((e) => [e.id, 'recommended'] as const),
  ...baseline.skippable.entries.map((e) => [e.id, 'optional'] as const),
]);
type Filter = 'all' | 'key' | 'hideSeen';

function nextStatus(it: Item, s: Status): Status {
  if (it.format === 'season' || it.format === 'short') return ((s + 1) % 3) as Status;
  return s === 2 ? 0 : 2;
}

export function Checklist({ ctx }: { ctx: Ctx }) {
  const { plan, today } = ctx;
  const [filter, setFilter] = useState<Filter>('all');
  const [open, setOpen] = useState<Record<string, boolean>>({ phase4: true, phase5: true, phase6: true });
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const p = useMemo(() => buildPlan(catalog, plan.statuses, today), [plan.statuses, today]);
  const mustLeft = p.mustWatch.entries.filter((e) => !e.upcoming).length;
  const days = daysUntil(catalog.targetDate, today);

  const items = catalog.items.filter((i) => i.group !== 'refresher' && !i.retired);
  const st = (id: string): Status => plan.statuses[id] ?? 0;
  const visible = (it: Item) =>
    filter === 'all' ? true : filter === 'key' ? effective.get(it.id) !== 'optional' : st(it.id) !== 2;

  const markAll = (g: Group) => {
    const ids = items.filter((i) => i.group === g && i.releaseDate <= today).map((i) => i.id);
    const before: Statuses = Object.fromEntries(ids.map((id) => [id, plan.statuses[id] ?? 0]));
    ctx.setStatuses(Object.fromEntries(ids.map((id) => [id, 2])));
    ctx.toast(`${copy.groups[g]}: all marked seen.`, () => ctx.setStatuses(before));
  };

  return (
    <div class="wrap">
      <Masthead
        toast={ctx.toast}
        left={
          <a href="#" onClick={(e) => { e.preventDefault(); ctx.go(''); }} style="text-decoration:none">
            {copy.kicker}
          </a>
        }
        meta={
          <>
            <span>{plan.planId ? `Plan #${plan.planId}` : 'New plan'}</span>
            <span>Doomsday opens Fri, Dec 18 · {days} days</span>
          </>
        }
      />
      <p class="promise">{copy.promise}</p>

      <div class="layout">
        <main>
          <nav class="filters" aria-label="Filter">
            {(['all', 'key', 'hideSeen'] as Filter[]).map((f) => (
              <button key={f} aria-pressed={filter === f} onClick={() => setFilter(f)}>
                {copy.filters[f]}
              </button>
            ))}
          </nav>

          {GROUPS.map((g) => {
            const gi = items.filter((i) => i.group === g).sort((a, b) => a.releaseDate.localeCompare(b.releaseDate));
            const seen = gi.filter((i) => st(i.id) === 2).length;
            const shown = gi.filter(visible);
            const isOpen = !!open[g];
            const years: number[] = [...new Set(shown.map((i) => i.year))];
            return (
              <section key={g} id={`g-${g}`} aria-label={copy.groups[g]}>
                <div class="sec-head">
                  <h2>
                    <button class="group-btn" aria-expanded={isOpen} onClick={() => setOpen({ ...open, [g]: !isOpen })}>
                      {copy.groups[g]}
                      <span class="muted">{seen} of {gi.length} seen {isOpen ? '▾' : '▸'}</span>
                    </button>
                  </h2>
                  {isOpen && (
                    <button class="link-btn" onClick={() => markAll(g)}>{copy.markAll}</button>
                  )}
                </div>
                {isOpen && (
                  <>
                    <div class="row row-head" aria-hidden="true">
                      <span>Seen</span><span>Title</span><span>Format</span><span>Runtime</span><span>Priority</span>
                    </div>
                    {years.map((y) => (
                      <div key={y}>
                        <div class="year">{y}</div>
                        {shown.filter((i) => i.year === y).map((it) => (
                          <Row
                            key={it.id}
                            it={it}
                            s={st(it.id)}
                            today={today}
                            open={!!expanded[it.id]}
                            onToggle={() => setExpanded({ ...expanded, [it.id]: !expanded[it.id] })}
                            onStatus={(s) => ctx.setStatus(it.id, s)}
                          />
                        ))}
                      </div>
                    ))}
                    {shown.length === 0 && <p class="muted" style="padding:12px 0">Nothing to show with this filter.</p>}
                  </>
                )}
              </section>
            );
          })}
          <p class="foot">{copy.disclaimer}</p>
        </main>

        <aside>
          <div class="panel">
            <div>
              <div class="tile-label tag" style="color:var(--red);font-size:12px">{copy.plan.must} left</div>
              <div class="cond" style="font-weight:700;font-size:44px;line-height:1">
                {mustLeft} <span style="font-size:22px">· ~{hours(p.mustWatch.minutes)}</span>
              </div>
              <div class="muted" style="margin-top:6px;font-size:14px">
                Plus {p.worthIt.entries.length} worth it, ~{hours(p.worthIt.minutes)}
              </div>
            </div>
            <div>
              <a class="btn block" href="#plan">See my plan →</a>
            </div>
          </div>
          <nav class="jump" aria-label="Jump to section" style="margin-top:24px;border-top:3px double var(--ink)">
            {GROUPS.map((g) => {
              const gi = items.filter((i) => i.group === g);
              return (
                <a
                  key={g}
                  href={`#g-${g}`}
                  onClick={(e) => {
                    e.preventDefault();
                    setOpen({ ...open, [g]: true });
                    requestAnimationFrame(() => document.getElementById(`g-${g}`)?.scrollIntoView({ behavior: 'smooth' }));
                  }}
                >
                  {copy.groups[g]} <span>{gi.filter((i) => st(i.id) === 2).length} of {gi.length} seen</span>
                </a>
              );
            })}
          </nav>
        </aside>
      </div>

      <div class="sticky-bar">
        <div style="font-size:15px;font-weight:600;line-height:1.25">
          {copy.stickyLeft(mustLeft)}
          <br />
          <span class="sub">about {hours(p.mustWatch.minutes)}</span>
        </div>
        <a class="btn" style="min-height:44px;font-size:16px" href="#plan">{copy.myPlan}</a>
      </div>
    </div>
  );
}

function Row(props: { it: Item; s: Status; today: string; open: boolean; onToggle: () => void; onStatus: (s: Status) => void }) {
  const { it, s, today } = props;
  const upcoming = it.releaseDate > today;
  const airing = !upcoming && it.finaleDate && it.finaleDate > today;
  const label = copy.status[s];
  const extra = upcoming ? copy.out(shortDate(it.releaseDate)) : airing ? copy.finaleOn(shortDate(it.finaleDate!)) : s === 1 ? label : '';
  const reason = it.noReason ? copy.worthWatching : it.reason;
  return (
    <div class={`row${props.open ? ' open' : ''}`}>
      <button
        class="status-btn"
        disabled={upcoming}
        aria-label={`${it.title}: ${label}. ${upcoming ? 'Not released yet' : 'Change status'}`}
        onClick={() => props.onStatus(nextStatus(it, s))}
      >
        <StatusIcon s={s} />
      </button>
      <div style="min-width:0">
        <button class="title-btn" aria-expanded={props.open} onClick={props.onToggle}>{it.title}</button>
        <div class="meta narrow">
          {formatLabel(it)} · {runtime(it)}{extra ? ` · ${extra}` : ''}
        </div>
        <p class="reason">{reason}</p>
      </div>
      <div class="wide">{formatLabel(it)}{extra ? <div class="muted" style="font-size:13px">{extra}</div> : null}</div>
      <div class="wide" style="font-weight:600">{runtime(it)}</div>
      <div style="padding-top:2px"><PriorityTag p={effective.get(it.id) ?? it.priority} /></div>
    </div>
  );
}
