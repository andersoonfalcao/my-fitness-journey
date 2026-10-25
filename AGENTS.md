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
- Accounts: Firebase Auth (e-mail/password + Google) behind `AuthGate`; access is invite-only (`invites/{email}`, managed by the admin in Configurações, the gear in the header). Everyone confirms the e-mail (Google sign-in does it by itself; a password account gets the confirmation link). Server-side enforcement is `firestore.rules`, which also accepts only `{ json, updatedAt }` documents under `users/{uid}/data`; the Worker (`strava-worker`) applies the same invite check before answering.
- User data (profile, food log, weights, plan, sessions, history) lives in Firestore at `users/{uid}/data/{key}` as a JSON string, through `useLocal` in `src/lib/store.ts` (name kept from the localStorage era). Food logs are one document per month (`forma.foods.YYYY-MM`). Pre-account localStorage data is migrated once, to the first account signed in on the device.
- Built as a static SPA (`spa.enabled`, `nitro: false` in `vite.config.ts`) and hosted on Firebase Hosting's free plan: `dist/client`, every route rewritten to `/_shell.html` (`firebase.json`).
- Workout plans come from a method catalog (`src/lib/methods.ts`: full body, superior/inferior, PPL, divisão, força 5×5, circuito); `recommendMethod()` picks one from goal, level and days and the person can override it (`profile.method`). Plans are deterministic: variation 0 uses the original 24 exercises, each "trocar os exercícios" (`plan.variation`) draws from the whole library. Library: 143 exercises in 12 groups (panturrilha, trapézio, antebraço and condicionamento added 2026-10-05; conditioning is done for time and left out of weekly sets); generation skips library entries without photos. Swaps stay within the same muscle group and only offer the same or a similar movement pattern.
- Finished workouts are one document per month (`forma.history.YYYY-MM`, months listed in `forma.history.months`) through `useHistory()`; the old single `forma.history` document is an inbox that `useHistory` empties into the months. Rejected cloud writes show a toast (`reportSaveError` in `cloud-store.ts`).
- Offline: `bun run build` also writes `dist/client/sw.js` from `scripts/sw-template.js` (precaches this build's JS/CSS; images are cached on first view). Registered only in production (`src/lib/offline.ts`).
- Load suggestions follow `loadAdvice()` in `src/lib/workout-stats.ts` (all target reps last time → +2.5 kg, +5 kg on compound leg lifts; missed twice → −10%).
- Exercise demos are start/end photos from free-exercise-db (public domain) in `src/assets/fedb` (WebP, 640 px wide), alternated with an accessible pause/play control; training load and set history are keyed by exercise ID and stay independent of regenerated plans.
- Food library is the TACO table (generated `src/lib/taco-data.ts`) plus a few USDA/label supplements; daily targets in `targets()` cite the studies they follow.
- Readings of the person's logs live in `src/lib/insights.ts` (pure functions, shared by the screens and the AI prompts): weight trend, pace, plateau and goal date, protein per meal, fibre (kept per food entry since 2026-10-12), weekday vs weekend calories, sleep regularity, cardio minutes, weeks on plan and signs of accumulated fatigue. `profile.maintain` holds the calories at maintenance once the goal weight is reached.
- "Pergunte ao forma" (the sparkles button in the header, `src/components/CoachChat.tsx`) is a chat that answers about the person's own records: `coachData()` in `src/lib/coach.ts` builds the numbers (strength per exercise, last 12 workouts, 14 days of food, weight, weeks, sleep) and they go with every question; the conversation stays on the device (`forma.coach` in localStorage).
- Updates: `src/lib/offline.ts` checks for a new service worker whenever the app comes back to the screen and reloads once when one takes over; Configurações shows the version (the `VERSION` of `sw.js`).
- AI food estimation calls Gemini from the browser through Firebase AI Logic (`src/lib/ai-food.ts`, free tier). App Check becomes mandatory for AI Logic on 2026-11-02.
