import { useEffect, useState } from 'preact/hooks';
import { copy } from '../copy';
import { fetchPlansMade } from '../analytics';
import { hasProgress } from '../state';
import type { Ctx } from './App';
import { catalog } from '../data';
import { daysUntil } from './bits';
import { Masthead } from './Masthead';

export function Landing({ ctx }: { ctx: Ctx }) {
  const [made, setMade] = useState<number | null>(null);
  useEffect(() => {
    fetchPlansMade().then(setMade);
  }, []);
  const days = daysUntil(catalog.targetDate, ctx.today);
  const resume = hasProgress(ctx.plan);

  return (
    <div class="wrap landing">
      <Masthead toast={ctx.toast} left={<span>{copy.kicker}</span>} />
      <div class="tiles">
        <div class="tile">
          <div class="big">{days}</div>
          <div class="label">{copy.landing.daysTo(days)}</div>
        </div>
        {made !== null && (
          <div class="tile">
            <div class="big">{made.toLocaleString('en-US')}</div>
            <div class="label">{copy.landing.plansMade}</div>
          </div>
        )}
      </div>
      <main>
        <h1>{copy.landing.headline}</h1>
        <p class="sub">{copy.landing.subline}</p>
        <a class="btn block" style="margin-top:20px;max-width:420px" href="#checklist">
          {resume ? copy.landing.resume : copy.landing.start}
        </a>
        <ol class="steps">
          {copy.landing.steps.map((s, i) => (
            <li key={i}>
              <b>{i + 1}</b>
              <span>{s}</span>
            </li>
          ))}
        </ol>
      </main>
      <p class="foot" style="padding-bottom:24px">{copy.disclaimer}</p>
    </div>
  );
}
