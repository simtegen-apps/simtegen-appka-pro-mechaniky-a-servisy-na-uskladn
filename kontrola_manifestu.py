"""CI gate: code, migrations and generated policy must match data-manifest.json.

The memory template stores customer data, so this check is stricter than the
storage-free template's version. Still a deterministic heuristic — it cannot
prove compliance, it exists so the manifest cannot drift from reality
*silently*:

1. Network: the frontend (web/) may only call its own /api/; server code
   (functions/) may additionally call domains declared in sluzby_treti_strany.
2. Policy: web/zasady.html and ZAZNAM_O_ZPRACOVANI.md must equal what
   vykresli_zasady.py generates from the manifest — a hand-edited policy is
   drift, not an improvement.
3. Data model: every table created in db/migrace/ beyond the template's base
   must carry a uzivatel_id column (so export and account deletion reach it)
   and be declared in manifest.ukladame; every declared entity must have a
   table. Deletion by the customer must, by construction, cover everything.

Stdlib only, so the CI step needs nothing but python3.
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except (AttributeError, ValueError):
    pass

WEB = Path("web")
FUNKCE = Path("functions")
MIGRACE = Path("db") / "migrace"
MANIFEST = Path("data-manifest.json")
ZAZNAM = Path("ZAZNAM_O_ZPRACOVANI.md")

# Tables the template itself ships; account deletion handles them explicitly,
# so they are the only ones allowed to live without a uzivatel_id column.
ZAKLADNI_TABULKY = {"uzivatele", "prihlasovaci_odkazy", "relace"}

# Outbound-request markers beyond fetch(), which gets domain-aware handling.
SITOVE_VZORY = (
    "XMLHttpRequest",
    "sendBeacon",
    "new WebSocket",
    '<script src="http',
    "<script src='http",
    "@import url(http",
    '<img src="http',
    "<img src='http",
)

ULOZISTE_VZORY = (
    "localStorage",
    "sessionStorage",
    "indexedDB",
    "document.cookie",
)

_CREATE_TABLE = re.compile(
    r"CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?[\"'`]?(\w+)", re.IGNORECASE
)


def _soubory(root: Path, pripony: tuple[str, ...]):
    if not root.exists():
        return
    for path in sorted(root.rglob("*")):
        if path.is_file() and path.suffix.lower() in pripony:
            yield path


def _zkontroluj_sit(manifest: dict) -> list[str]:
    povolene = [s["domena"] for s in manifest.get("sluzby_treti_strany") or []
                if s.get("domena")]
    chyby: list[str] = []

    def fetch_povoleny(line: str, server: bool) -> bool:
        if "http" not in line:
            return True  # relative call to own /api/
        return server and any(d in line for d in povolene)

    for root, server in ((WEB, False), (FUNKCE, True)):
        for path in _soubory(root, (".html", ".htm", ".js", ".mjs", ".css")):
            for number, line in enumerate(
                path.read_text(encoding="utf-8", errors="replace").splitlines(), 1
            ):
                if "fetch(" in line and not fetch_povoleny(line, server):
                    chyby.append(f"{path}:{number}: fetch mimo deklarované domény "
                                 f"({line.strip()[:80]})")
                for vzor in SITOVE_VZORY:
                    if vzor in line:
                        chyby.append(f"{path}:{number}: {vzor} ({line.strip()[:80]})")
                if "<link" in line and 'href="http' in line:
                    chyby.append(f"{path}:{number}: externí <link> ({line.strip()[:80]})")
    return chyby


def _zkontroluj_uloziste(manifest: dict) -> list[str]:
    if manifest.get("uloziste_v_prohlizeci"):
        return []
    chyby: list[str] = []
    for path in _soubory(WEB, (".html", ".htm", ".js", ".mjs")):
        for number, line in enumerate(
            path.read_text(encoding="utf-8", errors="replace").splitlines(), 1
        ):
            for vzor in ULOZISTE_VZORY:
                if vzor in line:
                    chyby.append(f"{path}:{number}: {vzor} ({line.strip()[:80]})")
    return chyby


def _zkontroluj_zasady(manifest: dict) -> list[str]:
    """The whole legal pack is generated from the manifest and drifts the
    same way: policy, terms, DPA, withdrawal form, record of processing,
    incident procedure. A hand-edited file fails here on purpose — the
    19. 9. 2026 review landed in the generator, not in the files."""
    import vykresli_zasady as generator

    chyby: list[str] = []
    for path, render in generator.VYSTUPY:
        if not path.exists() or path.read_text(encoding="utf-8") != render(manifest):
            chyby.append(f"{path.as_posix()} neodpovídá manifestu — spusť "
                         "`python3 vykresli_zasady.py` (needituj ho ručně).")
    return chyby


def _zkontroluj_tabulky(manifest: dict) -> list[str]:
    deklarovane = {u.get("entita") for u in manifest.get("ukladame") or []}
    chyby: list[str] = []
    tabulky: set[str] = set()
    for path in _soubory(MIGRACE, (".sql",)):
        text = path.read_text(encoding="utf-8", errors="replace")
        for zapis in re.split(r";", text):
            match = _CREATE_TABLE.search(zapis)
            if not match:
                continue
            nazev = match.group(1)
            tabulky.add(nazev)
            if nazev in ZAKLADNI_TABULKY:
                continue
            if "uzivatel_id" not in zapis:
                chyby.append(f"{path}: tabulka {nazev} nemá sloupec uzivatel_id "
                             "— export a smazání účtu by ji minuly.")
            if nazev not in deklarovane:
                chyby.append(f"{path}: tabulka {nazev} není deklarovaná "
                             "v manifestu (ukladame).")
    for entita in sorted(deklarovane - tabulky):
        chyby.append(f"manifest deklaruje entitu {entita}, ale žádná migrace "
                     "takovou tabulku nezakládá.")
    return chyby


def _zkontroluj_design() -> list[str]:
    """The cheap, deterministic part of the design bar: every deployed page
    uses the shared design system and is a mobile page. The taste part is
    the reviewer's; this stops the "web form with its own CSS" failure mode
    before a model ever looks at it."""
    chyby: list[str] = []
    for path in sorted(WEB.glob("*.html")):
        if path.name in ("zasady.html", "podminky.html", "zpracovatelska-smlouva.html",
                         "odstoupeni-formular.html"):
            continue
        text = path.read_text(encoding="utf-8", errors="replace")
        if 'href="styl.css"' not in text:
            chyby.append(f"{path}: nepoužívá návrhový systém web/styl.css (viz DESIGN.md).")
        if 'name="viewport"' not in text:
            chyby.append(f"{path}: chybí <meta name=\"viewport\"> — není to mobilní stránka.")
        if '<link rel="stylesheet" href="http' in text or "@import" in text:
            chyby.append(f"{path}: externí styl/písmo — produkty jsou bez závislostí.")
    if not (WEB / "styl.css").exists():
        chyby.append("web/styl.css chybí — návrhový systém je součást každého produktu.")
    return chyby


def main() -> int:
    if not MANIFEST.exists():
        print("CHYBA: chybí data-manifest.json.")
        return 1
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))

    chyby = (_zkontroluj_sit(manifest) + _zkontroluj_uloziste(manifest)
             + _zkontroluj_zasady(manifest) + _zkontroluj_tabulky(manifest)
             + _zkontroluj_design())
    if chyby:
        print("Kód se rozešel s data-manifest.json:")
        for chyba in chyby:
            print(" -", chyba)
        print("Buď to uveď do souladu s manifestem, nebo uprav manifest "
              "a přegeneruj zásady.")
        return 1
    print("Manifest souhlasí s kódem, zásadami i datovým modelem.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
