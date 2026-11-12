/**
 * Lista los textos envueltos en t("…") que no tienen traducción al inglés.
 * Uso: npx tsx scripts/i18n-check.ts
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { EN } from "../src/lib/i18n-en";

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : /\.tsx?$/.test(f) ? [p] : [];
  });
}
const missing = new Map<string, string>();
for (const file of walk("src")) {
  const src = readFileSync(file, "utf8");
  for (const m of src.matchAll(/\bt\(\s*"((?:[^"\\]|\\.)*)"/g)) if (!(m[1] in EN)) missing.set(m[1], file);
}
for (const [k, f] of missing) console.log(`${f}: ${k}`);
console.log(missing.size ? `\n${missing.size} sin traducir` : "Todo traducido");
process.exit(missing.size ? 1 : 0);
