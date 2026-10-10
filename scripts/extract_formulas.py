"""
Export the labelled equations of source/main.tex for the user interface.

Writes frontend/src/lib/formulas.json: {"macros": {...}, "formulas": {"eq:<slug>": "<tex>"}}.
The interface renders them with KaTeX, so the notes stay the single source of every
formula shown on the site. Run from the repository root after editing main.tex:

    python3 scripts/extract_formulas.py
"""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "source" / "main.tex"
TARGET = ROOT / "frontend" / "src" / "lib" / "formulas.json"

# macros of main.tex that formulas may use; \code is text-only and never appears in math
MACRO = re.compile(r"\\newcommand\{(\\[A-Za-z]+)\}(?:\[(\d)\])?\{(.*)\}\s*(?:%.*)?$", re.M)
ENVIRONMENT = re.compile(r"\\begin\{(equation|align)\}(.*?)\\end\{\1\}", re.S)
LABEL = re.compile(r"\\label\{(eq:[^}]+)\}")
TAG = re.compile(r"\\tag\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}")


def clean(tex: str) -> str:
    tex = TAG.sub("", LABEL.sub("", tex))
    tex = "\n".join(line.strip() for line in tex.strip().splitlines() if line.strip())
    # drop the sentence punctuation that closes a displayed formula
    if tex.endswith((".", ",")) and not tex.endswith(("\\,", "\\.")):
        tex = tex[:-1].rstrip()
    return tex


def extract(source: str) -> dict:
    macros = {name: body for name, _, body in MACRO.findall(source) if name != "\\code"}
    formulas = {}
    for kind, body in ENVIRONMENT.findall(source):
        if kind == "equation":
            labels = LABEL.findall(body)
            if len(labels) == 1:
                formulas[labels[0]] = clean(body)
            continue
        # align: one formula per labelled row, without the alignment marks
        for row in body.split("\\\\"):
            labels = LABEL.findall(row)
            if len(labels) == 1:
                formulas[labels[0]] = clean(row.replace("&", " "))
    return {"macros": macros, "formulas": dict(sorted(formulas.items()))}


if __name__ == "__main__":
    data = extract(SOURCE.read_text(encoding="utf-8"))
    TARGET.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"{len(data['formulas'])} formulas, {len(data['macros'])} macros -> {TARGET.relative_to(ROOT)}")
