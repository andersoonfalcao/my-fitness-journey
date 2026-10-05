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
- Accounts: Firebase Auth (e-mail/password + Google) behind `AuthGate`; access is invite-only (`invites/{email}`, managed by the admin in Perfil). Invited people don't confirm their e-mail; the admin (`ADMIN_EMAIL`) must. Server-side enforcement is `firestore.rules`.
- User data (profile, food log, weights, plan, sessions, history) lives in Firestore at `users/{uid}/data/{key}` as a JSON string, through `useLocal` in `src/lib/store.ts` (name kept from the localStorage era). Food logs are one document per month (`forma.foods.YYYY-MM`). Pre-account localStorage data is migrated once, to the first account signed in on the device.
- Built as a static SPA (`spa.enabled`, `nitro: false` in `vite.config.ts`) and hosted on Firebase Hosting's free plan: `dist/client`, every route rewritten to `/_shell.html` (`firebase.json`).
- Workout plans come from a method catalog (`src/lib/methods.ts`: full body, superior/inferior, PPL, divisão, força 5×5, circuito); `recommendMethod()` picks one from goal, level and days and the person can override it (`profile.method`). Plans are deterministic: variation 0 uses the original 24 exercises, each "trocar os exercícios" (`plan.variation`) draws from the whole library. Library: 143 exercises in 12 groups (panturrilha, trapézio, antebraço and condicionamento added 2026-10-05; conditioning is done for time and left out of weekly sets); generation skips library entries without photos. Swaps stay within the same muscle group and only offer the same or a similar movement pattern.
- Finished workouts are one document per month (`forma.history.YYYY-MM`, months listed in `forma.history.months`) through `useHistory()`; the old single `forma.history` document is an inbox that `useHistory` empties into the months. Rejected cloud writes show a toast (`reportSaveError` in `cloud-store.ts`).
- Offline: `bun run build` also writes `dist/client/sw.js` from `scripts/sw-template.js` (precaches this build's JS/CSS; images are cached on first view). Registered only in production (`src/lib/offline.ts`).
- Load suggestions follow `loadAdvice()` in `src/lib/workout-stats.ts` (all target reps last time → +2.5 kg, +5 kg on compound leg lifts; missed twice → −10%).
- Exercise demos are start/end photos from free-exercise-db (public domain) in `src/assets/fedb` (WebP, 640 px wide), alternated with an accessible pause/play control; training load and set history are keyed by exercise ID and stay independent of regenerated plans.
- Food library is the TACO table (generated `src/lib/taco-data.ts`) plus a few USDA/label supplements; daily targets in `targets()` cite the studies they follow.
- AI food estimation calls Gemini from the browser through Firebase AI Logic (`src/lib/ai-food.ts`, free tier). App Check becomes mandatory for AI Logic on 2026-11-02.
