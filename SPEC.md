# Specifikace — build 5

Z dnešní holé přihlašovací obrazovky (`web/index.html:599-611` — ikona, H1, jeden odstavec, pole, tlačítko) se stane veřejná úvodní obrazovka: produkt jednou větou, pro koho to je, tři přínosy navázané na kontrakt kandidáta, schválená cena z `window.CENIK`, věta o zkušební době a e-mail s tlačítkem v dosahu palce. K tomu anonymní počítadlo zobrazení a odeslání e-mailu (`functions/api/navsteva.js` + migrace `0008_navstevy.sql`), aby šlo měřit, jestli produkt někoho oslovuje. Jádro appky (sklad, štítky, kalendář, příprava, předplatné) se nedotýká ani řádkem — sekce si ponechá ID `obrazovka-prihlaseni`, takže boot i router zůstávají beze změny.

## Placená hodnota (proč přijde druhý nákup)
Platí se za uloženou evidenci, která je jediné místo, kde servis ví, čí kola kde v regálu leží a kdo má nezaplaceno — a druhý nákup přijde sám, protože kola fyzicky leží ve skladu celý rok a každé jaro a každý podzim z té evidence vypadne obvolávací seznam, sady pod 4 mm a nezaplacené uskladnění; úvodní stránka tuhle opakovanou hodnotu pojmenuje třetím přínosem „Sezóna, která vydělá", protože právě ona je důvod platit i podruhé.

## Design (obrazovky, navigace, stavy)
OBRAZOVKA (jedna, `#obrazovka-prihlaseni` — ID se nemění, aby `obnov()` a `catch` větev v `web/index.html:3067-3092` fungovaly beze změny). Scrollovatelný obsah + sticky `.dolni-akce`, ~2,5 obrazovky na 390 px, ne delší.

Shora dolů:
1) Hlava — `.znak ◎`, `h1` „Pneusklad — evidence uskladněných pneu s tiskem štítků", podtitul „Pro malé a mobilní pneuservisy, kde všechno dělá jeden nebo dva lidi. V telefonu, bez instalace."
2) Tři `.karta` s jednou tučnou větou a jednou vysvětlující: ① „Kód na štítku, pozice v regálu" — příjem sady za minutu, štítek z vaší štítkovačky nebo z A4 archu, kola najdete podle SPZ, jména i telefonu; ② „Ráno víte, co sundat" — objednávkový kalendář, který plní mechanik, a seznam „Připravit na zítra" s pozicemi, i na e-mail servisu; ③ „Sezóna, která vydělá" — kdo tu má kola a letos se neobjednal, které sady jsou pod 4 mm a kdo nemá zaplacené uskladnění.
3) Karta ceny — `.radky` vykreslené z `window.CENIK` (Sólo 89 / Základ 129 / Tým 249 Kč měsíčně za celou provozovnu), pod tím `p.maly` „Prvních 14 dní zdarma, bez karty." Nikde slovo DPH.
4) Jedna věta o datech: „Data jsou v EU. Kdykoli si je stáhnete nebo smažete." Patička se čtyřmi právními odkazy (`web/index.html:1192-1197`) zůstává.
5) `.dolni-akce` sticky v dosahu palce: `label` „E-mail provozovny" → `input[type=email]` → `button` „Začít zdarma" → `#prihlaseni-zprava`; pod tlačítkem `p.maly` „Pošleme vám přihlašovací odkaz, heslo nepotřebujete."

NEJVĚTŠÍ VĚC: `h1` a pod ním částka „89 Kč" akcentovým číslem ve stylu `.dlazdice .cislo` — návštěvník má z jednoho pohledu vědět co to je a co to stojí.

NAVIGACE (max 3 klepnutí k hlavní hodnotě): landing je vstup (0 klepnutí) → odeslání e-mailu 1 klepnutí → odkaz z e-mailu vede rovnou na Dnes. Po přihlášení Dnes → „+ Nová sada" = 2 klepnutí, beze změny. Přihlášený landing nikdy neuvidí (`body.prihlasen`, `ukaz()`).

STAVY: načítání — existující `#obrazovka-nacitani` drží scénu, dokud neodpoví `/api/ja`; landing se nevykreslí napůl. Prázdný — když `window.CENIK.varianty` je prázdné, karta ceny se nevykreslí vůbec (nikdy prázdný rám), věta o zkušební době zůstává. Chyba — existující `.zprava.chyba` pod tlačítkem, česky a bez kódů („Nepodařilo se odeslat. Zkontrolujte připojení a zkuste to prosím znovu."); selhání `/api/navsteva` se ignoruje a nikdy nezasáhne do UI. Úspěch — `.zprava.uspech` „Hotovo — přihlašovací odkaz najdete v e-mailu."; vývojový režim s odkazem (`web/index.html:3045-3052`) zůstává.

Vše ze stávajících tříd (`.znak`, `.karta`, `.radky`, `.pole`, `.dolni-akce`, `.zprava`, `.maly`) a tokenů (`--akcent`, `--inkoust*`, `--plocha`, `--r-*`, `--stin-*`). Žádné nové barvy, žádná písma, žádné obrázky, žádný externí skript.

## Plán
1. `db/migrace/0008_navstevy.sql` — `CREATE TABLE IF NOT EXISTS navstevy (den TEXT NOT NULL, stranka TEXT NOT NULL, zdroj TEXT NOT NULL DEFAULT '', pocet INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (den, stranka, zdroj))`. Číslo 0008, protože 0006 je `platby` a 0007 `objednavky_predplatneho`. Žádná IP, žádný user agent, žádný `uzivatel_id`.
2. `data-manifest.json` — nová sekce `agregaty` s entitou `navstevy` (účel „anonymní počet zobrazení úvodní stránky a odeslání e-mailu", pole „den, název stránky, značka zdroje odkazu, počet — žádná IP adresa, žádný identifikátor prohlížeče, žádné cookie", retence „24 měsíců"). `ukladame`, `sluzby_treti_strany` i `cookies` beze změny.
3. `kontrola_manifestu.py` — `_zkontroluj_tabulky()` se naučí `agregaty`: tabulka odtud je osvobozená od požadavku na `uzivatel_id` i od `ukladame`, ale **musí** být bez `uzivatel_id` (agregát s vazbou na účet je osobní údaj v přestrojení) a musí ji zakládat migrace. Brána zůstává stejně přísná, jen rozlišuje dva druhy dat.
4. `vykresli_zasady.py` — `agregaty` se vykreslí jako nová oddělená sekce „Co počítáme anonymně" v `zasady.html` a `ZAZNAM_O_ZPRACOVANI.md`, s větou, že nejde o osobní údaje a proto se netýkají exportu ani smazání účtu. Změna čistě aditivní.
5. `python3 vykresli_zasady.py` a commit přegenerované šestice; zkontrolovat `git diff` — smí přibýt jen nová sekce, existující řádky bajt po bajtu stejné.
6. `functions/api/navsteva.js` — `onRequestPost` bez přihlášení; je-li `data.uzivatel`, vrátí `{stav:"ok"}` bez zápisu. `stranka` proti whitelistu `{"uvod","uvod-odeslano"}`, jinak 400. `zdroj` = malá písmena, jen `[a-z0-9-]`, max 16 znaků, jinak `""`. Den přes `denACas`/`CASOVA_ZONA` ze `spolecne.js`. `INSERT … ON CONFLICT(den,stranka,zdroj) DO UPDATE SET pocet = pocet + 1`, v témže `batch` `DELETE FROM navstevy WHERE den < <dnes − 24 měsíců>`.
7. `web/index.html` markup — rozšířit `#obrazovka-prihlaseni` podle sekce design, jen ze stávajících tříd.
8. `web/index.html` CSS — nejvýš pár řádků rozložení hlavy landingu a velikosti částky přes `var(--akcent)`; nic globálního, žádné nové tokeny.
9. `web/index.html` JS — `vykresliCenikNaUvodu()` čte `window.CENIK` (žádné číslo natvrdo v HTML), konstanta `ZKUSEBNI_DNI = 14` na jednom místě, `zapisNavstevu(stranka)` jako fire-and-forget `fetch` na `/api/navsteva` se `zdroj` z `?z=`; volat v `obnov()` ve větvi `!data.prihlasen` i v `catch`, a `"uvod-odeslano"` po úspěšném `/api/prihlaseni`.
10. `README.md` — sekce „Kolik lidí přišlo na úvodní stránku" s hotovým `wrangler d1 execute` dotazem (součty po dnech a zdrojích, poměr `uvod-odeslano` / `uvod`) a větou, že jde o zobrazení, ne o lidi.
11. `SPEC.md` — sekce build 5 se stejnou strukturou jako build 4.
12. `python3 vykresli_zasady.py && python3 kontrola_manifestu.py`, pak ruční průchod podle validation.

## Soubory
- db/migrace/0008_navstevy.sql
- functions/api/navsteva.js
- data-manifest.json
- kontrola_manifestu.py
- vykresli_zasady.py
- web/zasady.html
- web/podminky.html
- web/zpracovatelska-smlouva.html
- web/odstoupeni-formular.html
- ZAZNAM_O_ZPRACOVANI.md
- POSTUP_PRI_INCIDENTU.md
# Specifikace — Pneusklad

## Co produkt dělá (platí napříč buildy)

Mobilní webová appka „Pneusklad“ pro malé a mobilní pneuservisy: evidence
uskladněných sad pneu (zákazník, SPZ, rozměr, hloubky dezénu 4 kol, pozice
v regálu), tisk štítku na štítkovací tiskárnu nebo na A4 archy, objednávkový
kalendář, který plní mechanik, a obrazovka „Připravit na zítra“ se seznamem
kol a jejich pozic. K tomu sezónní přehled: kdo tu má kola a letos se ještě
neobjednal (obvolávací seznam), které sady jsou pod 4 mm dezénu a kdo nemá
zaplacené uskladnění. Postaveno na šablonové paměti (přihlášení e-mailovým
odkazem, Cloudflare D1 v EU), jeden statický `web/index.html` s obrazovkami
pro 390 px a Pages Functions bez závislostí.

Jeden účet = jedna provozovna. Kolega se přihlásí vlastním e-mailem a řádek
v `clenove` z jeho přihlášení udělá přístup do tohoto servisu; role jsou
`spravce` / `mechanik` / `cteni`. Všechno ostatní se váže na `servis.id`,
ne na přihlášenou osobu — to platí i pro předplatné a objednávky.

Obrazovky: Dnes · Sklad · Zákazníci · Objednávky · Nastavení (spodní lišta),
k tomu podobrazovky Nová sada (průvodce 5 kroků), Detail sady, Nová
objednávka, Připravit kola, Sezónní přehled, Zákazník a Předplatné.

**Placená hodnota:** platí se za uloženou evidenci, která je jediné místo,
kde servis ví, čí kola kde leží — a která mu dvakrát ročně vydělá
(obvolávací seznam, sady pod 4 mm k nabídce nových pneu, nezaplacené
uskladnění). Druhý nákup přichází sám: fyzické uskladnění běží celý rok
a přezouvací sezóna se opakuje každé jaro a podzim.

**Build 3** postavil tohle jádro. **Build 4** (níže) přidal placení a nic
z jádra nepřestavěl.

---

# Specifikace — build 4 (předplatné a objednávka)

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
1. Sahá se do generátoru právních dokumentů běžícího produktu. Změna musí být aditivní; po přegenerování zkontrolovat `git diff` — jediný nový blok, jinak se zákazníkovi tiše přepíšou zásady.
2. Landing veřejně ukazuje ceny, a tím zviditelňuje nevyplněné sloty `ico`, `sidlo`, `cena_dph` (`SPEC.md:161-174`). Veřejná nabídka placené služby bez identifikace prodávajícího je spotřebitelský problém — doplnění slotů teď blokuje zveřejnění landingu, ne jen spuštění placení. To je jediná věc, kterou plán potřebuje od majitele.
3. Zadání psalo „prvních 30 dní zdarma", produkt má schválených 14 (`ZKUSEBNI_DNU` ve `spolecne.js:139`, `zkusebni_dni` v manifestu, obchodní podmínky). Plán drží 14 a nepřepisuje běžící smluvní podmínky; změna na 30 znamená kód, manifest i podmínky najednou a je to rozhodnutí majitele.
4. `/api/navsteva` je otevřený endpoint — čísla lze nafouknout. Žádná osobní data ani náklad nad zápis do D1; whitelist `stranka` a osekaný `zdroj` drží kardinalitu tabulky. Kdyby to vadilo, patří to na rate limit v Cloudflare, ne do kódu.
5. Počítají se zobrazení, ne lidé (žádné cookies, `uloziste_v_prohlizeci` je prázdné a musí zůstat). Jeden servis, který stránku otevře pětkrát, je pět zobrazení — musí to být v zásadách i v README, ať majitel nečte čísla špatně.
6. DESIGN.md zamítá bez debaty „dlouhou stránku s poli a tlačítkem dole". Landing musí zůstat obrazovka: sticky `.dolni-akce`, karty, žádný marketingový scroll.
7. Regrese přihlášení. ID sekce se nemění, ale je nutné ověřit, že přihlášený landing nikdy neuvidí a že vývojový režim s vráceným odkazem dál funguje.
8. `navstevy` přežije smazání účtu (nemá `uzivatel_id`, takže ho `tabulkySUzivatelem` v `export.js` i `ucet/smazat.js` minou). Je to záměr a musí to být v zásadách napsané, jinak to vypadá jako díra.

## Jak ověřit
Na náhledovém nasazení, telefon ~390 px:
1. Odhlášeně otevřít `/` → úvodní obrazovka: h1, tři karty, cena „od 89 Kč měsíčně za provozovnu", „Prvních 14 dní zdarma, bez karty.", dole pole s e-mailem a tlačítko. Žádný vodorovný přetok, tlačítko ≥ 44 px, nikde slovo DPH.
2. `wrangler d1 execute … "SELECT * FROM navstevy"` → řádek `stranka='uvod'`, `pocet` roste s každým načtením. Otevřít `/?z=fb` → přibude řádek se `zdroj='fb'`.
3. Zadat e-mail a odeslat → hláška o přihlašovacím odkazu a nový řádek `stranka='uvod-odeslano'`; poměr k `uvod` je číslo, kterým se měří kontrakt.
4. Přihlásit se odkazem → landing zmizí, appka pokračuje na Dnes, spodní lišta se objeví; sklad, nová sada, příprava a předplatné fungují přesně jako dosud.
5. Přihlášeně znovu načíst `/` → `pocet` neroste.
6. `curl -X POST /api/navsteva -d '{"stranka":"cokoliv"}'` → HTTP 400 s českou větou, žádný zápis.
7. `GET /api/ucet/export` → v `moje-data.json` není `navstevy`. Smazat testovací účet → řádky v `navstevy` zůstanou (agregát bez vazby na účet).
8. Lokálně `python3 vykresli_zasady.py && python3 kontrola_manifestu.py` → „Manifest souhlasí s kódem, zásadami i datovým modelem."
9. `web/zasady.html` obsahuje sekci „Co počítáme anonymně" s retencí 24 měsíců a větou, že nejde o osobní údaje; `git diff` na generovaných souborech neukazuje nic jiného.
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

## Co se při stavbě oproti této specifikaci změnilo

Specifikace vznikla nad jiným snímkem repozitáře, než na kterém se stavělo
(psala o předplatném, ceníku a migracích 0005–0007, které v této větvi
nejsou). Postavilo se to, co specifikace chce — veřejná úvodní obrazovka
a anonymní počítadlo —, ale usazené do skutečného stavu kódu. Níže je,
v čem a proč.

1. **Migrace je `db/migrace/0006_navstevy.sql`, ne `0008`.** Poslední
   migrace v této větvi je `0004_provoz_a_tym.sql`, takže 0006 je volné
   (a je to jméno, které nese i šablona). Migrace jsou append-only,
   přečíslovat je nešlo.
2. **`agregaty` je seznam jmen tabulek, ne objektů.** Tvar převzatý ze
   šablony: tabulka uvedená v `agregaty` smí být bez `uzivatel_id`, ale
   `kontrola_manifestu.py` jí za to zakáže jakýkoli sloupec, který vypadá
   jako osobní údaj. Text do zásad nese samostatný klíč `agregaty_popis`.
3. **Do generátoru přibyl jen aditivní blok.** `vykresli_zasady.py` nově
   vykresluje sekci „Co počítáme anonymně“ v zásadách a stejnou sekci
   v záznamu o zpracování, obojí jen když manifest nějaký agregát
   deklaruje. Žádná existující věta se nezměnila.
4. **Zkušební doba je 60 dní, ne 14.** V této větvi je `ZKUSEBNI_DNU = 60`
   (`spolecne.js`) a appka se podle toho chová. Do manifestu se doplnilo
   `zkusebni_dni: 60`, aby to bylo zapsané na jednom místě. Úvodní
   obrazovka bere číslo z konstanty `ZKUSEBNI_DNI` v `index.html`; mění
   se obě místa najednou.
5. **`window.CENIK` v této větvi neexistoval — zavedl se, ale je vypnutý.**
   Nese schválené ceny 89 / 129 / 249 Kč měsíčně za celou provozovnu
   a příznak `zverejnit: false`, kvůli kterému úvod cenu neukáže (viz
   sekce o recenzi níže). Až bude zapnutý, částka se vykreslí z ceníku;
   v HTML žádná číslice neleží.
6. **`web/index.html` nově linkuje `web/styl.css`.** Žádá to `DESIGN.md`:
   sdílený návrhový systém je základ každého produktu. Appka si nechává
   vlastní starší vrstvu; srovnaná jsou jen místa, kde by se obě praly —
   `.obrazovka`, `.seznam`, `.prazdno`, `.stitek` (v appce je to
   vytištěný štítek, ne textový odznak), fokus pole a barva odkazů.
   Viz blok „Srovnání se styl.css“ v hlavičce stylu.
7. **Doplněno `obsah_zakaznika_popis` a `subjekty_obsahu`** do manifestu.
   Popisují, jaké údaje třetích osob servis do appky vkládá; generátor
   v této větvi je zatím nevykresluje, ale manifest je jediný zdroj
   pravdy a tohle o produktu platí.

## Co se změnilo po recenzi

Recenzent vrátil první verzi se sedmi výhradami. Šest z nich mířilo na
jednu věc: se stavbou úvodní obrazovky se do commitu svezla **obnova
šablony**, která přepsala `vykresli_zasady.py` na právní balíček 2.0
a vyrobila tři nové závazné dokumenty (obchodní podmínky, zpracovatelská
smlouva, formulář pro odstoupení). Specifikace povolila v generátoru
jedinou aditivní změnu a jako kritérium ověření uvedla, že se existující
řádky nesmí změnit. Recenzent má pravdu a je to vráceno:

1. **`vykresli_zasady.py` je zpátky na verzi z `f88e6ac`** plus jediná
   aditivní sekce „Co počítáme anonymně“. Generuje zase jen
   `web/zasady.html` a `ZAZNAM_O_ZPRACOVANI.md`.
2. **`kontrola_manifestu.py` je zpátky na verzi z `f88e6ac`** plus
   podpora `agregaty`, kterou specifikace výslovně žádá (bod 3 plánu).
3. **Smazány `web/podminky.html`, `web/zpracovatelska-smlouva.html`
   a `web/odstoupeni-formular.html`.** Nikdo je neschválil a byly by to
   závazky firmy (audit u zákazníka ohlášený 14 dní předem, incident do
   24 hodin, oddělená testovací databáze, zálohy s přepisem do 30 dnů)
   i popis nákupního toku, který v této větvi neexistuje. Patří do
   samostatné stavby s vlastní bránou a s právníkem.
4. **`POSTUP_PRI_INCIDENTU.md` vrácen** na ručně psanou verzi — nový
   generátor si ho začal generovat, což ho přepsalo.
5. **Patička má zase jediný odkaz** (`zasady.html`) — jediný právní
   dokument, který v této větvi existuje.
6. **Úvod neukazuje cenu.** `window.CENIK.zverejnit = false`: veřejná
   nabídka placené služby musí vedle ceny nést, kdo ji nabízí, a obchodní
   firma, IČO a sídlo provozovatele v repozitáři nejsou. Místo ceny úvod
   říká „Prvních 60 dní zdarma, bez karty. Po zkušebním období se vám
   ozveme s cenou; nic se nestrhává automaticky.“ — což je přesně to, co
   appka dnes dělá. Karta s cenou má tedy zároveň doložený prázdný stav.
7. **`zapisNavstevu("uvod")` se volá i v `catch` větvi `obnov()`**, jak
   žádal bod 9 plánu. Návštěvník, kterému selže `/api/ja`, úvod uvidí
   a do čísel se dostane.
8. **Odmítnutí počítadla už není tiché.** `zapisNavstevu` návštěvníkovi
   dál nic neukáže, ale stav jiný než 200 vypíše do konzole, a README
   má hotový `curl` + `wrangler d1` postup, kterým se na náhledu doloží,
   že nepřihlášený POST opravdu zapíše řádek.

**Nedoloženo:** stavitel nemá přístup k nasazení ani k databázi, takže
výpis z `navstevy` z náhledu v tomto PR není. Postup je v README
(sekce „Kolik lidí přišlo na úvodní stránku“) a je to první bod ověření.

## Co zbývá majiteli

Úvodní obrazovka je veřejná stránka produktu. Než se na ni pustí nábor:

1. **Doplnit do manifestu identifikaci provozovatele** — `ico`, `sidlo`,
   `dic` (nebo „nejsme plátci DPH“) — a přegenerovat zásady. Teprve pak
   dává smysl přepnout `window.CENIK.zverejnit` na `true` a ukázat cenu;
   nabídka s cenou bez identifikace prodávajícího je spotřebitelský
   problém, ne kosmetika.
2. **Nechat právníkem projít texty zásad** před prvním ostrým produktem,
   jak žádá zadání šablony s pamětí.
3. **Rozhodnout o obchodních podmínkách a zpracovatelské smlouvě.** Dokud
   nejsou, appka o DPH, fakturaci ani odstoupení mlčí — raději nic než
   věta, kterou žádný dokument nepotvrdí.
Mezi schválením a stavbou dorazil ze šablony i **modul objednávky** a majitel
schválil **ceník**. Obojí bylo součástí zadání stavby, takže se postavilo —
níže je, v čem to specifikaci přepsalo, a proč.

1. **V aplikaci jsou částky.** Specifikace psala „žádné částky, jen ceník
   sdělí provozovatel“, protože cena tehdy schválená nebyla. Teď je: Sólo
   89 Kč, Základ 129 Kč, Tým 249 Kč za měsíc a provozovnu, zkušební doba
   14 dní. Jsou v `window.CENIK` a `VARIANTY` v `web/index.html`; jediný
   výpočet je násobek počtu měsíců, který zákon vyžaduje ukázat před
   zavazujícím tlačítkem.
2. **Místo tlačítka s `mailto:` je skutečná objednávka.** `/api/objednavka`
   uloží objednávku a pošle ji provozovateli i potvrzení zákazníkovi
   (Resend, už dřív deklarovaný — **žádná nová externí služba**, jak
   specifikace žádá). Tlačítko nese doslova „Objednávka zavazující
   k platbě“, spotřebitel má samostatné zaškrtávátko souhlasu podle § 1837
   písm. l. Objednávat smí jen `spravce` a objednávka patří provozovně
   (`servis.id`), ne osobě, která ji odeslala.
3. **Migrace se přečíslovaly na `0005`–`0007`.** Šablona je nese jako `0002`,
   `0004`, `0005`, jenže ta čísla v tomhle produktu už patří běžícím
   migracím `0002_pneusklad`, `0004_provoz_a_tym`. Migrace jsou append-only.
4. **Tabulka objednávek předplatného se jmenuje `objednavky_predplatneho`.**
   Šablonové jméno `objednavky` v tomhle produktu patří objednávkovému
   kalendáři dílny — `CREATE TABLE objednavky` by na existující databázi
   rovnou spadl.
5. **Zkušební doba je 14 dní, ne 60.** Odpovídá schválenému ceníku
   a obchodním podmínkám (`ZKUSEBNI_DNU`, `ZKUSEBNI_DNI`, `zkusebni_dni`
   v manifestu). Servisy, které zkušebku začaly dřív, si podržely datum,
   které dostaly: `stavPredplatneho` čte `nastaveni_servisu.zkusebni_do`,
   když existuje, a teprve jinak počítá od založení účtu.
6. **`web/index.html` nově linkuje `web/styl.css`.** Vyžaduje to nová
   kontrola v `kontrola_manifestu.py`. Appka si nechává vlastní starší
   vrstvu; srovnaná jsou jen místa, kde by se obě praly (odkazy, vjezd
   obrazovek, seznam, textarea v poli, tištěný štítek) — viz blok
   „Srovnání se styl.css“ v hlavičce stylu.
7. **Přibyly tabulky `platby` a `objednavky_predplatneho`** (kromě
   `predplatne`), obě v manifestu. `platby` je historie plateb — bez ní by
   nešlo zodpovědět, jestli přišel druhý nákup, což je kill signál zadání.
8. **Fakturační údaje v manifestu.** Objednávka ukládá fakturační údaje
   zákazníka; manifest je deklaruje u entity `objednavky_predplatneho`
   a retenci váže na smazání účtu (daňové doklady vede provozovatel mimo
   aplikaci).

## Co zbývá majiteli (blokuje spuštění placení)

Generátor právních dokumentů (verze 2.0) vykresluje prázdné identifikační
sloty červeně jako „(doplnit …)“ — dokument s nimi není zveřejnitelný.
Stavitel je nevyplňuje, patří majiteli:

`ico`, `dic`, `sidlo`, `zapis_or`, `odpovedna_osoba`, `zastup`,
`ucinnost_od` a **`cena_dph`**.

`cena_dph` blokuje placení nejvíc: dokud tam není „včetně DPH“ nebo „bez
DPH, poskytovatel není plátcem DPH“, zákazník u tlačítka zavazujícího
k platbě nezjistí, co částka znamená. Appka proto o DPH **mlčí** — raději
nic než odkaz na dokument, který odpověď neobsahuje. Jakmile majitel slot
vyplní, patří do rozpisu ceny u tlačítka jedna věta navíc.
