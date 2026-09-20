"""Render the privacy policy and the record of processing from the manifest.

The clauses live HERE, as frozen templates, and the manifest only fills the
slots. That is the whole legal design of the template: the builder edits
data-manifest.json, never the policy text, so a product can only ever say
what its manifest declares. kontrola_manifestu.py regenerates both files and
fails CI on any difference — a hand-edited policy is treated as drift, not
as an improvement.

Deterministic on purpose (no timestamps, stable ordering): the CI comparison
is a plain string equality.

Stdlib only; runs under python3 in CI and anywhere else.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except (AttributeError, ValueError):
    pass

MANIFEST = Path("data-manifest.json")
ZASADY = Path("web") / "zasady.html"
ZAZNAM = Path("ZAZNAM_O_ZPRACOVANI.md")

_HLAVICKA = "GENEROVANÝ SOUBOR — neupravuj ručně. Zdroj: data-manifest.json, generátor: vykresli_zasady.py."


def _esc(text: str) -> str:
    return (str(text).replace("&", "&amp;").replace("<", "&lt;")
            .replace(">", "&gt;").replace('"', "&quot;"))


def _radky_ukladame(manifest: dict) -> str:
    rows = []
    for u in manifest.get("ukladame") or []:
        rows.append(
            "      <tr><td>{}</td><td>{}</td><td>{}</td></tr>".format(
                _esc(u.get("ucel", "")), _esc(u.get("pole", "")),
                _esc(u.get("retence", "")),
            )
        )
    return "\n".join(rows)


def _radky_sluzby(manifest: dict) -> str:
    rows = []
    for s in manifest.get("sluzby_treti_strany") or []:
        dpa = s.get("dpa") or ""
        odkaz = (f' (<a href="{_esc(dpa)}">zpracovatelská smlouva</a>)'
                 if dpa else "")
        rows.append(
            f"    <li><strong>{_esc(s.get('nazev', ''))}</strong> — "
            f"{_esc(s.get('ucel', ''))}{odkaz}</li>"
        )
    return "\n".join(rows)


def _radky_cookies(manifest: dict) -> str:
    rows = []
    for c in manifest.get("cookies") or []:
        rows.append(
            f"    <li><code>{_esc(c.get('nazev', ''))}</code> — "
            f"{_esc(c.get('ucel', ''))}; platnost {_esc(c.get('trvani', ''))}.</li>"
        )
    return "\n".join(rows)


# ── Anonymní agregáty ───────────────────────────────────────────────
#
# manifest.agregaty je seznam tabulek, které smí žít bez uzivatel_id
# (kontrola_manifestu.py jim zakáže jakýkoli osobní sloupec).
# agregaty_popis je jedna česká věta o tom, co se počítá. Když produkt
# agregát deklaruje a větu zapomene, vykreslí se hlasitá závorka —
# čárka, kterou čtenář nevidí, je přesně to, čemu tenhle dokument brání.

_AGREGATY_ZAVER = (
    "Nejde o osobní údaje — žádný z těchto záznamů nelze spojit s konkrétní osobou "
    "ani s účtem. Proto se jich netýká výpis údajů ani smazání účtu: v exportu je "
    "nenajdete a po smazání účtu zůstávají, protože k žádnému účtu nepatří."
)


def _agregaty_popis(manifest: dict) -> str:
    if not (manifest.get("agregaty") or []):
        return ""
    return (manifest.get("agregaty_popis") or "").strip()


def _agregaty_html(manifest: dict) -> str:
    if not (manifest.get("agregaty") or []):
        return ""
    popis = _agregaty_popis(manifest)
    veta = _esc(popis) if popis else "(doplnit, co přesně se anonymně počítá)"
    return f"""
  <h2>Co počítáme anonymně</h2>
  <p>{veta}</p>
  <p>{_esc(_AGREGATY_ZAVER)}</p>
"""


def _agregaty_md(manifest: dict) -> str:
    if not (manifest.get("agregaty") or []):
        return ""
    popis = _agregaty_popis(manifest) or "(doplnit, co přesně se anonymně počítá)"
    tabulky = ", ".join(f"`{t}`" for t in manifest.get("agregaty") or [])
    return f"""
## Anonymní agregáty (mimo působnost GDPR)

Tabulky {tabulky} nenesou `uzivatel_id` ani žádný osobní údaj. {popis}

{_AGREGATY_ZAVER}
"""


def vykresli_zasady(manifest: dict) -> str:
    produkt = manifest.get("produkt") or "Produkt SimteGen"
    provozovatel = manifest.get("provozovatel") or "SimteGen s.r.o."
    kontakt = manifest.get("kontakt_email") or "(kontaktní e-mail bude doplněn)"
    return f"""<!doctype html>
<!-- {_HLAVICKA} -->
<html lang="cs">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Zásady zpracování údajů — {_esc(produkt)}</title>
  <style>
    body {{ font-family: system-ui, sans-serif; max-width: 40rem; margin: 2rem auto; padding: 0 1rem; line-height: 1.6; }}
    table {{ border-collapse: collapse; width: 100%; }}
    th, td {{ text-align: left; padding: 0.4rem 0.6rem; border-bottom: 1px solid #ccc; vertical-align: top; }}
    h2 {{ margin-top: 1.6rem; }}
  </style>
</head>
<body>
  <h1>Zásady zpracování údajů</h1>
  <p>Služba <strong>{_esc(produkt)}</strong>, provozovatel a správce údajů
  <strong>{_esc(provozovatel)}</strong>. S dotazy k údajům nás kontaktujte na
  <a href="mailto:{_esc(kontakt)}">{_esc(kontakt)}</a>.</p>

  <h2>Jaké údaje ukládáme a proč</h2>
  <p>Ukládáme pouze to, co je uvedeno níže — nic dalšího. Právním základem je
  plnění smlouvy (poskytnutí služby, kterou jste si vyžádali) a v míře nezbytné
  pro zabezpečení služby náš oprávněný zájem.</p>
  <table>
    <thead>
      <tr><th>Účel</th><th>Údaje</th><th>Jak dlouho</th></tr>
    </thead>
    <tbody>
{_radky_ukladame(manifest)}
    </tbody>
  </table>
{_agregaty_html(manifest)}
  <h2>Kde údaje jsou a kdo je zpracovává</h2>
  <p>Data běží na infrastruktuře níže uvedených zpracovatelů; primární instance
  databáze je umístěna v Evropské unii. Údaje nikomu neprodáváme a nepředáváme
  je k reklamním účelům.</p>
  <ul>
{_radky_sluzby(manifest)}
  </ul>

  <h2>Cookies</h2>
  <p>Používáme pouze technické cookies nezbytné pro chod služby — žádné
  sledovací ani reklamní:</p>
  <ul>
{_radky_cookies(manifest)}
  </ul>

  <h2>Vaše práva</h2>
  <ul>
    <li><strong>Výpis údajů</strong> si kdykoli stáhnete přímo v aplikaci
    (Účet → Stáhnout moje data).</li>
    <li><strong>Smazání účtu a všech údajů</strong> provedete přímo v aplikaci
    (Účet → Smazat účet) — je okamžité a nevratné.</li>
    <li>Máte také právo na opravu, omezení zpracování a přenositelnost údajů —
    napište nám na kontaktní e-mail výše.</li>
    <li>Se stížností se můžete obrátit na Úřad pro ochranu osobních údajů
    (<a href="https://uoou.gov.cz">uoou.gov.cz</a>).</li>
  </ul>

  <h2>Bezpečnostní incidenty</h2>
  <p>Pokud by došlo k úniku údajů, který pro vás představuje riziko, budeme vás
  informovat bez zbytečného odkladu a příslušný úřad do 72 hodin.</p>

  <p><a href="index.html">Zpět do aplikace</a></p>
</body>
</html>
"""


def vykresli_zaznam(manifest: dict) -> str:
    produkt = manifest.get("produkt") or "Produkt SimteGen"
    provozovatel = manifest.get("provozovatel") or "SimteGen s.r.o."
    kontakt = manifest.get("kontakt_email") or "(bude doplněn)"
    radky = []
    for u in manifest.get("ukladame") or []:
        radky.append(
            f"| {u.get('entita', '')} | {u.get('ucel', '')} | "
            f"{u.get('pole', '')} | {u.get('retence', '')} |"
        )
    sluzby = "; ".join(
        f"{s.get('nazev', '')} ({s.get('ucel', '')})"
        for s in manifest.get("sluzby_treti_strany") or []
    )
    tabulka = "\n".join(radky)
    return f"""<!-- {_HLAVICKA} -->
# Záznam o činnostech zpracování — {produkt}

Správce: **{provozovatel}**, kontakt: {kontakt}.
Vedeno podle čl. 30 GDPR; zdrojem je `data-manifest.json` tohoto repozitáře.

## Účely a rozsah

| Entita | Účel | Údaje | Doba uložení |
|---|---|---|---|
{tabulka}

Subjekty údajů: zákazníci služby. Právní základ: plnění smlouvy
(čl. 6 odst. 1 písm. b), zabezpečení služby jako oprávněný zájem
(čl. 6 odst. 1 písm. f).
{_agregaty_md(manifest)}
## Zpracovatelé

{sluzby}. Předání mimo EU se řídí zpracovatelskými smlouvami uvedených
zpracovatelů (standardní smluvní doložky); primární instance databáze je
umístěna v EU.

## Technická a organizační opatření

Šifrovaný přenos (HTTPS), přihlášení bez hesel (jednorázové e-mailové
odkazy, v databázi jen otisky tokenů), oddělená databáze na produkt,
smazání účtu zákazníkem přímo v aplikaci maže všechna jeho data,
postup při incidentu v `POSTUP_PRI_INCIDENTU.md`.
"""


def main() -> int:
    if not MANIFEST.exists():
        print("CHYBA: chybí data-manifest.json.")
        return 1
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    ZASADY.parent.mkdir(parents=True, exist_ok=True)
    ZASADY.write_text(vykresli_zasady(manifest), encoding="utf-8", newline="\n")
    ZAZNAM.write_text(vykresli_zaznam(manifest), encoding="utf-8", newline="\n")
    print(f"Vygenerováno: {ZASADY} a {ZAZNAM}.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
