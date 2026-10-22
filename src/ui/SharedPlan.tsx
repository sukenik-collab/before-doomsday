import { useMemo } from 'preact/hooks';
import { buildPlan, hours } from '../engine/plan';
import type { SharedState } from '../engine/share';
import { copy } from '../copy';
import { track } from '../analytics';
import type { Ctx } from './App';
import { catalog, byId } from '../data';
import { runtime, listReason } from './bits';

export function SharedPlan(props: { ctx: Ctx; shared: SharedState; hasOwn: boolean; onMakeOwn: () => void }) {
  const { shared, ctx } = props;
  // The full must-watch list (nothing seen), so the friend sees everything, plus where the sender stands.
  const full = useMemo(() => buildPlan(catalog, {}, ctx.today), [ctx.today]);
  const theirs = useMemo(() => buildPlan(catalog, shared.statuses, ctx.today), [shared, ctx.today]);
  const must = full.mustWatch.entries;
  const done = must.filter((e) => shared.statuses[e.id] === 2).length;
  const s = copy.shared;

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
        <span class="cond">{theirs.ready ? s.ready : s.toGo(hours(theirs.mustWatch.minutes))}</span>
      </div>
      <button class="btn block" style="margin-top:14px" onClick={makeOwn}>{s.makeOwn}</button>
      <div class="muted" style="margin-top:6px;font-size:13px;text-align:center">{s.makeOwnNote}</div>

      <section aria-label={copy.plan.must}>
        <div class="sec-head">
          <h2>{copy.plan.must}</h2>
          <span class="muted" style="font-size:13px;font-style:italic">{s.officialList}</span>
        </div>
        {must.map((e, i) => {
          const it = byId.get(e.id)!;
          const st = shared.statuses[e.id];
          return (
            <div key={e.id} class={`srow${st === 2 ? ' done' : ''}`}>
              <span class="cond n">
                {st === 2 ? <span aria-label={s.seenLabel}>✓</span> : i + 1}
              </span>
              <div style="min-width:0">
                <div class="t">{it.title}</div>
                {st !== 2 && (
                  <>
                    {st === 1 && <span class="tag tag-dark" style="margin-top:4px">{s.started}</span>}
                    <p>{it.noReason ? copy.worthWatching : listReason(it.reason)}</p>
                  </>
                )}
              </div>
              <span class="cond time">{runtime(it)}</span>
            </div>
          );
        })}
      </section>

      {theirs.worthIt.entries.length > 0 && (
        <section aria-label={copy.plan.worth}>
          <div class="sec-head"><h2 style="font-size:24px">{copy.plan.worth}</h2></div>
          {theirs.worthIt.entries.map((e) => {
            const it = byId.get(e.id)!;
            return (
              <div key={e.id} class="srow">
                <span />
                <div style="min-width:0">
                  <div class="t">{it.title}</div>
                  <p>{it.noReason ? copy.worthWatching : listReason(it.reason)}</p>
                </div>
                <span class="cond time">{runtime(it)}</span>
              </div>
            );
          })}
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
