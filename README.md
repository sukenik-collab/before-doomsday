# Before Doomsday

Stopped watching Marvel after *Avengers: Endgame*? Tick what you've seen since, and get a spoiler-free plan for *Avengers: Doomsday* (Dec 18, 2026): what to watch, what's worth it if you have time, and what to skip.

> **Unofficial fan guide.** Not affiliated with Marvel, Disney or Sony.

> **Spoiler warning for this repo.** The site is spoiler-free; the repository is not guaranteed to be. Catalog sources link to articles, and issues may discuss plots. If you want to stay clean, use the site, not the repo.

## How it works

- `data/catalog.json` is the only content source: 52 post-Endgame titles plus pre-Endgame refreshers, each with a priority, runtime, a one-line spoiler-free reason and sources.
- **Must-watch** follows Marvel's official pre-Doomsday Disney+ list, with prerequisites pulled in (e.g. *Far From Home* before *No Way Home*). **Worth it** develops characters Marvel announced for Doomsday. Everything else is **Skippable**. Rumors never change a priority.
- The plan is a pure function of the catalog, your checklist and today's date (`src/engine/plan.ts`). No backend, no accounts, no AI calls.
- Progress stays in your browser. A shared plan is encoded in the link's `#hash`, which never reaches a server.

## Develop

```bash
npm install
npm run dev        # local site
npm test           # engine + share-link tests
npm run validate   # catalog checks
npm run build      # validate, type-check, build, size budget (150 KB gzipped)
```

Optional environment variables:

| Variable | Purpose |
| --- | --- |
| `VITE_GOATCOUNTER_CODE` | GoatCounter site code for cookieless counts and the public "plans made" number. Off when unset. |
| `SITE_URL` | Absolute site URL for link previews. Defaults to Vercel's production domain. |

## Catalog rules

- `slot` is a title's position in share links. It is **append-only**: never change or reuse one. To remove a title, set `"retired": true`.
- Reasons must be spoiler-free: only what was known at the end of *Endgame*, plus the title's own marketing premise. No deaths, twists, cameos, post-credit scenes or identities. If a reason can't be written safely, set `"reason": null, "noReason": true`.
- Every entry needs `sources` and `verifiedOn`.

Corrections are welcome: open an issue using the **Catalog correction** template.

## Licenses

- Code: MIT (`LICENSE`).
- `data/catalog.json`: CC BY 4.0 (`data/LICENSE`).
- Fonts: Archivo Narrow and Source Serif 4, SIL Open Font License, via Fontsource.
