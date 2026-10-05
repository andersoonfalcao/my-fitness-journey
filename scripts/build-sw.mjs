// Writes dist/client/sw.js from scripts/sw-template.js with this build's code files (run after `vite build`).
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";

const out = "dist/client";
// Code and styles are precached; images are saved the first time they show up (the plan's photos on first visit).
const files = readdirSync(`${out}/assets`).filter((f) => /\.(js|css)$/.test(f)).sort().map((f) => `/assets/${f}`);
const version = createHash("sha256").update(files.join("\n")).update(readFileSync(`${out}/_shell.html`)).digest("hex").slice(0, 12);

const sw = readFileSync("scripts/sw-template.js", "utf8")
  .replace("__VERSION__", version)
  .replace("__PRECACHE__", JSON.stringify(files, null, 2));
writeFileSync(`${out}/sw.js`, sw);
console.log(`sw.js: versão ${version}, ${files.length} arquivos de código guardados no aparelho`);
