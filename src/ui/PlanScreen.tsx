import { useEffect, useMemo, useState } from 'preact/hooks';
import { buildPlan, hours, type Bucket, type PlanEntry } from '../engine/plan';
import { encodeShare, newPlanId } from '../engine/share';
import { copy } from '../copy';
import { track } from '../analytics';
import { emptyPlan } from '../state';
import type { Ctx } from './App';
import { catalog } from '../data';
import { runtime, shareOrCopy, listReason } from './bits';
import { Masthead } from './Masthead';

const byId = new Map(catalog.items.map((i) => [i.id, i]));

export function sharePlan(ctx: Ctx, mustCount: number, mustMin: number) {
  const { plan } = ctx;
  const enc = encodeShare(catalog, { planId: plan.planId ?? newPlanId(), name: plan.name, statuses: plan.statuses });
  const url = `${location.origin}${location.pathname}#${enc}`;
  shareOrCopy(copy.sharePlan(mustCount, hours(mustMin)), url, () => ctx.toast(copy.toast.copied)).then((ok) => {
    if (ok) track('plan-shared');
  });
}

export function PlanScreen({ ctx }: { ctx: Ctx }) {
  const { plan, today } = ctx;
  const p = useMemo(() => buildPlan(catalog, plan.statuses, today), [plan.statuses, today]);
  const [showSkip, setShowSkip] = useState(false);
  const [showRef, setShowRef] = useState(false);
  const [moreRef, setMoreRef] = useState(false);

  // A plan gets its number on first view at the latest; count it once.
  useEffect(() => {
    if (!plan.planId || !plan.counted) {
      ctx.replacePlan({ ...plan, planId: plan.planId ?? newPlanId(), counted: true });
      track('plan-made');
    }
  }, []);

  const mustReleased = p.mustWatch.entries.filter((e) => !e.upcoming).length;
  const watched = (id: string) => {
    const before = plan.statuses[id] ?? 0;
    ctx.setStatus(id, 2);
    ctx.toast(copy.toast.marked(byId.get(id)!.title), () => ctx.setStatus(id, before));
  };
  const share = () => sharePlan(ctx, mustReleased, p.mustWatch.minutes);

  const official = p.refreshers.filter((id) => byId.get(id)!.always);
  const triggered = p.refreshers.filter((id) => !byId.get(id)!.always);

  return (
    <div class="wrap">
      <Masthead
        toast={ctx.toast}
        left={<a href="#checklist" style="text-decoration:none">{copy.plan.editChecklist}</a>}
        title={
          <div style="display:flex;justify-content:space-between;align-items:flex-end;gap:24px;flex-wrap:wrap;margin-top:4px">
            <div>
              <div class="caps">Plan #{plan.planId ?? '····'}</div>
              <h1 class="site-title" style="font-size:clamp(40px,6.5vw,80px)">{copy.plan.heading}</h1>
            </div>
            <div class="name-field" style="flex:0 1 440px">
              <label class="caps muted" for="plan-name">{copy.plan.nameLabel}</label>
              <div class="name-row">
                <input
                  id="plan-name"
                  type="text"
                  maxLength={24}
                  value={plan.name ?? ''}
                  placeholder="e.g. Bob's plan"
                  onInput={(e) => ctx.setName((e.target as HTMLInputElement).value)}
                />
                <button class="btn" style="min-height:44px;font-size:16px;padding:0 16px;white-space:nowrap" onClick={share}>
                  {copy.plan.share}
                </button>
              </div>
            </div>
          </div>
        }
      />

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

      <div class="layout" style="padding-bottom:48px">
        <main>
          {p.ready ? (
            <div style="padding:28px 0 24px;border-bottom:1px solid var(--ink)">
              <span class="tag tag-must">{copy.plan.allSeen}</span>
              <h2 class="site-title" style="margin-top:12px;font-size:clamp(48px,8vw,80px)">{copy.plan.ready}</h2>
              <p style="margin:10px 0 0;font-size:22px">{copy.plan.seeYou}</p>
            </div>
          ) : (
            <>
              <div class="sec-head" style="display:block">
                <h2>{copy.plan.must}</h2>
                <div class="muted" style="font-size:14px;font-style:italic">{copy.plan.mustNote}</div>
              </div>
              <BucketList b={p.mustWatch} numbered onWatched={watched} />
            </>
          )}
        </main>

        <aside style="display:block">
          <div class="sec-head" style="display:block">
            <h2 style="font-size:24px">{p.ready ? copy.plan.stillTime : copy.plan.worth}</h2>
          </div>
          {p.worthIt.entries.length === 0 && <p class="muted">Nothing left here.</p>}
          {p.worthIt.entries.map((e) => (
            <MiniRow key={e.id} e={e} onWatched={watched} />
          ))}

          <button class="collapse" style="margin-top:16px;border-top:3px double var(--ink)" aria-expanded={showRef} onClick={() => setShowRef(!showRef)}>
            <span class="g">{copy.plan.refreshers}</span>
            <span class="muted" style="font-size:13px">{official.length} from the official list {showRef ? '▾' : '▸'}</span>
          </button>
          {showRef && (
            <div>
              <p class="muted" style="font-size:13px;margin:8px 0">{copy.plan.refreshersNote}</p>
              {official.map((id) => <RefRow key={id} id={id} />)}
              {triggered.length > 0 && !moreRef && (
                <button class="link-btn" onClick={() => setMoreRef(true)}>{copy.plan.moreRewatches} ({triggered.length})</button>
              )}
              {moreRef && triggered.map((id) => <RefRow key={id} id={id} />)}
            </div>
          )}

          <button class="collapse" aria-expanded={showSkip} onClick={() => setShowSkip(!showSkip)}>
            <span class="g">{copy.plan.skippable}</span>
            <span class="muted" style="font-size:13px">{copy.plan.titles(p.skippable.entries.length)} {showSkip ? '▾' : '▸'}</span>
          </button>
          {showSkip && p.skippable.entries.map((e) => <MiniRow key={e.id} e={e} onWatched={watched} />)}

          <div style="padding:20px 0 0">
            <button class="btn block" onClick={share}>{copy.plan.share}</button>
            <button
              class="link-btn"
              style="display:block;margin:8px auto 0"
              onClick={() => {
                if (!confirm(copy.plan.startOverConfirm)) return;
                ctx.replacePlan({ ...emptyPlan(), planId: newPlanId() });
                ctx.go('#checklist');
              }}
            >
              {copy.plan.startOver}
            </button>
            <p class="foot">{copy.disclaimer}</p>
          </div>
        </aside>
      </div>
    </div>
  );
}

function BucketList({ b, numbered, onWatched }: { b: Bucket; numbered?: boolean; onWatched: (id: string) => void }) {
  return (
    <>
      {b.entries.map((e, i) => {
        const it = byId.get(e.id)!;
        return (
          <div class="prow" key={e.id}>
            <div class="n">{numbered ? i + 1 : ''}</div>
            <div style="min-width:0">
              {e.finish && <span class="tag tag-dark" style="margin-bottom:4px">{copy.plan.finish}</span>}
              <div class="t">{it.title}</div>
              {e.pulledFor && <div class="note">{copy.plan.watchFirst(byId.get(e.pulledFor)!.title)}</div>}
              <p>{it.noReason ? copy.worthWatching : listReason(it.reason)}</p>
            </div>
            <div class="time">
              {e.finish ? `${copy.plan.upTo} ` : ''}
              {runtime(it)}
            </div>
            <div class="act">
              {e.upcoming ? (
                <span class="muted cond">Not out yet</span>
              ) : (
                <button class="btn-outline" onClick={() => onWatched(e.id)} aria-label={`${copy.plan.watched}: ${it.title}`}>
                  {copy.plan.watched}
                </button>
              )}
            </div>
          </div>
        );
      })}
      {b.upcomingMinutes > 0 && <p class="muted" style="font-size:13px">{copy.plan.plusUpcoming(hours(b.upcomingMinutes))}</p>}
    </>
  );
}

function MiniRow({ e, onWatched }: { e: PlanEntry; onWatched: (id: string) => void }) {
  const it = byId.get(e.id)!;
  return (
    <div class="mini">
      <div class="t">
        <span>{e.finish ? `${copy.plan.finish}: ` : ''}{it.title}</span>
        <span style="font-weight:600;font-size:15px;white-space:nowrap">{runtime(it)}</span>
      </div>
      <p>{it.noReason ? copy.worthWatching : listReason(it.reason)}</p>
      {!e.upcoming && (
        <button class="btn-outline" style="min-height:36px;margin-top:8px" onClick={() => onWatched(e.id)} aria-label={`${copy.plan.watched}: ${it.title}`}>
          {copy.plan.watched}
        </button>
      )}
    </div>
  );
}

function RefRow({ id }: { id: string }) {
  const it = byId.get(id)!;
  return (
    <div class="mini">
      <div class="t">
        <span>{it.title} <span class="muted" style="font-weight:500">({it.year})</span></span>
        <span style="font-weight:600;font-size:15px">{runtime(it)}</span>
      </div>
      <p>{it.reason}</p>
    </div>
  );
}
