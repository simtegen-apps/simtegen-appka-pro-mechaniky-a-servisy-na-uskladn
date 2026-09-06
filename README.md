# Produkt SimteGen — šablona s pamětí

Repozitář vznikl ze šablony `simtegen-sablona-pamet`: produkt, který si smí
pamatovat data zákazníka. Oproti základní šabloně nese účty (přihlášení
jednorázovým e-mailovým odkazem, žádná hesla), databázi Cloudflare D1
s primární instancí v EU a hotová GDPR API. Pravidla:

- **`web/` je frontend, `functions/` je API.** Frontend zůstává statická
  stránka bez závislostí a build systému; serverová logika jsou Cloudflare
  Pages Functions — čisté JS soubory, žádné závislosti, sdílené pomůcky
  v `spolecne.js` (mimo `functions/`, aby se nestaly routou).
- **Každá nová tabulka = tři kroky.** Migrace v `db/migrace/NNNN_*.sql`
  (append-only, aplikuje ji CI), sloupec `uzivatel_id` (export a smazání
  účtu jsou generické právě přes něj) a záznam v `data-manifest.json`
  (`ukladame`: entita, účel, pole, retence). CI shodí build, když něco
  z toho chybí.
- **Zásady se nikdy nepíšou ručně.** `web/zasady.html` i
  `ZAZNAM_O_ZPRACOVANI.md` generuje `python3 vykresli_zasady.py`
  z manifestu; CI je porovnává se skutečností. Změna dat = změna manifestu
  = přegenerovat.
- **Ven se volá jen to, co manifest deklaruje** (`sluzby_treti_strany`).
  Frontend nevolá ven vůbec — jen vlastní `/api/`.
- **Nasazuje se výhradně merge do `main`.** Stavitel pushuje jen větve
  `build/*`; preview má **vlastní databázi** `<repo>-db-nahled`, takže se
  test nikdy nedotkne zákaznických dat.
- **`.github/` patří člověku.** Token SimteGenu na workflow soubory nemá
  právo, GitHub takový push odmítne celý.
- Časy v databázi jsou unixové sekundy (INTEGER); tokeny se ukládají jen
  jako SHA-256 otisky.

Přihlášení bez nastaveného `RESEND_API_KEY`/`EMAIL_ODESILATEL` (typicky
preview) běží ve **vývojovém režimu** — odkaz se vrací v odpovědi místo
e-mailu. Takové nasazení se nesmí vydávat za skutečnou přihlašovací hranici;
produkce se zákazníky ty dva údaje vyžaduje (org secret + variable).

Produkční URL: `https://<název-repa>.pages.dev`, preview:
`https://<větev>.<název-repa>.pages.dev`. Postup při úniku dat:
`POSTUP_PRI_INCIDENTU.md`.
