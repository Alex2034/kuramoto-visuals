// Every formula exported from source/main.tex must render in KaTeX without errors.
import { readFileSync } from "node:fs";
import katex from "katex";

const { macros, formulas } = JSON.parse(readFileSync(new URL("../src/lib/formulas.json", import.meta.url), "utf8"));
let failed = 0;
for (const [id, tex] of Object.entries(formulas)) {
  try {
    katex.renderToString(tex, { displayMode: true, throwOnError: true, strict: "error", macros: { ...macros } });
  } catch (e) {
    failed++;
    console.error(`${id}: ${e.message}`);
  }
}
console.log(`${Object.keys(formulas).length - failed} of ${Object.keys(formulas).length} formulas render`);
process.exit(failed ? 1 : 0);
