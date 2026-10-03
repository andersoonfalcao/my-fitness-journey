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
- Workout plans are generated deterministically from a fixed exercise library; swaps stay within the same muscle group and rank matching movement patterns first to preserve the intended stimulus.
- AI food estimation runs in the `/api/estimate-food` server route so the API key stays server-side.

- Exercise movement demos use short looping media with an accessible pause/play control; training load history is keyed by exercise ID and remains independent of regenerated plans.
