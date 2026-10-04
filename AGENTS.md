<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture
- User data (profile, food log, weights, workout plan, workout sessions and history) lives in browser localStorage via `src/lib/store.ts` — single-user app, no backend accounts.
- Built as a static SPA (`spa.enabled`, `nitro: false` in `vite.config.ts`) and hosted on Firebase Hosting's free plan: `dist/client`, every route rewritten to `/_shell.html` (`firebase.json`).
- Workout plans are generated deterministically from the original 24 exercises; the other library entries (`extra: true`) are swap-only. Swaps stay within the same muscle group and only offer the same or a similar movement pattern.
- Exercise demos are start/end photos from free-exercise-db (public domain) in `src/assets/fedb`, alternated with an accessible pause/play control; training load and set history are keyed by exercise ID and stay independent of regenerated plans.
- Food library is the TACO table (generated `src/lib/taco-data.ts`) plus a few USDA/label supplements; daily targets in `targets()` cite the studies they follow.
- AI food estimation lives in the `/api/estimate-food` server route and is unavailable on static hosting; the UI says so instead of failing.
