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
- README.md
- SPEC.md

## Rizika
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

_Schvaluje se přes ARGA (simtegen_approve_spec) nebo na mini PC._