export function renderErrorPage(): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>This page didn't load</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      /* Standalone page (no app CSS): the values mirror the tokens in src/styles.css. */
      :root { color-scheme: light dark; --bg: #f7f8fa; --surface: #ffffff; --text: #12151a; --muted: #5b6470; --line: #c9ced5; --accent: #047857; --on-accent: #ffffff; }
      @media (prefers-color-scheme: dark) { :root { --bg: #0f1115; --surface: #181b21; --text: #f2f4f7; --muted: #9aa3af; --line: #3b414b; --accent: #10b981; --on-accent: #0f1115; } }
      body { font: 16px/1.5 Inter, system-ui, -apple-system, sans-serif; background: var(--bg); color: var(--text); display: grid; place-items: center; min-height: 100vh; margin: 0; padding: 1.5rem; }
      .card { max-width: 28rem; width: 100%; text-align: center; padding: 2rem; }
      h1 { font-size: 1.25rem; margin: 0 0 0.5rem; }
      p { color: var(--muted); margin: 0 0 1.5rem; }
      .actions { display: flex; gap: 0.5rem; justify-content: center; flex-wrap: wrap; }
      a, button { min-height: 44px; padding: 0.625rem 1.25rem; border-radius: 999px; font: inherit; font-weight: 600; cursor: pointer; text-decoration: none; border: 1px solid transparent; }
      .primary { background: var(--accent); color: var(--on-accent); }
      .secondary { background: var(--surface); color: var(--text); border-color: var(--line); }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>This page didn't load</h1>
      <p>Something went wrong on our end. You can try refreshing or head back home.</p>
      <div class="actions">
        <button class="primary" onclick="location.reload()">Try again</button>
        <a class="secondary" href="/">Go home</a>
      </div>
    </div>
  </body>
</html>`;
}
