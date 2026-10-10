import katex from "katex";
import data from "@/lib/formulas.json";

// formulas.json is generated from source/main.tex by scripts/extract_formulas.py
const FORMULAS = data.formulas as Record<string, string>;
const MACROS = data.macros as Record<string, string>;

function render(tex: string, displayMode: boolean): string {
  // KaTeX adds the macros it defines to the object it is given
  return katex.renderToString(tex, { displayMode, throwOnError: false, macros: { ...MACROS } });
}

/** Inline formula; uses the macros of the notes (\conj, \T, \e, \ii, ...). */
export function Tex({ children }: { children: string }) {
  return <span dangerouslySetInnerHTML={{ __html: render(children, false) }} />;
}

/** Displayed formula taken from the notes by its label, e.g. id="eq:ws-ansatz". */
export function Formula({ id }: { id: string }) {
  const tex = FORMULAS[id];
  if (tex === undefined) return <div className="text-red-700">Unknown formula {id}</div>;
  return <div className="my-2 overflow-x-auto" dangerouslySetInnerHTML={{ __html: render(tex, true) }} />;
}
