# Specifikace — build 3

Mobilní webová appka „Pneusklad" pro malé a mobilní pneuservisy: evidence uskladněných sad pneu (zákazník, SPZ, rozměr, hloubky dezénu 4 kol, pozice v regálu), tisk štítku na štítkovací tiskárnu nebo na A4 archy, objednávkový kalendář, který plní mechanik, a obrazovka „Připravit na zítra" se seznamem kol a jejich pozic. K tomu sezónní přehled: kdo tu má kola a letos se ještě neobjednal (obvolávací seznam), které sady jsou pod 4 mm dezénu a kdo nemá zaplacené uskladnění. Postaveno na šablonové paměti (přihlášení e-mailovým odkazem, Cloudflare D1 v EU), jeden statický web/index.html s obrazovkami pro 390 px a Pages Functions bez závislostí.

## Placená hodnota (proč přijde druhý nákup)
Platí se za uloženou evidenci, která je jediné místo, kde servis ví, čí kola kde leží — a která mu dvakrát ročně vydělá (obvolávací seznam neobjednaných majitelů skladovaných kol, sady pod 4 mm k nabídce nových pneu, nezaplacené uskladnění); druhý nákup přichází sám, protože evidence 150–300 sad se ručně nikam nepřepisuje, fyzické uskladnění běží celý rok a přezouvací sezóna se opakuje každé jaro a podzim — předplatné se obnovuje, dokud servis skladuje, a tarif roste s počtem sad.

## Plán
1. Manifest a zásady: vyplnit `produkt` a `kontakt_email`, přidat 5 entit do `ukladame` (nastaveni_servisu, zakaznici, sady, pohyby, objednavky) s retencí, rozšířit `ucel` u Resendu na „přihlašovací odkaz a odeslání seznamu přípravy na zítra". Spustit `python3 vykresli_zasady.py`, commitnout `web/zasady.html` + `ZAZNAM_O_ZPRACOVANI.md`, ověřit `kontrola_manifestu.py`.
2. Migrace `db/migrace/0002_pneusklad.sql` — 5 tabulek, každá se sloupcem `uzivatel_id` ve stejném `;`-příkazu jako CREATE TABLE (jinak spadne CI), časy jako unix INTEGER.
3. Sdílené helpery do `spolecne.js`: `dnesniPolnoc()`, `zacatekDne()`, `novyKodSady()` (čítač `posledni_cislo` v nastaveni_servisu, batch UPDATE+SELECT), `nactiNastaveni()` (vytvoří výchozí řádek), `uklid()` (retence, voláno z overeni.js jako u odkazů a relací), `hlidacLimitu()` (zkušební strop 40 sad → 403).
4. API sklad: `functions/api/sady.js` (GET seznam + hledání `?q=` v kódu/SPZ/jméně/telefonu, POST nová sada → vrací kód), `functions/api/sady/[id].js` (GET detail se zákazníkem a pohyby, POST úprava + akce vydat/presunout/zaplaceno, každá zapíše řádek do `pohyby`).
5. API zákazníci: `functions/api/zakaznici.js` (GET `?q=` našeptávač, POST nový, POST smazat).
6. API objednávky: `functions/api/objednavky.js` (GET `?od=&do=`, POST nová), `functions/api/objednavky/[id].js` (POST hotovo/zruseno/pripraveno).
7. API příprava a přehled: `functions/api/priprava.js` (GET zítřejší objednávky spojené se sadami a pozicemi; POST pošli seznam e-mailem na adresu účtu přes už deklarovaný Resend), `functions/api/prehled.js` (počty, sady bez objednávky v sezóně, sady pod 4 mm, nezaplacené).
8. API nastavení: `functions/api/nastaveni.js` (GET/POST — údaje servisu na štítek, formát štítku, výchozí cena, stav zkušebního období).
9. Frontend skelet: do `web/index.html` obrazovky Dnes / Hledat / Nová sada / Detail sady / Objednávky / Nová objednávka / Připravit na zítra / Sezónní přehled / Nastavení podle šablonového patternu `.obrazovka`+`.aktivni`, dolní lišta se 4 ikonami, spodní akční tlačítko v dosahu palce, zpět přes `history.pushState` (žádný router, žádné závislosti).
10. Frontend toky: průvodce novou sadou ve 4 krocích (zákazník → vozidlo a pneu → hloubky dezénu velkými dotykovými čísly → pozice a cena, zapisuje se až na konci), hledání s debounce 250 ms a přátelské k USB/BT čtečce, detail sady s akcemi, kalendář po dnech, checklist přípravy, přehled, nastavení. Barvy a komponenty výhradně z tokenů šablony (`--akcent #10504b`, `.karta`, `.zprava`, tlačítka min 48 px).
11. Frontend štítek: `vykresliCode39()` do inline SVG (~40 řádků čistého JS, žádná knihovna), skrytý tiskový blok, injektovaný `@page { size: 100mm 50mm }` pro roli termální tiskárny a `size: A4` pro mřížku 3×8 (70×37 mm) samolepících archů, `window.print()`; tlačítko na detailu sady i na konci průvodce, „Tisknout vybrané" pro dávku.
12. Demo data: v Nastavení „Naplnit ukázkovými daty" (12 sad, 6 zákazníků, 4 objednávky, 2 z nich na zítra) a „Smazat ukázková data", deterministicky na serveru — demo u zákazníka nula nesmí začínat prázdnou obrazovkou.
13. Kontrola a nasazení: `python3 kontrola_manifestu.py`, ruční průchod na telefonu podle sekce validation, push do `build/pneusklad-v1`, kontrola náhledu, pak merge do main.
14. Po demu (mimo v1, v tomto pořadí): platební brána s deklarací v manifestu → veřejný objednávkový odkaz pro motoristy → sdílený účet pro druhého mechanika → připomínky motoristům.

## Soubory
- db/migrace/0002_pneusklad.sql
- functions/api/sady.js
- functions/api/sady/[id].js
- functions/api/zakaznici.js
- functions/api/objednavky.js
- functions/api/objednavky/[id].js
- functions/api/priprava.js
- functions/api/prehled.js
- functions/api/nastaveni.js
- data-manifest.json
- spolecne.js
- web/index.html
- web/zasady.html (generováno — vykresli_zasady.py)
- ZAZNAM_O_ZPRACOVANI.md (generováno — vykresli_zasady.py)
- functions/api/overeni.js (jen přidání volání uklid())

## Rizika
1. Štítkovací tiskárna: web nemá přístup k USB termální tiskárně bez ovladače. Tiskneme přes systémovou tiskárnu (`window.print()` + `@page`), A4 archy jsou fallback. Před demem otestovat na konkrétní tiskárně zákazníka nula, jinak demo vést na A4.
2. `@page size` v mobilním prohlížeči je nespolehlivé — tisk předvádět na notebooku v servisu, telefon je pro evidenci, hledání a přípravu.
3. CI branka je řádková: `kontrola_manifestu.py` hledá `fetch(`+`http` po řádcích a `uzivatel_id` ve stejném `;`-příkazu jako `CREATE TABLE`. Nová migrace i nový fetch na Resend musí tvar respektovat.
4. Žádný plánovač: Pages Functions neumí cron a do `.github/` se nesahá, takže připomínka je „při otevření appky + e-mail na tapnutí", ne push. Automatický e-mail v 18:00 by znamenal Worker s cronem — mimo v1.
5. Data motoristů: servis je správce, SimteGen zpracovatel. Sbírá se jen jméno, telefon (povinný kvůli obvolávání) a volitelný e-mail. Zpracovatelská smlouva se zákazníkem nula je úkol mimo kód.
6. V1 nemá platební bránu, takže demo samo neprokáže ochotu platit. Zkušební období má proto konec (60 dní) a strop (40 sad), aby rozhovor o ceně přišel dřív než po roce zdarma.
7. Kanál je nedoložený (slabina ze složky analytika) — kde další malé pneuservisy oslovit. U předvedení se zákazníka nula na to výslovně zeptat.
8. Datový model je jednodušší než u konkurence (vozidlo je součástí sady, ne vlastní tabulka; jeden účet = jeden servis bez rolí). Je to záměr kvůli rychlosti a jednoduchosti, ale u servisu s více provozovnami to nestačí — takový zákazník není cílová skupina.

## Jak ověřit
Na telefonu (~390 px) na náhledovém nasazení `https://build-pneusklad-v1.<repo>.pages.dev`:
1. Otevřít web, zadat e-mail, přihlásit se odkazem (na náhledu vývojový režim vrátí odkaz v odpovědi) → skončit na obrazovce Dnes.
2. Nastavení → „Naplnit ukázkovými daty". Dnes ukazuje dnešní objednávky a dlaždici „Připravit na zítra (2)".
3. + Nová sada: projít 4 kroky, hloubky dezénu zadat prstem, uložit → appka vrátí kód ve tvaru `25-NNNN`.
4. Tapnout Tisk štítku → v tiskovém náhledu je kód, čárový kód, SPZ, hloubky a pozice; ve formátu A4 je štítek 70×37 mm v mřížce 3×8.
5. Do Hledat napsat SPZ nové sady, pak jen část telefonu → sada se najde a je vidět její pozice v regálu.
6. Na detailu sady Objednat přezutí na zítřejší datum → „Připravit na zítra" nabídne o jednu položku víc, s pozicí. Odkliknout „připraveno", počet klesne.
7. Tapnout „Poslat si seznam e-mailem" → přijde e-mail se zítřejší přípravou (na náhledu bez RESEND_API_KEY se místo odeslání zobrazí náhled textu).
8. Sezónní přehled: sada bez objednávky je v obvolávacím seznamu (tap na telefon volá), sada pod 4 mm je v seznamu „nabídnout nové pneu", nezaplacené uskladnění je vidět s částkou.
9. Na detailu sady Vydat → sada zmizí z aktivního skladu, ale zůstane v historii pohybů s datem výdeje.
10. Nastavení → Export dat stáhne `moje-data.json` obsahující sady, zakaznici, objednavky, pohyby a nastaveni_servisu.
11. Nastavení → Smazat účet na testovacím účtu → `/api/ja` hlásí odhlášeno a opětovné přihlášení začíná s prázdným skladem.
12. Lokálně `python3 kontrola_manifestu.py` vypíše „Manifest souhlasí s kódem, zásadami i datovým modelem."

_Schvaluje se přes ARGA (simtegen_approve_spec) nebo na mini PC._