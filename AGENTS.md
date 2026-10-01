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
- User data (profile, food log, weights, workout plan) lives in browser localStorage via `src/lib/store.ts` — single-user app, no backend accounts.
- Workout plans are generated deterministically in `src/lib/plan.ts` from a fixed illustrated exercise library (`src/lib/exercises.ts`); swaps only offer exercises of the same muscle group.
- AI food estimation runs in the `/api/estimate-food` server route so the API key stays server-side.
