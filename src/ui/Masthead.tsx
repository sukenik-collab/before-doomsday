import type { ComponentChildren } from 'preact';
import { copy } from '../copy';
import { ShareIcon, shareOrCopy } from './bits';

export function shareSite(toast: (m: string) => void) {
  shareOrCopy(copy.shareSite.text, location.origin + location.pathname, () => toast(copy.toast.copied));
}

export function Masthead(props: { left: ComponentChildren; meta?: ComponentChildren; title?: ComponentChildren; toast: (m: string) => void }) {
  return (
    <header class="mast">
      <div class="mast-top caps">
        {props.left}
        <button class="icon-btn" aria-label="Share this site" onClick={() => shareSite(props.toast)}>
          <ShareIcon />
        </button>
      </div>
      {props.title ?? <div class="site-title">{copy.siteName}</div>}
      {props.meta && <div class="mast-meta caps">{props.meta}</div>}
    </header>
  );
}
