import { useMemo, useState } from 'preact/hooks';
import { buildPlan, hours, type PlanEntry, type Statuses } from '../engine/plan';
import type { SharedState } from '../engine/share';
import { copy } from '../copy';
import { track } from '../analytics';
import type { Ctx } from './App';
import { catalog, byId } from '../data';
import { runtime, listReason } from './bits';

export function SharedPlan(props: { ctx: Ctx; shared: SharedState; hasOwn: boolean; onMakeOwn: () => void }) {
  const { shared, ctx } = props;
  const [showWorth, setShowWorth] = useState(false);
  // The full lists (nothing seen), so the friend sees everything, with the sender's progress on top.
  const full = useMemo(() => buildPlan(catalog, {}, ctx.today), [ctx.today]);
  const must = full.mustWatch.entries;
  const worth = full.worthIt.entries;
  const s = copy.shared;

  // Progress comes from the rows shown, so the summary line always matches the list.
  const left = must.filter((e) => shared.statuses[e.id] !== 2);
  const done = must.length - left.length;
  const ready = left.every((e) => e.upcoming);
  const leftMin = left.filter((e) => !e.upcoming).reduce((m, e) => m + byId.get(e.id)!.runtimeMin, 0);
  const worthSeen = worth.filter((e) => shared.statuses[e.id] === 2).length;

  const makeOwn = () => {
    track('shared-to-own');
    props.onMakeOwn();
  };

  return (
    <div class="wrap" style="max-width:760px">
      <header class="mast">
        <div class="caps">{copy.siteName}</div>
        <div style="margin-top:10px;font-size:15px;font-style:italic" class="muted">{s.intro}</div>
        <h1 class="site-title" style="font-size:clamp(40px,8vw,72px);margin-top:4px">{shared.name || s.someone}</h1>
      </header>

      <p style="margin:12px 0 0;font-size:16px;line-height:1.45">{s.explainer}</p>
      <div class="shared-progress">
        <span class="cond big">{s.progress(done, must.length)}</span>
        <span class="cond">{ready ? s.ready : s.toGo(hours(leftMin))}</span>
      </div>
      <button class="btn block" style="margin-top:14px" onClick={makeOwn}>{s.makeOwn}</button>
      <div class="muted" style="margin-top:6px;font-size:13px;text-align:center">{s.makeOwnNote}</div>

      <section aria-label={copy.plan.must}>
        <div class="sec-head">
          <h2>{copy.plan.must}</h2>
          <span class="muted" style="font-size:13px;font-style:italic">{s.officialList}</span>
        </div>
        {must.map((e, i) => (
          <SharedRow key={e.id} e={e} n={i + 1} statuses={shared.statuses} />
        ))}
      </section>

      {worth.length > 0 && (
        <section aria-label={copy.plan.worth}>
          <button class="collapse" style="margin-top:20px" aria-expanded={showWorth} onClick={() => setShowWorth(!showWorth)}>
            <span class="g">{copy.plan.worth}</span>
            <span class="muted" style="font-size:13px">
              {s.worthSummary(worthSeen, worth.length)} {showWorth ? '▾' : '▸'}
            </span>
          </button>
          {showWorth && worth.map((e) => <SharedRow key={e.id} e={e} statuses={shared.statuses} />)}
        </section>
      )}

      <div style="padding:24px 0 32px">
        <button class="btn block" onClick={makeOwn}>{s.makeOwn}</button>
        {props.hasOwn && (
          <a href="#plan" style="display:flex;justify-content:center;align-items:center;min-height:44px;margin-top:8px" class="cond">
            {s.backToMine}
          </a>
        )}
        <p class="foot" style="text-align:center">{copy.disclaimer}</p>
      </div>
    </div>
  );
}

/** One title: greyed with ✓ if the sender has seen it, otherwise its spoiler-free reason. */
function SharedRow({ e, n, statuses }: { e: PlanEntry; n?: number; statuses: Statuses }) {
  const it = byId.get(e.id)!;
  const st = statuses[e.id];
  const s = copy.shared;
  return (
    <div class={`srow${st === 2 ? ' done' : ''}`}>
      <span class="cond n">
        {st === 2 ? (
          <>
            <span aria-hidden="true">✓</span>
            <span class="sr-only">{s.seenLabel}</span>
          </>
        ) : (
          n
        )}
      </span>
      <div style="min-width:0">
        <div class="t">{it.title}</div>
        {st !== 2 && (
          <>
            {e.pulledFor && <div class="note">{copy.plan.watchFirst(byId.get(e.pulledFor)!.title)}</div>}
            {st === 1 && <span class="tag tag-dark" style="margin-top:4px">{s.started}</span>}
            <p>{it.noReason ? copy.worthWatching : listReason(it.reason)}</p>
          </>
        )}
      </div>
      <span class="cond time">{runtime(it)}</span>
    </div>
  );
}
