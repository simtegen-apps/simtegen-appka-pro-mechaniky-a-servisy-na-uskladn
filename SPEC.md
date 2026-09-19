# Specifikace — build 4

Do běžící appky Pneusklad se zapojí modul předplatného: nová tabulka `predplatne` (plati_do, poznamka) jako jediný zdroj pravdy o zaplaceném období, stav se počítá v middleware a vrací ho /api/ja i /api/nastaveni, produktové zápisy volají `vyzadujPredplatne` (402). V UI přibude obrazovka Předplatné dostupná z Nastavení i z varovného pruhu na Dnes, který se objeví 14 dní před koncem. Po vypršení přejde appka do režimu čtení — evidence zůstane viditelná, zápisy se zastaví; účet, export, smazání a přihlášení fungují vždy. Peníze aplikace neřeší, platbu označuje majitel mimo appku a v aplikaci nejsou žádné částky, jen „ceník sdělí provozovatel“.

## Placená hodnota (proč přijde druhý nákup)
Platí se za živou evidenci, která je jediné místo, kde servis ví, čí kola kde v regálu leží a kdo má nezaplaceno — a druhý nákup přijde sám, protože fyzické uskladnění běží celý rok, přezouvací sezóna se opakuje každé jaro a podzim, a po vypršení se evidence sice dál čte, ale nejde do ní zapsat ani jedna nová sada.

## Design (obrazovky, navigace, stavy)
Konvence: index.html NENAČÍTÁ web/styl.css a má vlastní tokeny a třídy (.karta, .polozka, .znacka, .dolni-akce, .dlazdice, .hlaska, .prazdno, .kostra, .zprava). Nová obrazovka se skládá jen z nich, žádné nové barvy ani písma. Lišta zůstává pětipoložková — předplatné nedostává tab.

OBRAZOVKY

1) Dnes (existující, největší věc zůstávají dlaždice „Připravit“ a „Obvolat“). Nově nad nimi pruh, a jen když je co říct: ≤14 dní → .hlaska varovani „Předplatné končí za 9 dní.“; vyprselo → .hlaska chyba „Předplatné vypršelo — appka je v režimu čtení.“ Klepnutí na pruh otevře obrazovku Předplatné. Prázdný stav: aktivní předplatné = žádný pruh. Načítání: pruh se nevykresluje, dokud není stav známý. Chyba: stav se nenačte → pruh se nevykreslí; nikdy nesmí blokovat běžnou práci.

2) Nastavení (existující). Řádek „Tarif“ se mění na klikací .polozka radkova (56 px): „Předplatné — Aktivní do 14. 3. 2027 ›“. Prázdný/načítací stav: „—“ do načtení. Chyba: stávající #nast-zprava.

3) Předplatné (nová <section id="obrazovka-predplatne">). Hlavička se .zpet, h1 „Předplatné“. NEJVĚTŠÍ VĚC: počet dní / datum velkým písmem ve stylu .dlazdice .cislo — „Zbývá 9 dní“ / „Aktivní do 14. 3. 2027“ / „Vypršelo 2. 9. 2026“. Pod tím .znacka (uspech/pozor/chyba) a jedna česká věta, co to znamená. Karta „Co máte uloženo“: „N sad pro M zákazníků“ — číslo, kvůli kterému se předplatné obnovuje (z /api/nastaveni, pole uskladneno). p.maly „Ceník vám sdělí provozovatel.“ — žádné částky. V .dolni-akce v dosahu palce tlačítko „Chci pokračovat“, které otevře mailto: s předvyplněným předmětem a názvem servisu (žádná brána, žádný odchozí fetch). Prázdný: .prazdno „Stav předplatného se nepodařilo zjistit“ + tlačítko „Zkusit znovu“. Načítání: .kostra na místě karty. Chyba: .zprava chyba pod obsahem. Úspěch: .zprava uspech „Otevřeli jsme vám e-mail. Provozovatel se ozve s ceníkem.“

NAVIGACE (max 3 klepnutí k hlavní hodnotě): Dnes → pruh → Předplatné = 1 klepnutí. Nastavení (lišta) → řádek Předplatné = 2 klepnutí. Hlavní hodnota produktu (nová sada, hledání ve skladu) zůstává na 1–2 klepnutích, beze změny.

GATING V UI: přesně ve vzoru stávajících rolí (index.html:38–42) přibude jeden přepínač na <body>: `body.bez-predplatneho .jen-zapis { display: none !important; }` a `body:not(.bez-predplatneho) .bez-predplatneho-zprava { display: none !important; }`. Třídu .jen-zapis už akční tlačítka nesou kvůli roli „jen čtení“, takže skrytí pokryje i prvky vykreslené později z template stringů. V api() (index.html:1120) přibudou dva řádky: na status 402 se nastaví body.bez-predplatneho a hlášku zobrazí už existující zprava(...).

## Plán
1. Migrace `db/migrace/0005_predplatne.sql`: CREATE TABLE predplatne (uzivatel_id INTEGER PRIMARY KEY REFERENCES uzivatele(id) ON DELETE CASCADE, plati_do INTEGER NOT NULL DEFAULT 0, poznamka TEXT NOT NULL DEFAULT '', zmeneno INTEGER NOT NULL DEFAULT (unixepoch())) — uzivatel_id musí být ve stejném CREATE TABLE, jinak spadne kontrola_manifestu.py. Ve stejné migraci seed pro už platící servisy: INSERT ... SELECT uzivatel_id, unixepoch()+365*24*3600, 'převedeno z tarifu při zavedení předplatného' FROM nastaveni_servisu WHERE plan != 'zkusebni'.
2. `data-manifest.json`: do ukladame entita `predplatne` (ucel „evidence zaplaceného období předplatného“, pole „odkaz na účet, datum konce předplatného, poznámka k platbě“, retence „do smazání účtu zákazníkem“). Spustit `python3 vykresli_zasady.py` a commitnout přegenerované web/zasady.html a ZAZNAM_O_ZPRACOVANI.md. Žádná nová externí služba, manifest sluzby_treti_strany se nemění.
3. Nový modul `predplatne.js` v kořeni repa vedle spolecne.js (mimo functions/, kde je každý soubor kandidát na routu): export STAV = {ZKUSEBNI, AKTIVNI, VYPRSELO}; `stavPredplatneho(env, servis)` — jeden LEFT JOIN dotaz nad predplatne a nastaveni_servisu, žádný zápis, vrací {stav, plati_do, zkusebni_do, zbyva_dnu, poznamka}; aktivni když plati_do > ted() NEBO plan != 'zkusebni' (zpětná kompatibilita se stávajícím platícím zákazníkem), jinak zkusebni když zkusebni_do > ted() nebo řádek nastavení ještě neexistuje, jinak vyprselo. `vyzadujPredplatne(context)` vrací 402 s větou „Předplatné vypršelo. Evidenci máte dál k nahlédnutí, zapisovat půjde po obnovení. Ceník vám sdělí provozovatel.“, jinak null.
4. `spolecne.js`: ze `zkontrolujLimit()` (ř. 167) odstranit větev „Zkušební období skončilo“ — expiraci teď řeší vyzadujPredplatne. Strop 40 sad ve zkušebce zůstává. Cíl: na jednu situaci nikdy dvě různé hlášky.
5. `functions/_middleware.js`: doplnit `context.data.predplatne = await stavPredplatneho(env, context.data.servis)`. Klíčem je servis.id, ne uzivatel.id — jinak by pozvaný mechanik dostal 402, přestože správce zaplatil.
6. `functions/api/ja.js` vrací navíc `predplatne` (z middleware, bez dalšího dotazu); `functions/api/nastaveni.js` ho přidá do funkce stav(), aby ho měl i stav.nastaveni na frontendu.
7. Gate do produktových POST handlerů, hned za kontrolou přihlášení a PŘED kontrolou role: sady.js, sady/[id].js, zakaznici.js, objednavky.js, objednavky/[id].js, priprava.js, ukazka.js, nastaveni.js. Nedotčeno (vždy dostupné): prihlaseni, overeni, odhlaseni, ja, ucet/export, ucet/smazat, navod a všechna GET včetně GET /api/nastaveni.
8. `web/index.html` CSS: přepínač body.bez-predplatneho podle vzoru rolí na ř. 38–42.
9. `web/index.html` markup: nová sekce obrazovka-predplatne, pruh na obrazovce Dnes, překlopení řádku „Tarif“ v Nastavení na klikací položku.
10. `web/index.html` JS: vykresliPredplatne() a otevriPredplatne(), stav.predplatne plněný z /api/ja i /api/nastaveni, ošetření status 402 v api(), mailto handler pro „Chci pokračovat“.
11. `README.md`: sekce „Jak zapsat platbu předplatného“ s hotovým příkazem wrangler d1 execute (INSERT ... ON CONFLICT(uzivatel_id) DO UPDATE). Admin obrazovka se nestaví — byla by to nová role a nová bezpečnostní plocha kvůli úkonu párkrát do roka.
12. `SPEC.md` doplnit o build 4, pak ruční průchod podle sekce validation a `python3 kontrola_manifestu.py`.

## Soubory
- db/migrace/0005_predplatne.sql
- predplatne.js
- data-manifest.json
- web/zasady.html
- ZAZNAM_O_ZPRACOVANI.md
- spolecne.js
- functions/_middleware.js
- functions/api/ja.js
- functions/api/nastaveni.js
- functions/api/sady.js
- functions/api/sady/[id].js
- functions/api/zakaznici.js
- functions/api/objednavky.js
- functions/api/objednavky/[id].js
- functions/api/priprava.js
- functions/api/ukazka.js
- web/index.html
- README.md
- SPEC.md

## Rizika
1. Pozvaný mechanik: kdyby se stav četl z uzivatel.id místo servis.id (jak doslova říká zadání), kolega by dostal 402, i když správce zaplatil. Ověřit testem se dvěma účty přes Tým.
2. Stávající platící zákazník: chybný seed nebo chybějící fallback na plan != 'zkusebni' ho po nasazení hodí do „vyprselo“. Migraci spustit nejdřív na náhledové databázi a zkontrolovat SELECT * FROM predplatne.
3. Dotaz navíc v každém /api/* požadavku. Je to jeden LEFT JOIN přes primární klíč a middleware nesmí nic zapisovat (žádné volání nactiNastaveni, které řádek zakládá).
4. Není plánovač: Pages Functions neumí cron a do .github/ se nesahá, takže připomínka je jen v aplikaci od 14 dní předem. Kdo appku neotevře, připomínku nedostane; majitel expirace zná ze své evidence.
5. Dvě různá odmítnutí (403 role vs. 402 předplatné): pořadí kontrol musí být přihlášení → předplatné → role, jinak hláška neodpovídá skutečné příčině.
6. Režim čtení po vypršení je vědomé rozhodnutí — servis fyzicky drží cizí kola a zamčená evidence by znamenala, že je motoristovi nevydá. Majitel může chtít tvrdší odstřih; změna je jednořádková (gate i na GET), ale tenhle důsledek by měl znát.
7. V aplikaci nejsou částky, dokud není ceník schválený. Věta „Ceník vám sdělí provozovatel“ musí být všude, kde by uživatel čekal cenu, jinak napíše e-mail zbytečně.
8. kontrola_manifestu.py je řádková: nová migrace musí mít uzivatel_id ve stejném ;-příkazu jako CREATE TABLE a zásady se musí přegenerovat, jinak spadne CI.

## Jak ověřit
Na telefonu (~390 px) na náhledovém nasazení:
1. Přihlásit se → Nastavení ukazuje klikací řádek „Předplatné“ se stavem a datem, ne jen slovo „Tarif“.
2. V D1 nastavit plati_do = unixepoch() + 9*24*3600 → po obnovení je na Dnes oranžový pruh „Předplatné končí za 9 dní“; klepnutí otevře obrazovku Předplatné, kde je „9“ největší věc na obrazovce.
3. Na obrazovce Předplatné klepnout „Chci pokračovat“ → otevře se e-mail s předvyplněným předmětem a názvem servisu; nikde žádná částka, jen „Ceník vám sdělí provozovatel.“
4. V D1 nastavit plati_do = unixepoch() - 1 a plan = 'zkusebni' → na Dnes červený pruh; tlačítka „+ Nová sada“, „Nová objednávka“, „Vydat“ a „Uložit nastavení“ zmizí, ale sklad, hledání, detail sady a pozice v regálu jsou dál čitelné.
5. Ve stejném stavu poslat POST na /api/sady přes curl → HTTP 402 s českou větou, ne 500 a ne prázdná odpověď.
6. Ve stejném stavu: „Stáhnout moje data“, „Odhlásit se“ i opětovné přihlášení fungují; v exportu moje-data.json je pole predplatne.
7. Druhý účet pozvaný přes Tým: při zaplaceném předplatném správce zapisuje normálně, žádné 402.
8. Smazat testovací účet → SELECT * FROM predplatne WHERE uzivatel_id = <id> nevrací nic.
9. Lokálně `python3 kontrola_manifestu.py` vypíše „Manifest souhlasí s kódem, zásadami i datovým modelem.“
10. web/zasady.html obsahuje řádek o entitě předplatné s retencí „do smazání účtu zákazníkem“.

_Schvaluje se přes ARGA (simtegen_approve_spec) nebo na mini PC._