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
- **Zásady se nikdy nepíšou ručně.** Celý právní balík generuje
  `python3 vykresli_zasady.py` z manifestu — **šest souborů**:
  `web/zasady.html`, `web/podminky.html`,
  `web/zpracovatelska-smlouva.html`, `web/odstoupeni-formular.html`,
  `ZAZNAM_O_ZPRACOVANI.md` a `POSTUP_PRI_INCIDENTU.md`.
  CI je porovnává se skutečností znak po znaku.

  **Před každým commitem spusť:**

  ```sh
  python3 vykresli_zasady.py && python3 kontrola_manifestu.py
  ```

  Platí to i když jsi manifest nezměnil: generátor se obnovuje ze šablony
  a CI chce čerstvý výstup. Krok „Kontrola manifestu proti kodu“ padá na
  exit code 1 právě tehdy, když se tohle vynechá.
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

## Připomínka „nachystat kola“

Pages Functions nemají cron, takže appka sama večer nic neodešle. Místo toho
si mechanik na obrazovce **Připravit kola** vytvoří připomínku do kalendáře
v telefonu (`.ics` se soubor stáhne, událost je v 18:00 den PŘEDEM a má
upozornění; v popisu jsou kódy sad a místa v regálu). Soubor vzniká
v prohlížeči z dat, která už jsou na obrazovce — nic se nikam neposílá
a žádná další služba v manifestu nepřibyla. Druhá cesta zůstává: tlačítko
„Poslat si seznam e-mailem“ (Resend, deklarovaný).

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

Co čeká na zaplacení (dokud je objednávka ve stavu `nova`, servis si další
objednat nemůže — další objednávku si proto může sám zrušit v aplikaci):

```sh
wrangler d1 execute <repo>-db --remote --command \
  "SELECT o.id, o.vytvoreno, o.mesice, o.varianta, o.cena_czk, o.fakturace, u.email
   FROM objednavky_predplatneho o JOIN uzivatele u ON u.id = o.uzivatel_id
   WHERE o.stav IN ('nova', 'fakturovana') ORDER BY o.id"
```

**Ceník je na jednom místě: `cenik.js`** v kořeni repa. Server z něj počítá
částku na objednávce a stránka si ho bere přes `/api/ja`, takže v HTML
neleží žádná číslice. Změna ceny = změna jednoho souboru.

Jakmile majitel doplní daňový režim do `data-manifest.json` (klíč
`cena_dph`, např. „bez DPH, poskytovatel není plátcem DPH“), přepište
stejnou větu do `CENA_DPH` v `cenik.js` a přegenerujte zásady — appka ji
pak ukáže u částky. Dokud je slot prázdný, appka o DPH mlčí.

**Po prvním nasazení tohoto modulu** migrace `0005_predplatne.sql` převedla
servisy, které dosud platily přes `nastaveni_servisu.plan`, a dala jim rok
runwaye. Zkontrolujte `SELECT * FROM predplatne;` a upravte `plati_do`
podle skutečné faktury.

## Google Play

Pneusklad je od buildu 10 i aplikace v Google Play (Trusted Web Activity,
balíček `cz.simtegen.pneusklad` — **nikdy neměnit**). V aplikaci se
předplatné kupuje přes Google Play, na webu dál fakturou. Obojí končí ve
stejném `predplatne.plati_do` provozovny (platí pozdější datum) a každé nové
zaplacené období se zapíše i do `platby`.

**Co musí udělat majitel v Play Console:**

1. **Předplatné.** Modul ze šablony (`play_nakupy.js`, `web/play.js`) zná
   jen dvě ID produktu: `predplatne_mesic` (1 měsíc) a `predplatne_rok`
   (12 měsíců). Založte **jen `predplatne_mesic` za 129 Kč měsíčně**
   (Standard). `predplatne_rok` nezakládejte — schválený ceník roční cenu
   nemá a aplikace by ji ukázala. **Sezónní vstup (790 Kč / 6 měsíců)
   a Větší provozovna (229 Kč / měsíc) se v aplikaci koupit nedají**, dokud
   šablona nepozná víc produktů. Na webu je fakturou objednat lze.
2. **Otisk podpisového klíče.** Play Console → Integrita aplikace → SHA-256
   otisk → do `data-manifest.json`, `aplikace.otisky`, pak
   `python vykresli_aplikaci.py`. Do té doby aplikace běží s adresním řádkem.
3. **Servisní účet na ověření nákupů.** Samostatný účet s oprávněním jen
   „Spravovat objednávky a předplatná“. Jeho JSON patří do secretu
   `PLAY_NAKUPY_UCET`, balíček do `PLAY_BALICEK`. Bez nich aplikace nákup
   neověří a předplatné nezapíše (`/api/play` vrátí 503).
4. **Bezpečnost údajů a obsah aplikace.** Odpovědi jsou v
   `play/BEZPECNOST_DAT.md` (generované z manifestu). Pro kontrolora Googlu
   je na přihlašovací obrazovce „Vyzkoušet ukázku“ — dočasný účet na
   24 hodin s daty z `play/ukazka.json`.

**Kdo v aplikaci kupuje:** jen **majitel účtu** (ten, kdo provozovnu
založil). `/api/play` připisuje nákup na účet přihlášené osoby, kdežto
předplatné patří provozovně (`servis.id`). Pozvaný správce by zaplatil za
svůj prázdný účet, proto mu aplikace nákup neukáže a napíše, kdo kupuje.

**Ukázková data mají dvě podoby:** „Vyzkoušet ukázku“ (`/api/ukazka`,
šablona, dočasný účet) a „Naplnit ukázkovými daty“ v Nastavení
(`/api/ukazkova-data`, ve vlastním účtu, označené `ukazka = 1`).

Po každé změně manifestu: `python vykresli_zasady.py && python
vykresli_aplikaci.py && python kontrola_manifestu.py`. Generované soubory
(`web/manifest.webmanifest`, ikony, `web/sw.js`, `web/offline.html`,
`web/.well-known/assetlinks.json`, `web/ukazka.json`, `play/zaznam.json`,
`play/BEZPECNOST_DAT.md`) se needitují ručně.
