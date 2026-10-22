import { useEffect, useMemo, useState, useCallback, useRef } from 'preact/hooks';
import { catalog } from '../data';

import type { Status, Statuses } from '../engine/plan';
import { decodeShare, newPlanId, type SharedState } from '../engine/share';
import { loadPlan, savePlan, hasProgress, emptyPlan, type SavedPlan } from '../state';
import { pageview } from '../analytics';
import { todayISO } from './bits';
import { Landing } from './Landing';
import { Checklist } from './Checklist';
import { PlanScreen } from './PlanScreen';
import { SharedPlan } from './SharedPlan';
import { copy } from '../copy';



export interface Ctx {
  today: string;
  plan: SavedPlan;
  setStatus: (id: string, s: Status) => void;
  setStatuses: (patch: Statuses) => void;
  setName: (name: string) => void;
  replacePlan: (p: SavedPlan) => void;
  toast: (msg: string, undo?: () => void) => void;
  go: (route: string) => void;
}

type Route = { kind: 'landing' } | { kind: 'checklist' } | { kind: 'plan' } | { kind: 'shared'; state: SharedState };

function parseRoute(hash: string): Route {
  if (hash.startsWith('#v1.')) {
    const state = decodeShare(catalog, hash);
    if (state) return { kind: 'shared', state };
  }
  if (hash === '#checklist') return { kind: 'checklist' };
  if (hash === '#plan') return { kind: 'plan' };
  return { kind: 'landing' };
}

export function App() {
  const [plan, setPlanState] = useState<SavedPlan>(loadPlan);
  const [hash, setHash] = useState(location.hash);
  const [toastState, setToast] = useState<{ msg: string; undo?: () => void } | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const today = useMemo(todayISO, []);
  const route = useMemo(() => parseRoute(hash), [hash]);

  useEffect(() => {
    const on = () => setHash(location.hash);
    addEventListener('hashchange', on);
    return () => removeEventListener('hashchange', on);
  }, []);

  useEffect(() => {
    pageview('/' + (route.kind === 'landing' ? '' : route.kind));
    scrollTo(0, 0);
  }, [route.kind]);

  const update = useCallback((fn: (p: SavedPlan) => SavedPlan) => {
    setPlanState((prev) => {
      const next = fn(prev);
      savePlan(next);
      return next;
    });
  }, []);

  const ctx: Ctx = {
    today,
    plan,
    setStatus: (id, s) =>
      update((p) => {
        const statuses = { ...p.statuses };
        if (s) statuses[id] = s;
        else delete statuses[id];
        return { ...p, planId: p.planId ?? newPlanId(), statuses };
      }),
    setStatuses: (patch) =>
      update((p) => {
        const statuses = { ...p.statuses };
        for (const [id, s] of Object.entries(patch)) {
          if (s) statuses[id] = s;
          else delete statuses[id];
        }
        return { ...p, planId: p.planId ?? newPlanId(), statuses };
      }),
    setName: (name) => update((p) => ({ ...p, name: name.slice(0, 24) || undefined })),
    replacePlan: (p) => update(() => p),
    toast: (msg, undo) => {
      clearTimeout(timer.current);
      setToast({ msg, undo });
      timer.current = window.setTimeout(() => setToast(null), 5000);
    },
    go: (r) => {
      if (r === '') history.pushState(null, '', location.pathname);
      else location.hash = r;
      setHash(r);
    },
  };

  let screen;
  if (route.kind === 'checklist') screen = <Checklist ctx={ctx} />;
  else if (route.kind === 'plan') screen = <PlanScreen ctx={ctx} />;
  else if (route.kind === 'shared')
    screen = (
      <SharedPlan
        ctx={ctx}
        shared={route.state}
        hasOwn={hasProgress(plan)}
        onMakeOwn={() => {
          if (hasProgress(plan) && !confirm(copy.shared.replaceConfirm)) return;
          update(() => emptyPlan());
          history.replaceState(null, '', location.pathname + '#checklist');
          setHash('#checklist');
        }}
      />
    );
  else screen = <Landing ctx={ctx} />;

  return (
    <>
      {screen}
      {toastState && (
        <div class="toast" role="status">
          <span>{toastState.msg}</span>
          {toastState.undo && (
            <button
              onClick={() => {
                toastState.undo!();
                setToast(null);
              }}
            >
              {copy.toast.undo}
            </button>
          )}
        </div>
      )}
    </>
  );
}
