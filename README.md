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

## Kolik lidí přišlo na úvodní stránku

Úvodní obrazovka je zároveň veřejná stránka produktu a počítá si dvě čísla:
`uvod` (někdo ji otevřel nepřihlášený) a `uvod-odeslano` (zadal e-mail
a požádal o přihlašovací odkaz). Podíl druhého k prvnímu je nálevka —
bez něj vypadá „nikdo nepřišel“ a „přišli a odešli“ v číslech stejně,
přitom každé z toho se řeší jinak.

```sh
wrangler d1 execute <repo>-db --remote --command \
  "SELECT den, stranka, zdroj, pocet FROM navstevy ORDER BY den DESC, stranka"
```

Součet za poslední měsíc i s poměrem:

```sh
wrangler d1 execute <repo>-db --remote --command \
  "SELECT zdroj, \
     SUM(CASE WHEN stranka = 'uvod' THEN pocet ELSE 0 END) AS zobrazeni, \
     SUM(CASE WHEN stranka = 'uvod-odeslano' THEN pocet ELSE 0 END) AS odeslano \
   FROM navstevy WHERE den >= date('now', '-30 days') GROUP BY zdroj"
```

`zdroj` je značka z odkazu: `https://…/?z=fb` zapíše `fb`. Používejte ji,
když produkt někam sdílíte — jinak se nedá poznat, který kanál servisy
přivádí, a to je podle složky kandidáta jediná otevřená otázka.

Dvě věci, ať se čísla nečtou špatně: **jsou to zobrazení, ne lidé**
(žádné cookies, takže jeden servis, který stránku otevře pětkrát, je pět
zobrazení), a **přihlášení se nepočítá** — měří se cizí návštěvníci.
Tabulka `navstevy` nemá `uzivatel_id`, nenese žádný osobní údaj a je proto
v manifestu vedena pod `agregaty`, ne pod `ukladame`: v exportu účtu není
a smazání účtu se jí netýká. Záznamy starší 24 měsíců maže endpoint sám.
