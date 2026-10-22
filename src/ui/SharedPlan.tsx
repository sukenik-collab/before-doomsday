import { useMemo } from 'preact/hooks';
import { buildPlan, hours } from '../engine/plan';
import type { SharedState } from '../engine/share';
import { copy } from '../copy';
import { track } from '../analytics';
import type { Ctx } from './App';
import { catalog } from '../data';
import { runtime } from './bits';

const byId = new Map(catalog.items.map((i) => [i.id, i]));

export function SharedPlan(props: { ctx: Ctx; shared: SharedState; hasOwn: boolean; onMakeOwn: () => void }) {
  const { shared, ctx } = props;
  const p = useMemo(() => buildPlan(catalog, shared.statuses, ctx.today), [shared, ctx.today]);
  const who = shared.name || copy.shared.someone;
  const makeOwn = () => {
    track('shared-to-own');
    props.onMakeOwn();
  };

  return (
    <div class="wrap" style="max-width:760px">
      <header class="mast">
        <div class="caps">{copy.shared.kicker}</div>
        <h1 class="site-title" style="font-size:clamp(40px,8vw,72px);margin-top:6px">{who}</h1>
        <div class="caps muted" style="margin-top:2px">Plan #{shared.planId} · {copy.shared.readOnly}</div>
        <p style="margin:12px 0 0;font-size:16px">{copy.shared.blurb}</p>
        <button class="btn block" style="margin-top:14px" onClick={makeOwn}>{copy.shared.makeOwn}</button>
        <div class="muted" style="margin-top:6px;font-size:13px;text-align:center">{copy.shared.makeOwnNote}</div>
      </header>

      <div class="tiles">
        <div class="tile">
          <div class="label" style="color:var(--red)">{copy.plan.must}</div>
          <div class="big">~{hours(p.mustWatch.minutes)}</div>
          <div class="muted" style="font-size:13px">{copy.plan.titles(p.mustWatch.entries.length)}</div>
        </div>
        <div class="tile">
          <div class="label">Worth it</div>
          <div class="big">~{hours(p.worthIt.minutes)}</div>
          <div class="muted" style="font-size:13px">{copy.plan.titles(p.worthIt.entries.length)}</div>
        </div>
      </div>

      {p.ready ? (
        <p style="font-size:20px;padding:16px 0;border-bottom:1px solid var(--ink)">{copy.plan.ready} {copy.plan.seeYou}</p>
      ) : (
        <section aria-label={copy.plan.must}>
          <div class="sec-head"><h2>{copy.plan.must}</h2></div>
          {p.mustWatch.entries.map((e, i) => (
            <div key={e.id} class="mini" style="display:grid;grid-template-columns:30px minmax(0,1fr) auto;gap:10px;align-items:baseline">
              <b class="cond" style="font-size:18px">{i + 1}</b>
              <span class="cond" style="font-weight:700;font-size:17px">{byId.get(e.id)!.title}</span>
              <span class="cond" style="font-weight:600;font-size:14px;white-space:nowrap">{runtime(byId.get(e.id)!)}</span>
            </div>
          ))}
        </section>
      )}

      {p.worthIt.entries.length > 0 && (
        <section aria-label={copy.plan.worth}>
          <div class="sec-head"><h2 style="font-size:24px">{copy.plan.worth}</h2></div>
          {p.worthIt.entries.map((e) => (
            <div key={e.id} class="mini">
              <div class="t"><span>{byId.get(e.id)!.title}</span><span style="font-weight:600;font-size:14px">{runtime(byId.get(e.id)!)}</span></div>
            </div>
          ))}
        </section>
      )}

      <div style="padding:24px 0 32px">
        <button class="btn block" onClick={makeOwn}>{copy.shared.makeOwn}</button>
        {props.hasOwn && (
          <a href="#plan" style="display:flex;justify-content:center;align-items:center;min-height:44px;margin-top:8px" class="cond">
            {copy.shared.backToMine}
          </a>
        )}
        <p class="foot" style="text-align:center">{copy.disclaimer}</p>
      </div>
    </div>
  );
}
