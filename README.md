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

## Jak zapsat platbu předplatného

S penězi aplikace nepracuje: zákazník objedná v appce (`/api/objednavka`),
provozovatel dostane objednávku e-mailem, vystaví fakturu a **po zaplacení**
ručně zapíše zaplacené období. Aplikace pak jen čte `predplatne.plati_do`.

```sh
wrangler d1 execute <repo>-db --remote --command \
  "INSERT INTO predplatne (uzivatel_id, plati_do, poznamka, zmeneno)
   VALUES (<id>, unixepoch() + 365*24*3600, 'faktura 2026-014', unixepoch())
   ON CONFLICT(uzivatel_id) DO UPDATE SET
     plati_do = excluded.plati_do,
     poznamka = excluded.poznamka,
     zmeneno  = unixepoch();
   INSERT INTO platby (uzivatel_id, mesice, poznamka)
   VALUES (<id>, 12, 'faktura 2026-014');"
```

- `uzivatel_id` je účet **provozovny** (`SELECT id, email FROM uzivatele`),
  ne pozvaného mechanika — předplatné patří servisu, ne osobě.
- Při **obnovení** počítejte od dosavadního `plati_do`, ne od dneška, ať
  zákazník nepřijde o zbytek zaplaceného období:
  `plati_do = MAX(plati_do, unixepoch()) + 365*24*3600`.
- `platby` je historie (kvůli otázce „přišel druhý nákup?“), `predplatne`
  je aktuální konec období. Zapisujte obojí.
- Stav objednávky se posouvá tamtéž:
  `UPDATE objednavky_predplatneho SET stav = 'zaplacena' WHERE id = <č.>;`

**Po prvním nasazení tohoto modulu** migrace `0005_predplatne.sql` převedla
servisy, které dosud platily přes `nastaveni_servisu.plan`, a dala jim rok
runwaye. Zkontrolujte `SELECT * FROM predplatne;` a upravte `plati_do`
podle skutečné faktury.
