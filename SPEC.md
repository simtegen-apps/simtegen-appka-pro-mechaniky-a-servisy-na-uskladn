<<<<<<< HEAD
# Specifikace — build 7

Appka Pneusklad už stojí (sklad sad, tisk štítků na Zebru i archy A4, objednávkový kalendář, „Připravit kola“ s e-mailem, sezónní přehled, tým, export a smazání účtu) — chybí jediná věc, bez které nejde naplnit kontrakt „3 platící servisy do 3 měsíců“: produkt neumí vzít peníze. Po 60 dnech zkušebního režimu appka řekne „napište nám na podporu“ (spolecne.js:172) a nikdo nenapíše, přitom vygenerované obchodní podmínky nákupní tok podrobně slibují (web/podminky.html:47-82: ceník v aplikaci, tlačítko „Objednávka zavazující k platbě“, celková cena před stiskem, platba na fakturu, zaplacené období u účtu, omezený režim, samostatný souhlas podle § 1837 písm. l). Build 6 postaví přesně tento tok — obrazovku Předplatné, objednávku sezóny nebo roku, pruh s upomínkou na Dnes, omezený režim — bez platební brány (platí se na fakturu, kterou vystaví člověk) a bez admin rozhraní; k tomu jako menší věc připomínku, která opravdu zazvoní: .ics do kalendáře v telefonu.

## Placená hodnota (proč přijde druhý nákup)
Platí se za uloženou evidenci, ve které servis ví, čí kola leží ve které polici, kdo má zaplaceno a koho má před sezónou obvolat — a druhý nákup přijde sám, protože kola fyzicky leží v regálu dál: 30 dní před koncem zaplaceného období appka na obrazovce Dnes napíše „Předplatné končí 30. 4., v regálu máte 38 sad“ a hned vedle je tlačítko, kterým si servis koupí další sezónu.

## Design (obrazovky, navigace, stavy)
Skládá se ze stávajícího návrhového systému web/styl.css a tříd, které appka už nese (.karta, .radky, .chipy, .pole, .vyber, .dolni-akce, .zprava, .kostra, .dlazdice .cislo, .hlaska). Žádná nová barva, písmo, velikost ani obrázek.

OBRAZOVKY (a největší věc na každé)
1) Úvod (#obrazovka-prihlaseni, existuje) — největší věc: h1 a pod ním „89 Kč“. Mění se jen zdroj čísla: ceník i délka zkušebního období přicházejí z /api/ja (jedna pravda ve spolecne.js), window.CENIK a konstanta ZKUSEBNI_DNI z HTML mizí. Prázdný: bez ceníku se karta ceny nevykreslí vůbec, věta o zkušebním období zůstává mimo ni. Načítání: #obrazovka-nacitani drží scénu, úvod se nevykreslí napůl. Chyba: .zprava.chyba pod tlačítkem, česky, bez kódů. Úspěch: .zprava.uspech o odeslaném přihlašovacím odkazu.
2) Dnes (existuje) — největší věc zůstávají dvě dlaždice s čísly (Připravit na zítra, Sezónní výzva). Nad ně přijde pruh stavu (.karta pozor), a jen když je co říct: „Zkušební období končí za 12 dní. V regálu máte 38 sad.“ / „Předplatné končí 30. 4. 2027.“ / při prošlém období .hlaska chyba „Účet je v omezeném režimu — data vidíte a stáhnete, zapisovat jde po zaplacení.“ V pruhu tlačítko „Objednat předplatné“. Prázdný stav: není co oznámit = pruh se nevykreslí (ne prázdný rám). Načítání: dlaždice drží „—“ jako dnes. Chyba: #dnes-zprava.
3) Předplatné (#obrazovka-predplatne, NOVÁ, s tlačítkem .zpet) — největší věc: stav účtu jako číslo ve stylu .dlazdice .cislo („zbývá 12 dní“ / „zaplaceno do 30. 4. 2027“). Pod tím .chipy varianta (Sólo 89 / Základ 129 / Tým 249 Kč měsíčně za provozovnu), .chipy období (Sezóna 6 měsíců / Celý rok 12 měsíců), karta součtu („534 Kč — Sólo, 6 měsíců, od 1. 11. 2026 do 30. 4. 2027“), fakturační pole (Název, IČO, DIČ nepovinně, Adresa, E-mail pro fakturu) a .vyber se samostatným souhlasem podle § 1837 písm. l) s poučením pod ním. V .dolni-akce v dosahu palce tlačítko „Objednávka zavazující k platbě“ a pod ním p.maly „Zaplatíte na fakturu, kterou vám pošleme e-mailem.“ Na konci seznam objednávek (číslo, období, částka, Čeká na zaplacení / Zaplaceno) s možností zrušit nezaplacenou. Prázdný: „Zatím jste si nic neobjednali.“ v místě seznamu. Načítání: .kostra na stavové kartě a na seznamu. Chyba: .zprava.chyba pod tlačítkem („Doplňte prosím IČO.“, „Máte objednávku, která čeká na zaplacení.“). Úspěch: .zprava.uspech „Objednávka 26-001 přijata. Fakturu pošleme na servis@email.cz.“ a nový řádek v seznamu.
4) Nastavení (existuje) — řádek „Tarif“ se stává klepatelným a vede na Předplatné; v omezeném režimu nahoře .hlaska varovani s tím, co jde a co nejde. Ostatní stavy beze změny.
5) Příprava (existuje) — vedle „Poslat si seznam e-mailem“ druhé tiché tlačítko „Připomínka do kalendáře“: stáhne .ics s událostí v 18:00 den před vybraným dnem, s VALARM na čas události a s kódy sad i pozicemi v popisu. Bez objednávek je tlačítko skryté (prázdný stav obrazovky zůstává jako dnes), chyba se hlásí v #pripr-zprava.

NAVIGACE (max 3 klepnutí k hlavní hodnotě) — spodní lišta zůstává beze změny (Dnes, Sklad, Zákazníci, Objednávky, Nastavení). Předplatné do lišty nepřidáváme: vede na něj pruh na Dnes (1 klepnutí) nebo Nastavení → Tarif (2 klepnutí). Hlavní hodnota je nedotčená: Dnes → „+ Nová sada“ → hotovo = 2 klepnutí, tisk štítku z téže obrazovky.

OMEZENÝ REŽIM — body.omezeno recykluje existující pravidlo „body.jen-cteni .jen-zapis { display: none }“, takže zapisovací tlačítka zmizí na všech obrazovkách jediným přepínačem a nikde nezůstane tlačítko, které skončí chybou. Výdej sady, označení zaplaceného uskladnění a úpravy zůstávají povolené — kola jsou majetek motoristy a nesmí být rukojmí nezaplacené faktury.

## Plán
1. db/migrace/0007_predplatne.sql — tabulka `predplatne` (0006 je poslední, migrace jsou append-only): id, uzivatel_id REFERENCES uzivatele ON DELETE CASCADE, cislo, varianta, mesicu, cena_mesic, cena_celkem, stav (nova|zaplacena|zrusena), souhlas_plneni, fakt_nazev/fakt_ico/fakt_dic/fakt_adresa/fakt_email jako snímek objednávky, plati_od, plati_do, vytvoreno, zaplaceno, UNIQUE(uzivatel_id, cislo), index (uzivatel_id, plati_do). uzivatel_id je uvnitř téhož CREATE TABLE (žádné ALTER), takže export i smazání účtu tabulku berou generikou. Žádný nový sloupec jinde: „zaplaceno do“ se dopočítává jako MAX(plati_do) u řádků stav='zaplacena', aby nemohlo odjet od skutečnosti.
2. spolecne.js — CENIK (měna + schválené varianty 89/129/249 Kč měsíčně za provozovnu), OBDOBI = [{sezona, 6}, {rok, 12}], DPH_POPIS = "" (zrcadlí klíč manifestu), noveCisloObjednavky() ve tvaru RR-NNN po servisech, stavPredplatneho(env, id) → {stav: partner|placeno|zkusebni|omezeno, placene_do, varianta, zkusebni_do, zbyva_dnu}; zkontrolujLimit() přepsaná nad tímto stavem (placeno a partner bez limitu, zkusebni 40 sad jako dnes, omezeno česká věta s odkazem na obrazovku Předplatné). nastaveni_servisu.plan zůstává a dostává jediný nový význam: ruční hodnota 'partner' = účet bez limitů a bez upomínek (zákazník nula, ukázky).
3. functions/api/ja.js — k `prihlasen` přidat cenik, obdobi, zkusebni_dni a dph_popis, aby úvodní obrazovka ani appka neměly vlastní číslici. Boot už na /api/ja čeká, žádný nový požadavek nevzniká.
4. functions/api/predplatne.js — GET (stav, dopočítané „placeno do“, počet sad v regálu, fakturační údaje předplněné z poslední objednávky, seznam objednávek) a POST (jen role spravce; validace varianty, měsíců, IČO na 8 číslic a e-mailu; cena VŽDY ze serveru, nikdy z klienta; druhá nezaplacená objednávka odmítnuta 409; plati_od = max(dnes, placene_do) a bez zaškrtnutého souhlasu +14 dní podle podmínek; plati_do = plati_od + mesicu; zápis a dva e-maily přes Resend — potvrzení zákazníkovi se vším, co podmínky žádají, a kopie na podpora@simtegen.cz, ze které člověk vystaví fakturu; bez RESEND_API_KEY vrátit náhled jako to dělá priprava.js). Je-li DPH_POPIS prázdný, POST vrací 409 s českou větou a tlačítko je v UI zamčené.
5. functions/api/predplatne/[id].js — DELETE zruší vlastní objednávku ve stavu nova (stav='zrusena'), nic jiného.
6. Omezený režim na serveru — zkontrolujLimit() zapojit i do functions/api/objednavky.js (POST) a functions/api/zakaznici.js (POST); sady.js ji už volá. Výdej, přesun, označení zaplaceno a úpravy záměrně nechat volné.
7. web/index.html — nová obrazovka Předplatné a pruh stavu na Dnes podle sekce design, body.omezeno, klepatelný řádek Tarif, generátor .ics (čistá funkce, text/calendar blob, CRLF, UID z účtu a dne, VALARM) a zrušení window.CENIK i ZKUSEBNI_DNI ve prospěch dat z /api/ja.
8. data-manifest.json — entita predplatne (účel „objednávka a evidence zaplaceného období předplatného“, pole včetně fakturačních údajů, retence „do smazání účtu zákazníkem“ s větou, že vystavená faktura je účetní doklad a zůstává v účetnictví SimteGenu po zákonnou dobu mimo aplikaci), rozšířený účel Resendu o potvrzení objednávky a kopii na podporu, nový klíč dph_popis.
9. python3 vykresli_zasady.py — přegenerovat všech šest dokumentů a v nich NIC neopravovat ručně (past z buildu 5); zkontrolovat git diff: smí přibýt jen řádek o predplatne a nový účel Resendu.
10. README.md — sekce „Jak se platí“: jak označit objednávku zaplacenou (UPDATE predplatne SET stav='zaplacena', zaplaceno=unixepoch() WHERE uzivatel_id=? AND cislo=?), jak dát účtu plan='partner', jak vypsat nezaplacené objednávky.
11. SPEC.md — sekce build 6 ve stejné struktuře jako build 5.
12. python3 kontrola_manifestu.py musí projít; pak ruční průchod podle sekce „Jak ověřit“ na telefonu.

## Soubory
- db/migrace/0007_predplatne.sql
- functions/api/predplatne.js
- functions/api/predplatne/[id].js
- spolecne.js
- functions/api/ja.js
- functions/api/nastaveni.js
- functions/api/objednavky.js
- functions/api/zakaznici.js
- web/index.html
- data-manifest.json
- web/zasady.html
- web/podminky.html
- web/zpracovatelska-smlouva.html
- web/odstoupeni-formular.html
- ZAZNAM_O_ZPRACOVANI.md
- POSTUP_PRI_INCIDENTU.md
=======
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
>>>>>>> origin/main
- README.md
- SPEC.md

## Rizika
<<<<<<< HEAD
1. Bez jedné věty o DPH se nesmí prodávat. Obchodní podmínky slibují konečnou cenu před stiskem tlačítka; DPH_POPIS je prázdný, dokud ho majitel nedoplní (manifest + spolecne.js, jeden řádek na dvou místech). Do té doby je objednávkové tlačítko zamčené českou větou a POST vrací 409 — všechno ostatní na obrazovce funguje a jde předvést. Totéž platí pro IČO a sídlo na faktuře: fakturu vystavuje člověk mimo appku, ale bez identifikace prodávajícího není co poslat. Tohle je jediná věc, kterou plán potřebuje od majitele.
2. Označení zaplacení je ruční. Žádné admin rozhraní, jen SQL v README — u prvních 15 zákazníků je to správná volba, ale zapomenutá objednávka znamená, že servis zaplatil a appka ho pustí do omezeného režimu. Proto kopie každé objednávky e-mailem na podporu a hotový dotaz na nezaplacené objednávky v README; nad ~15 zákazníků je admin obrazovka první věc, která se musí postavit.
3. Spotřebitel vs. podnikatel. Živnostník, který IČO nezadá, je právně spotřebitel s 14denním odstoupením. Proto je IČO povinné pole a souhlas podle § 1837 písm. l) samostatné zaškrtnutí, které bez zaškrtnutí posune začátek placeného období o 14 dní — přesně jak to říkají vygenerované podmínky. Texty přesto patří před prvním ostrým prodejem právníkovi.
4. Účetnictví vs. smazání účtu. Řádek predplatne se smazáním účtu zmizí, vystavená faktura ne — je účetní doklad a žije v účetnictví mimo aplikaci. Musí to být napsané v zásadách, jinak to vypadá jako díra v tom, co produkt slibuje.
5. Přesun ceníku do /api/ja se dotýká běžící úvodní obrazovky a přihlašovacího toku. Ověřit odhlášeně i přihlášeně a hlavně to, že při chybě /api/ja úvod pořád naběhne — build 5 na téhle větvi už jednou stál.
6. Omezený režim nesmí zablokovat výdej kol. Stačí přehlédnout jeden handler a servis nevydá motoristovi jeho majetek. Ověřuje se bodem 6 validace.
7. „Čeká na zaplacení“ nesmí vypadat jako „zaplaceno“. Dokud objednávku někdo neoznačí, stav účtu se nemění; obrazovka to musí říkat jasně, jinak servis skončí v omezeném režimu s přesvědčením, že má zaplaceno.
8. Automatická večerní připomínka pořád není. Pages Functions nemají cron (viz komentář v functions/api/priprava.js), takže .ics do kalendáře v telefonu je nejlepší, co jde bez cizí služby. Skutečná push připomínka znamená externí spouštěč (cizí cron nebo samostatný Worker) a je to rozhodnutí majitele, ne stavitele — patří do dalšího buildu.
9. Build se dotýká generátoru právních dokumentů jen přes manifest. Jakákoliv ruční úprava vygenerovaných souborů shodí CI a tiše přepíše zásady zákazníkovi; generátor se spouští, neopravuje.

## Jak ověřit
Na náhledovém nasazení, na telefonu v šířce ~390 px:
1. Odhlášeně otevřít / → úvod ukazuje „89 Kč“ jako největší číslo a „Prvních 60 dní zdarma, bez karty.“; čísla jdou ze serveru, v HTML žádná číslice neleží. Přihlásit se odkazem z odpovědi.
2. Dnes → žádný pruh stavu (nový účet má 60 dní). V D1 zkrátit zkusebni_do na 10 dní dopředu → po načtení se nahoře objeví pruh „Zkušební období končí za 10 dní“ s tlačítkem.
3. Klepnout na tlačítko → obrazovka Předplatné na jedno klepnutí. Vybrat Sólo + Sezóna → karta součtu ukazuje 534 Kč a období od–do. Odeslat bez IČO → česká chyba pod polem a nic se nezapsalo.
4. Doplnit fakturační údaje, zaškrtnout souhlas a stisknout „Objednávka zavazující k platbě“ → úspěch s číslem objednávky, řádek „Čeká na zaplacení“ v seznamu, ve vývojovém režimu náhled obou e-mailů (zákazníkovi i na podporu). Druhý pokus → 409 „Máte objednávku, která čeká na zaplacení.“
5. wrangler d1 execute: UPDATE predplatne SET stav='zaplacena', zaplaceno=unixepoch() … → po načtení stav „Zaplaceno do …“, pruh na Dnes zmizel, Nastavení ukazuje tarif Sólo a žádný limit sad; uložení 41. sady projde.
6. UPDATE predplatne SET plati_do=unixepoch()-1 … → appka v omezeném režimu: zapisovací tlačítka zmizela, POST /api/sady, /api/objednavky i /api/zakaznici vrací českou větu s odkazem na Předplatné, ALE výdej sady, označení zaplaceného uskladnění a „Stáhnout moje data“ fungují.
7. Příprava → vybrat den → „Připomínka do kalendáře“ → telefon nabídne přidat událost v 18:00 předchozího dne, v popisu kódy sad a pozice v regálu; v čase události notifikace zazvoní.
8. GET /api/ucet/export → v moje-data.json je tabulka predplatne i s objednávkami. Smazat testovací účet → řádky zmizely.
9. Lokálně python3 vykresli_zasady.py && python3 kontrola_manifestu.py → „Manifest souhlasí s kódem, zásadami i datovým modelem.“ a git diff generovaných dokumentů ukazuje jen entitu predplatne a nový účel Resendu.
10. Zkouška „zákazník nula“: účtu nastavit plan='partner' → žádný pruh, žádný limit, appka o peníze nežádá.
=======
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
>>>>>>> origin/main

_Schvaluje se přes ARGA (simtegen_approve_spec) nebo na mini PC._

## Co se při stavbě oproti této specifikaci změnilo

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