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

Obrazovky: Dnes · Sklad · Objednávky · Nastavení (hlavní menu), k tomu
podobrazovky Zákazníci, Nová sada (průvodce 5 kroků), Detail sady, Nová
objednávka, Připravit kola, Sezónní přehled, Zákazník a Předplatné.

**Placená hodnota:** platí se za uloženou evidenci, která je jediné místo,
kde servis ví, čí kola kde leží — a která mu dvakrát ročně vydělá
(obvolávací seznam, sady pod 4 mm k nabídce nových pneu, nezaplacené
uskladnění). Druhý nákup přichází sám: fyzické uskladnění běží celý rok
a přezouvací sezóna se opakuje každé jaro a podzim.

**Build 3** postavil tohle jádro. **Build 4** přidal placení a nic z jádra
nepřestavěl. **Build 7** přepsal appku do návrhového systému v2 a dodělal,
co kolem placení a připomínky chybělo. **Build 10** (poslední sekce) z ní
udělal aplikaci v Google Play s nákupem předplatného přes Google Play,
záznamem v obchodě a schváleným ceníkem (Standard 129 Kč, Sezónní vstup
790 Kč, Větší provozovna 229 Kč, 30 dní zdarma).

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

## Co se při stavbě buildu 4 oproti specifikaci změnilo

Mezi schválením a stavbou dorazil ze šablony i **modul objednávky** a majitel
schválil **ceník**. Obojí bylo součástí zadání stavby, takže se postavilo —
níže je, v čem to specifikaci přepsalo, a proč.

1. **V aplikaci jsou částky.** Specifikace psala „žádné částky, jen ceník
   sdělí provozovatel“, protože cena tehdy schválená nebyla. Teď je: Sólo
   89 Kč, Základ 129 Kč, Tým 249 Kč za měsíc a provozovnu, zkušební doba
   14 dní. Jediný výpočet je násobek počtu měsíců, který zákon vyžaduje
   ukázat před zavazujícím tlačítkem.
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
   a obchodním podmínkám (`ZKUSEBNI_DNI`, `zkusebni_dni` v manifestu).
   Servisy, které zkušebku začaly dřív, si podržely datum, které dostaly:
   `stavPredplatneho` čte `nastaveni_servisu.zkusebni_do`, když existuje,
   a teprve jinak počítá od založení účtu.
6. **Přibyly tabulky `platby` a `objednavky_predplatneho`** (kromě
   `predplatne`), obě v manifestu. `platby` je historie plateb — bez ní by
   nešlo zodpovědět, jestli přišel druhý nákup, což je kill signál zadání.
7. **Fakturační údaje v manifestu.** Objednávka ukládá fakturační údaje
   zákazníka; manifest je deklaruje u entity `objednavky_predplatneho`
   a retenci váže na smazání účtu (daňové doklady vede provozovatel mimo
   aplikaci).

---

# Specifikace — build 7 (nákupní tok do konce, připomínka, návrhový systém v2)

Appka Pneusklad už stojí (sklad sad, tisk štítků na Zebru i archy A4,
objednávkový kalendář, „Připravit kola“ s e-mailem, sezónní přehled, tým,
export a smazání účtu) a build 4 do ní dostal předplatné s objednávkou.
Build 7 dotahuje nákupní tok tam, kam ho vygenerované obchodní podmínky
posílají (`web/podminky.html`, čl. 3 a 4), odstraňuje tři místa, kde se
appka chovala jinak, než slibuje, a přepisuje celý frontend do návrhového
systému v2 („Mřížka a papír“), protože šablona ho mezitím zavedla a stará
vrstva vlastních barev by neprošla ani CI, ani recenzí.

## Placená hodnota (proč přijde druhý nákup)
Platí se za uloženou evidenci, ve které servis ví, čí kola leží ve které
polici, kdo má zaplaceno a koho má před sezónou obvolat — a druhý nákup
přijde sám, protože kola fyzicky leží v regálu dál: 30 dní před koncem
zaplaceného období appka na obrazovce Dnes napíše „Předplatné končí 30. 4.,
v regálu máte 38 sad“ a hned vedle je tlačítko, kterým si servis koupí
další sezónu.

## Design (obrazovky, navigace, stavy)
Celý `web/index.html` se skládá z návrhového systému v2: `styl.css`
+ `produkt.css` (jen `--barva-produktu`, rumělka `#c2410c`), `simtegen.js`
hned za `<body>`, kostra `.appka > .navigace + .hlavicka + .obsah
+ .paticka`. Žádná barva v HTML, žádné emoji — ikony jsou inline SVG
s `stroke="currentColor"`. Produktový `<style>` nese jen rozvržení
(průvodce, dlaždice, tisk štítků) a žádnou barvu.

OBRAZOVKY (největší věc na každé)
1) Úvod / přihlášení — `.cislo-obri` s cenou „89 Kč“ pod titulkem, tři
   přínosy, pole s e-mailem a jedno hlavní tlačítko. Ceník přichází
   z `/api/ja`, v HTML neleží žádná číslice. Prázdný: bez ceníku se karta
   ceny nevykreslí, věta o zkušebním období zůstává. Načítání: úvodní
   obrazovka SimteGenu (simtegen.js) + `#obrazovka-nacitani`. Chyba/úspěch:
   `.zprava` pod tlačítkem.
2) Dnes — `.cislo-obri` s počtem kol k přípravě na zítra, vedle něj druhé
   číslo (obvolat). Nad tím pruh předplatného, a jen když je co říct:
   ≤ 14 dní zkušebky, ≤ 30 dní placeného období, nebo po konci. Pruh nese
   i počet sad v regálu — číslo, kvůli kterému se obnovuje.
   Prázdný: žádné objednávky → `.prazdno` s tlačítkem na novou sadu.
   Načítání: `.kostra`. Chyba: `#dnes-zprava`.
3) Sklad — počet sad jako obří číslo, filtr `.segmenty`, hledání, seznam
   `.radek`. Výběr více sad → tisk štítků dávkou.
4) Zákazníci, Zákazník, Nová sada (5 kroků), Detail sady, Objednávky, Nová
   objednávka, Připravit kola, Sezónní přehled, Nastavení, Předplatné —
   každá s `.sekce-titulek` sekcemi, jednou hlavní akcí v `.lista-dole`
   a čtveřicí stavů.
5) Připravit kola — vedle „Poslat si seznam e-mailem“ druhé tiché tlačítko
   „Připomínka do kalendáře“: stáhne `.ics` s událostí v 18:00 den před
   vybraným dnem, s `VALARM` a s kódy sad i pozicemi v popisu.
6) Předplatné — stav účtu jako obří číslo, ceník, celková cena před
   zavazujícím tlačítkem, seznam objednávek se stavem a možností zrušit
   nezaplacenou.

NAVIGACE: menu má čtyři položky (Dnes · Sklad · Objednávky · Nastavení),
jak žádá DESIGN.md v2. Zákazníci se přesunuli na odkaz „Vše →“ v sekci na
Dnes (1 klepnutí). Hlavní hodnota zůstává na dvou klepnutích: Dnes →
„Nová sada“ → průvodce, tisk štítku z téže obrazovky. Předplatné vede
z pruhu na Dnes (1 klepnutí) nebo z Nastavení (2 klepnutí).

OMEZENÝ REŽIM: `body.bez-predplatneho` skrývá `.jen-zapis`. Výdej sady,
označení zaplaceného uskladnění a stažení dat zůstávají povolené — kola
jsou majetek motoristy a nesmí být rukojmí nezaplacené faktury.

## Plán
1. `cenik.js` v kořeni — jediný zdroj schváleného ceníku (`CENIK`,
   `OBDOBI`, `CENA_DPH` zrcadlící `cena_dph` z manifestu). Čte ho server
   (`/api/objednavka`) i stránka (přes `/api/ja`).
2. `functions/api/ja.js` — vrací `cenik`, `obdobi`, `zkusebni_dni`
   a `cena_dph` i nepřihlášenému, aby v HTML neležela žádná částka.
3. `functions/api/objednavka/[id].js` — zrušení vlastní nezaplacené
   objednávky (`akce: "zrusit"`). Bez něj jedna zapomenutá objednávka
   zablokuje další objednání natrvalo.
4. `functions/api/sady/[id].js` — výdej sady a označení zaplaceno projdou
   i po vypršení předplatného; ostatní zápisy dál 402.
5. `web/index.html` — kompletní přepis do návrhového systému v2 se všemi
   obrazovkami, `.ics` připomínkou a pruhem předplatného s počtem sad.
6. `uat/scenare.json` — akceptační scénáře (uskladnění a dohledání sady,
   objednávka do kalendáře a příprava, objednávka předplatného a její
   zrušení, cizí účet nesmí nic z toho vidět).
7. `data-manifest.json` — doplnit prázdný slot `cena_dph` (vyplní majitel).
8. `python3 vykresli_zasady.py && python3 kontrola_manifestu.py`.
9. `README.md`, `SPEC.md`.

## Soubory
- cenik.js
- functions/api/ja.js
- functions/api/objednavka.js
- functions/api/objednavka/[id].js
- functions/api/sady/[id].js
- web/index.html
- web/produkt.css
- uat/scenare.json
- data-manifest.json
- web/zasady.html, web/podminky.html, web/zpracovatelska-smlouva.html,
  web/odstoupeni-formular.html, ZAZNAM_O_ZPRACOVANI.md,
  POSTUP_PRI_INCIDENTU.md (generované)
- README.md
- SPEC.md

## Rizika
1. Bez vyplněného `cena_dph` appka o DPH mlčí. Zákazník u zavazujícího
   tlačítka vidí celkovou částku, ale ne daňový režim. Je to otevřený slot
   majitele; appka raději mlčí, než aby odkazovala na dokument, který
   odpověď neobsahuje.
2. Označení zaplacení je ruční (SQL v README). Zapomenutá objednávka
   znamená, že servis zaplatil a appka ho pustí do režimu čtení. Proto
   kopie objednávky e-mailem na podporu a dotaz na nezaplacené objednávky
   v README; nad ~15 zákazníků je admin obrazovka první věc, co se postaví.
3. Přepis frontendu do v2 je velký zásah do běžící appky. Žádné API se
   nemění, ale každá obrazovka se překládá do jiných tříd — ověřuje se
   vizuální kontrolou na pěti šířkách a akceptačními scénáři.
4. Menu zhublo z pěti položek na čtyři (DESIGN.md v2). Zákazníci jsou teď
   o jedno klepnutí dál z Dnes; kdo je používal denně, musí si zvyknout.
5. Tisk štítků má v `@media print` pojmenované barvy (`white`, `black`) —
   jediné místo, kde barva nepochází ze `styl.css`. Štítek musí být černý
   na bílém i tehdy, když má mechanik telefon v tmavém režimu.
6. Omezený režim nesmí zablokovat výdej kol. Ověřuje se bodem 6 validace.
7. Automatická večerní připomínka pořád není. Pages Functions nemají cron;
   `.ics` do kalendáře telefonu je nejlepší, co jde bez cizí služby.
8. Generátor právních dokumentů se spouští, neopravuje — jakákoli ruční
   úprava vygenerovaných souborů shodí CI.

## Jak ověřit
Na náhledovém nasazení, na telefonu ~390 px:
1. Odhlášeně otevřít `/` → úvod ukazuje „89 Kč“ jako největší číslo
   a „Prvních 14 dní zdarma“; v HTML žádná číslice neleží. Přihlásit se
   odkazem z odpovědi.
2. Dnes → obří číslo „kol na zítra“, dole jedna hlavní akce. Menu má čtyři
   položky, „Nahlásit chybu“ je vidět na každé obrazovce.
3. Nová sada ve čtyřech krocích → kód sady, tisk štítku, štítek je černý
   na bílém a čárový kód se načte čtečkou.
4. Předplatné (pruh na Dnes nebo Nastavení) → vybrat variantu a délku,
   vidět celkovou částku, odeslat „Objednávka zavazující k platbě“ →
   objednávka v seznamu se stavem „Přijata, čeká na fakturu“. Zrušit ji →
   jde objednat znovu.
5. `UPDATE predplatne SET plati_do = unixepoch() - 1` → appka v režimu
   čtení: zapisovací tlačítka zmizela, POST /api/sady vrací 402, **ale
   výdej sady, označení zaplaceno a stažení dat fungují**.
6. Připravit kola → „Připomínka do kalendáře“ → telefon nabídne událost
   v 18:00 předchozího dne s kódy sad a pozicemi v popisu.
7. Lokálně `python3 vykresli_zasady.py && python3 kontrola_manifestu.py`
   → „Manifest souhlasí s kódem, zásadami i datovým modelem.“

## Co se při stavbě buildu 7 oproti specifikaci změnilo

Specifikace vznikla nad snímkem větve, kde modul předplatného ještě nebyl
(psala o nové tabulce `predplatne`, endpointu `/api/predplatne` a migraci
`0007_predplatne.sql`). Mezitím se do `main` slil build 4, který tohle
všechno postavil jinak a je nasazený u zákazníka. Nic z něj se neodstranilo;
stavělo se to, co specifikace chce, nad tím, co v produktu skutečně běží:

1. **Žádná nová migrace.** Datový model předplatného existuje v migracích
   `0005`–`0007` (`predplatne`, `platby`, `objednavky_predplatneho`)
   a pokrývá i fakturační údaje a souhlas podle § 1837 l. Zakládat vedle
   toho druhou tabulku `predplatne` by znamenalo dvě pravdy o jednom účtu.
2. **Endpoint se jmenuje `/api/objednavka`, ne `/api/predplatne`.** Přibyl
   k němu jen `/api/objednavka/[id]` na zrušení nezaplacené objednávky.
3. **Objednávkové tlačítko se nezamyká.** Specifikace chtěla zamknout
   objednávku, dokud majitel nedoplní větu o DPH. V `main` objednávka
   běží a je nasazená — zamknout ji by znamenalo vzít zákazníkovi funkci,
   kterou má. Appka proto o DPH dál mlčí a `cena_dph` zůstává otevřeným
   slotem majitele.
4. **Hlavní menu má čtyři položky.** DESIGN.md v2 (infrastruktura šablony,
   novější než tahle specifikace) jich povoluje nejvýš čtyři; specifikace
   počítala s pěti. Zákazníci se přesunuli o jedno klepnutí dál.
5. **Zkušební doba je 14 dní.** Specifikace psala 60 podle starého snímku;
   schválený ceník, obchodní podmínky i manifest nesou 14.
6. **Přibyl přepis celého frontendu do návrhového systému v2.** Ve
   specifikaci nebyl — šablona ho zavedla mezi schválením a stavbou a CI
   starou vrstvu vlastních barev odmítá.
7. **Režim čtení dostal druhou třídu `.jen-role`.** `.jen-zapis` skrývá
   tlačítka při roli „jen čtení“ i při vypršelém předplatném; výdej kol
   a zápis zaplaceného uskladnění musí přežít druhé, ale ne první. Server
   to drží stejně (`functions/api/sady/[id].js`).
8. **Generovaný právní balík v tomhle sezení nespustil stavitel.** Spuštění
   Pythonu bylo v prostředí odmítnuto (`python3 vykresli_zasady.py`
   i `kontrola_manifestu.py`); do generovaných souborů se proto nesahalo
   ani ručně. Manifest se změnil o jeden prázdný slot (`cena_dph`), který
   generátor vykresluje stejně jako jeho absenci — a dokumenty přegeneruje
   krok „Kontrola manifestu proti kodu“ v CI.

---

# Specifikace — build 10 (Google Play a záznam v obchodě)

Běžící Pneusklad (sklad sad se štítky, objednávkový kalendář, Připravit kola, sezónní přehled, tým, předplatné s objednávkou na fakturu) se stane instalovatelnou aplikací v Google Play (Trusted Web Activity, balíček cz.simtegen.pneusklad). V aplikaci se předplatné kupuje přes Google Play, na webu dál fakturační objednávkou. Obojí zapisuje totéž zaplacené období `predplatne.plati_do` provozovny. Vznikne i kompletní záznam v obchodě: texty, piktogram ikony, 6 snímků z ukázkových dat, formulář Bezpečnost údajů a ukázka bez přihlášení, kterou Google vyžaduje. Ceník se přepíše na schválený (Standard 129 Kč, Sezónní vstup 790 Kč, Větší provozovna 229 Kč, 30 dní zdarma). Jádro appky se nepřestavuje.

## Placená hodnota (proč přijde druhý nákup)
Platí se za evidenci uložených kol, která je jediné místo, kde servis ví, čí kola leží ve které polici, co má zítra sundat a koho před sezónou obvolat. Druhý nákup přijde sám: kola leží v regálu dál, přezouvá se každé jaro i podzim a předplatné z Google Play se samo obnovuje. Prodej v Play navíc řeší nejslabší místo zadání, totiž kanál. Mobilní mechanik hledá nástroj v obchodě na telefonu, ne na webu.

## Design (obrazovky, navigace, stavy)
BARVA PRODUKTU: zůstává rumělka #c2410c (tmavý režim #f07a45). Je to barva zahřáté pryže a výstražných štítků v dílně, appka a štítky ji u zákazníka už nesou a ikona Play se z ní vykreslí. Kontrast na papíře #f6f4ef vychází asi 4,7:1 (≥ 4,5). Nic v produkt.css se nemění.

PIKTOGRAM (play/piktogram.svg, viewBox 0 0 24 24, bez barev, bez tloušťky, bez textu): pneumatika z boku. circle r=9 (bok pláště), circle r=5.5 (ráfek), circle r=1.6 (náboj), 12 krátkých radiálních <line> od r=9 dovnitř na r=7.6 (běhoun). Vše leží do 9 od středu (12,12), celkem 15 tvarů. V <g class="detail"> je visačka uskladnění, předmět, který Pneusklad tiskne: rect x=16 y=17.5 w=5.5 h=3.5 (nejvzdálenější roh 13,1 od středu), provázek <line> (17,17.5)→(15.6,15.9) a otvor circle r=0.5.

APLIKACE v manifestu: nazev „Pneusklad: uskladnění pneu“ (26 znaků), kratky_nazev „Pneusklad“, popis „Evidence uskladněných pneu, štítky a objednávky pro malé pneuservisy.“ (69 znaků), kategorie BUSINESS (je to nástroj provozovny, ne aplikace pro motoristy, ti by ji z kategorie Auta instalovali omylem), hlavni_veta „Kde leží čí kola a co zítra sundat“. dlouhy_popis (asi 1 100 znaků, jen pravda z produktu): „Pneusklad je evidence uskladněných pneumatik pro malé a mobilní pneuservisy. Ke každé sadě zapíšete zákazníka, registrační značku, rozměr, dezén, hloubku dezénu všech čtyř kol a místo v regálu. Aplikace sadě přidělí kód a vytiskne štítek na vaší tiskárně štítků (role 100 × 50 mm) nebo na archy A4.\n\nObjednávkový kalendář plní mechanik: zapíše, kdo kdy přijede a co se bude dělat. Den předem aplikace ukáže seznam kol, která je potřeba připravit, i s místem ve skladu. Seznam si můžete poslat e-mailem nebo uložit jako připomínku do kalendáře v telefonu.\n\nPřed sezónou uvidíte, koho obvolat na přezutí, které sady mají méně než 4 mm dezénu a kdo nemá zaplacené uskladnění.\n\nDo servisu se mohou přihlásit i kolegové s oprávněním správce, mechanik nebo jen čtení. Přihlašujete se odkazem z e-mailu, bez hesla. Data jsou uložena v Evropské unii a kdykoli si je v aplikaci stáhnete nebo smažete.\n\nPrvních 30 dní je zdarma. Potom předplatné za celou provozovnu přes Google Play: Standard 129 Kč měsíčně, Větší provozovna 229 Kč měsíčně, nebo Sezónní vstup 790 Kč na 6 měsíců. Bez registrace si můžete vyzkoušet ukázku s vymyšlenými daty.“

SNÍMKY (pořadí vypráví den mechanika, snímky se fotí v ukázkovém účtu z play/ukazka.json):
1. obrazovka-dnes · štítek „Dnes“ · titulek „Ráno víte, co sundat z regálu“
2. obrazovka-sklad · „Sklad“ · „Každá sada má kód a místo v regálu“ · kliky ["[data-obrazovka=obrazovka-sklad]"]
3. obrazovka-sada · „Detail sady“ · „Hloubka dezénu všech čtyř kol“ · kliky ["[data-obrazovka=obrazovka-sklad]", "#sklad-seznam .radek"]
4. obrazovka-objednavky · „Objednávky“ · „Celý týden dílny na jednom místě“ · kliky ["[data-obrazovka=obrazovka-objednavky]"] · tablet: true
5. obrazovka-priprava · „Připravit kola“ · „Seznam kol na zítřek i s pozicí“ · kliky ["#dlazdice-priprava"]
6. obrazovka-prehled · „Sezóna“ · „Koho obvolat před sezónou“ · kliky ["#dnes-na-prehled"] · tablet: true

NAVIGACE: beze změny, 4 položky Dnes · Sklad · Objednávky · Nastavení. Hlavní hodnota je na 1–2 klepnutích: Dnes → „Nová sada na uskladnění“ → průvodce → tisk štítku. Předplatné je 1 klepnutí z pruhu na Dnes, nebo 2 klepnutí přes Nastavení → Předplatné. APLIKACE BEZ ADRESNÍHO ŘÁDKU: šipka Zpět v hlavičce (#hlavicka-zpet) dnes volá history.back(). Když historie v appce chybí (aplikace otevřená rovnou na podobrazovce, nebo po návratu z právních stránek), musí otevřít nadřazenou obrazovku (Detail sady → Sklad, Předplatné → Nastavení, ostatní → Dnes), nikdy nesmí appku zavřít. Právní stránky už nesou odkaz „Zpět do aplikace“. Hlavní obrazovky jsou v menu a nic nespoléhá na systémové tlačítko Zpět.

OBRAZOVKY (obří číslo · hlavní akce · sekce · oborový detail · stavy prázdný / načítání / chyba):
1) Úvod a přihlášení: obří „129 Kč“ (nejlevnější měsíční varianta, ze serveru) s ceníkem přesně podle schválení pod ním: „Standard: 129 Kč / firma / měsíc“, „Sezónní vstup: 790 Kč / sezóna (6 měsíců)“, „Větší provozovna: 229 Kč / firma / měsíc“, a „Prvních 30 dní zdarma, bez karty.“ (věta „Platí se na fakturu“ se odstraní všude). Hlavní akce v .lista-dole je dál „Začít zdarma“. Sekce 01 Co to umí, 02 Přihlášení, 03 Bez registrace s povinným `<button type="button" class="tlacitko" data-ukazka>Vyzkoušet ukázku</button>` a větou „Dočasný účet s vymyšlenými daty na 24 hodin.“ Detail: rozměr 205/55 R16 a kód A1-04 v ukázkových řádcích. Prázdný stav: bez ceníku se karta ceny nevykreslí. Načítání: #obrazovka-nacitani + .kostra. Chyba: .hlaska.chyba pod tlačítkem („Odkaz se nepodařilo odeslat, zkuste to prosím znovu.“, „Ukázku se nepodařilo spustit.“).
2) Dnes, 3) Sklad, 4) Detail sady, 5) Objednávky, 6) Nová objednávka, 7) Připravit kola, 8) Sezónní přehled, 9) Zákazníci, Zákazník, Nová sada: beze změny z buildu 7 (obří čísla: kol na zítra · sad v regálu · kód sady · týdenní pás .tyden · kol zbývá připravit · obvolat/pod 4 mm/nezaplaceno; oborové detaily: rozměr, dezén, hloubky 4 kol v mm, pozice A1-04, týden). Mění se jen to, že pruh předplatného na Dnes v aplikaci vede na nákup přes Play a nezmiňuje fakturu. Jejich prázdné, načítací a chybové stavy zůstávají, jak je build 7 postavil. V ukázkovém účtu je naplní play/ukazka.json, takže žádný snímek nefotí prázdnou obrazovku.
10) Nastavení: sekce 05 „Ukázková data“ zůstává a volá nový /api/ukazkova-data. Řádek Předplatné ukazuje stav a u zakoupení přes Play doplní „· Google Play“. V aplikaci se v patičce skryjí odkazy Obchodní podmínky a Odstoupení od smlouvy (`data-objednavka`, oba popisují placení fakturou). Zásady zpracování a Zpracovatelská smlouva zůstávají.
11) Předplatné (mění se nejvíc): obří číslo je stav účtu, „Zbývá 12 dní“ / „Aktivní do 30. 4. 2027“ / „Vypršelo 2. 9. 2026“ se .znacka (uspech/pozor/chyba) a řádky „Uskladněné sady 38 · Zákazníci 31“. Sekce: 01 Stav účtu; 02 Ceník, doslova schválený text včetně „obsahuje: …“ u Standardu; 03 Nákup. V aplikaci je to `<div data-predplatne-play></div>` (play.js vykreslí nákup přes Google Play, podmínky, automatické obnovení a zrušení). Na webu je to stávající fakturační karta s délkou, cenou PŘED tlačítkem, fakturačními údaji, „jako spotřebitel“ a souhlasem § 1837 l). Karta, sekce 04 Objednávky provozovny (stavy „čeká na fakturu“) a .lista-dole #pred-akce s tlačítkem „Objednávka zavazující k platbě“ nesou `data-objednavka`. V aplikaci je jediná hlavní akce tlačítko Google Play, na webu „Objednávka zavazující k platbě“. Obojí je jen pro správce (.jen-spravce), protože nákup patří provozovně. Mechanik vidí hlášku „Předplatné kupuje správce účtu.“ Oborový detail: počet sad v regálu, tedy to, za co se platí. Prázdný stav: .prazdno „Stav předplatného se nepodařilo zjistit“ s tlačítkem „Zkusit znovu“. Načítání: #pred-kostra. Chyba: .hlaska.chyba (odmítnutý nebo neověřený nákup: „Nákup se nepodařilo ověřit, nic vám nebylo účtováno navíc. Zkuste to prosím znovu.“). Úspěch: .toast „Předplatné je aktivní do …“.

TABLET A NOTEBOOK: styl.css dává levý pruh (tablet) a boční menu (notebook). Obsah jde do .mrizka: Dnes s4 stav dne + s8 hledání a dnešní objednávky. Sklad s4 obří číslo a filtr + s8 tabulka (.tabulka-obal: kód · SPZ · rozměr · pozice · hloubky). Objednávky s8 týden + s4 termíny vybraného dne. Předplatné s5 stav účtu + s7 ceník a nákup. Sezónní přehled jsou tři sloupce .s4 (obvolat · pod 4 mm · nezaplaceno). Nic se jen neroztahuje z telefonu.

## Plán
1. Kolize jmen: stávající `functions/api/ukazka.js` (naplnit/smazat ukázková data ve vlastním účtu) přejmenovat beze změny logiky na `functions/api/ukazkova-data.js` a v `web/index.html` přepnout obě volání (`nast-ukazka-naplnit`/`-smazat`) na `/api/ukazkova-data`. Cestu `/api/ukazka` pak převezme šablonový 24h ukázkový účet (needitovat).
2. `cenik.js`: přepsat na schválený ceník. Varianty {klic: "standard", nazev: "Standard", cena: 129, jednotka: "firma / měsíc", mesice: 1, popis: doslova „Evidence uskladněných pneu s tiskem štítků (vlastní tiskárna štítků), objednávkový kalendář s připomínkou pro mechanika, neomezený počet záznamů, 1–2 přihlášení. Kredit na štítky nad rámec běžné spotřeby se dokupuje zvlášť.“, vychozi}, {klic: "sezona", nazev: "Sezónní vstup", cena: 790, jednotka: "sezóna (6 měsíců)", mesice: 6} a {klic: "vetsi", nazev: "Větší provozovna", cena: 229, jednotka: "firma / měsíc", mesice: 1}. Ke každé variantě `play_produkt` = ID předplatného v Play Console (pneusklad_standard, pneusklad_sezona, pneusklad_vetsi), pokud šablonový play_nakupy.js nečte ID odjinud. Zdvojené „Kč Kč“ ze zadání se zobrazí jednou.
3. `functions/api/objednavka.js` (webová faktura): cena = varianta.cena × počet období. Měsíční varianty nabízejí 1/3/6/12 měsíců, Sezónní vstup jen 1 sezónu (6 měsíců, 790 Kč). Uložený název a cena starých objednávek (Sólo/Základ/Tým) zůstávají v historii beze změny, migrace není potřeba.
4. Zkušební doba 30 dní: `predplatne.js` ZKUSEBNI_DNI = 30 a `zkusebni_dni: 30` v manifestu. Servisy s uloženým `nastaveni_servisu.zkusebni_do` si podrží své datum (stavPredplatneho ho čte přednostně).
5. Ukázková data s relativními daty, aby snímky nikdy nezestárly: `spolecne.js` pripravObjednavku přijme volitelné `posun_dni` (0 = dnes, 1 = zítra) místo `den`. POST /api/sady přijme volitelné `prijato_pred_dni` (0–400) pro datum příjmu. Obojí je jen přidané, stávající volání se nemění.
6. `play/ukazka.json`: kroky POST /api/sady (12 sad 6 vymyšlených motoristů jako v dnešním seedu: telefony 601 000 1xx, SPZ 1AB 2345 …, rozměry 205/55 R16, 225/65 R16C, hloubky 2,8–7,3 mm, pozice A1-03…C1-02, část nezaplacená, část pod 4 mm), uloz sada_id. Dál POST /api/objednavky s posun_dni 0/1/1/2/4 pro výdej, přezutí a průjezd s opravou defektu a POST /api/objednavky/{id} pripraveno u jedné zítřejší, ať stupnice na Dnes nestojí na nule. Případný e-mail jen @example.cz. Naplní všech 6 obrazovek ze `snimky`.
7. `data-manifest.json`: sekce `aplikace` (balicek přesně „cz.simtegen.pneusklad“, nazev, kratky_nazev, popis, otisky [], dlouhy_popis, kategorie BUSINESS, hlavni_veta, snimky podle designu). Ke všem položkám `ukladame` doplnit play_typy, play_ucely a play_volitelne: uzivatele [email] (ucet); prihlasovaci_odkazy [email] (ucet, bezpecnost); relace [] ; nastaveni_servisu [jmeno, telefon, adresa] (funkce, volitelne); zakaznici [jmeno, telefon, email, obsah_uzivatele] (funkce); sady [osobni_jine, obsah_uzivatele, financni_jine] (funkce); pohyby [obsah_uzivatele] (funkce); objednavky [kalendar, jmeno, obsah_uzivatele] (funkce); clenove [email] (ucet, funkce, volitelne); predplatne a platby [historie_nakupu] (funkce, ucet); objednavky_predplatneho [jmeno, adresa, historie_nakupu, financni_jine] (funkce, ucet, volitelne, jen webová faktura). Nová entita play_nakupy podle zadání, služba Google Play (androidpublisher.googleapis.com), cookie „aplikace“ (1 rok) a zkusebni_dni 30.
8. `web/index.html`: `data-objednavka` na fakturační kartu (sekce 03), sekci 04 Objednávky provozovny, #pred-akce a odkazy Obchodní podmínky a Odstoupení od smlouvy v patičce. Odstranit „Platí se na fakturu“ z úvodu. Pruh předplatného a texty mimo kartu nesmí zmínit fakturu ani převod. Přidat `<div data-predplatne-play></div>` do sekce 03 Předplatného uvnitř .jen-spravce. Na přihlášení přidat sekci 03 s tlačítkem data-ukazka. Ceník vykreslit z nových polí (cena, jednotka, popis). U #hlavicka-zpet doplnit záložní cestu na nadřazenou obrazovku, když history.state chybí. Na Předplatném přidat .toast úspěchu a chybovou hlášku nákupu.
9. `play/piktogram.svg` podle designu, `play/co_je_noveho.txt`: „Pneusklad je nově aplikace v Google Play. Předplatné si koupíte přímo v aplikaci přes Google Play a obnovuje se samo. Na přihlašovací obrazovce si bez registrace vyzkoušíte ukázku s vymyšlenými daty. Platí nový ceník: Standard 129 Kč měsíčně, Větší provozovna 229 Kč měsíčně, Sezónní vstup 790 Kč na 6 měsíců. Nové účty mají 30 dní zdarma.“
10. Spustit `python vykresli_zasady.py` a `python vykresli_aplikaci.py` (manifest.webmanifest, ikony, sw.js, offline.html, .well-known/assetlinks.json, play/zaznam.json, play/BEZPECNOST_DAT.md, web/ukazka.json, odkazy v index.html), nic z toho needitovat ručně. Pak `python kontrola_manifestu.py`.
11. `uat/scenare.json`: přidat scénáře z akceptace (ceník v /api/ja, příprava přes posun_dni, ukázková data přes /api/ukazkova-data, oddělení účtu B). Stávající scénáře nechat.
12. README.md: sekce pro majitele „Google Play“ (založit 3 předplatná v Play Console s cenami 129 Kč/měs., 229 Kč/měs. a 790 Kč/6 měs. a ID z cenik.js, doplnit otisk do aplikace.otisky, servisní účet pro ověření nákupu). SPEC.md doplnit o build 8.

## Soubory
- cenik.js
- predplatne.js
- spolecne.js
- functions/api/ukazkova-data.js (přejmenovaný z functions/api/ukazka.js)
- functions/api/objednavka.js
- functions/api/sady.js
- functions/api/objednavky.js
- web/index.html
- data-manifest.json
- play/piktogram.svg
- play/ukazka.json
- play/co_je_noveho.txt
- uat/scenare.json
- README.md
- SPEC.md
- generované (needitovat): web/zasady.html, web/podminky.html, web/zpracovatelska-smlouva.html, web/odstoupeni-formular.html, ZAZNAM_O_ZPRACOVANI.md, POSTUP_PRI_INCIDENTU.md, web/manifest.webmanifest, web/sw.js, web/offline.html, web/ikona-192.png, web/ikona-512.png, web/ikona-maskable-512.png, web/.well-known/assetlinks.json, web/ukazka.json, play/zaznam.json, play/BEZPECNOST_DAT.md
- doplní stavba ze šablony (needitovat): web/play.js, functions/api/ukazka.js, functions/api/play.js, play_nakupy.js, db/migrace/0900_play_nakupy.sql

## Rizika
1. Kolize `/api/ukazka`: šablonový soubor by přepsal stávající „Naplnit/Smazat ukázková data“ a tlačítka v Nastavení by tiše přestala fungovat. Řeší krok 1 (přesun na /api/ukazkova-data). Ověřit, že stará cesta nikde nezůstala.
2. Nákup musí patřit provozovně: middleware čte předplatné podle servis.id. Kdyby šablonový play_nakupy.js zapsal plati_do na uzivatel.id přihlášeného mechanika, servis by zaplatil a zůstal v režimu čtení. Proto je nákup jen pro správce. Stavba ověří, které id play.js zapisuje, a otestuje to dvěma účty přes Tým.
3. Pravidla Google Play: jakákoli zmínka o faktuře nebo převodu v aplikaci znamená stažení z obchodu. Podle vygenerovaných obchodních podmínek (čl. 3) se platí fakturou, proto jsou odkazy na podmínky a formulář odstoupení v aplikaci skryté. Generátor vykresli_zasady.py patří šabloně a podmínky zatím nákup přes Google Play nepopisují. Doporučuji ho doplnit v šabloně a ručně ho needitovat.
4. Schválený ceník má dvě nesrovnalosti, které appka zobrazí doslova: Sezónní vstup (790 Kč za 6 měsíců) je dražší než 6× Standard (774 Kč). Věta „Kredit na štítky … se dokupuje zvlášť“ slibuje produkt, který appka nemá: štítky se tisknou bez limitu a kredit nejde koupit. Do záznamu v obchodě proto kredit nejde. Majitel by měl větu buď stáhnout, nebo kredit objednat jako další stavbu.
5. Ceny v Google Play nastavuje majitel v Play Console a musí sedět s cenik.js. Google si z předplatného bere poplatek (obvykle 15 %). Bez servisního účtu Google Play nejde nákup ověřit a předplatné se nezapíše.
6. Prázdné `otisky`: do doplnění otisku z Play Console (Integrita aplikace) poběží aplikace s adresním řádkem. Proto musí každá obrazovka mít vlastní cestu zpět, ne jen history.back().
7. Změna zkušební doby ze 14 na 30 dní a nového ceníku se týká jen nových účtů a objednávek. Stávající platící a zkoušející servisy si drží své plati_do / zkusebni_do. Migraci ověřit na náhledové D1.
8. Bezpečnost údajů je prohlášení vůči Googlu: play_typy musí sedět s tím, co appka opravdu ukládá. Každá nová tabulka v budoucnu = nová položka s play_typy, jinak CI shodí build.
9. Ukázková data jsou veřejná (web/ukazka.json). Jsou vymyšlená (blok 601 000 1xx, nevydávané řady SPZ, @example.cz) a nesmí do nich přijít nic z produkční databáze zákazníka.

## Jak ověřit
Na náhledovém nasazení:
1. Telefon ~390 px, prohlížeč, odhlášeně: úvod ukazuje obří „129 Kč“ a pod ním doslova tři varianty schváleného ceníku a „Prvních 30 dní zdarma, bez karty.“. Nikde není věta o faktuře. Je vidět tlačítko „Vyzkoušet ukázku“.
2. Klepnout „Vyzkoušet ukázku“: otevře se Dnes s čísly (kol na zítra > 0). Sklad má 12 sad s pozicemi A1-03…C1-02, Připravit kola ukazuje zítřejší kola s pozicí a Sezóna má obvolat / pod 4 mm / nezaplaceno. Po návratu na přihlášení se ukázka dá spustit znovu.
3. Přihlásit se vlastním účtem, Nastavení → Ukázková data → Naplnit, pak Smazat: obojí funguje (nová cesta /api/ukazkova-data).
4. Na webu jako správce: Předplatné → vybrat Sezónní vstup → vidět „790 Kč“ před tlačítkem „Objednávka zavazující k platbě“, odeslat → objednávka v historii. Mechanik tlačítko nevidí.
5. Nainstalovat interní testovací verzi z Play na Android telefon: na Předplatném NENÍ fakturační karta, historie objednávek ani tlačítko „Objednávka zavazující k platbě“. Patička nemá Obchodní podmínky ani Odstoupení. Je tam nákup přes Google Play. Testovacím účtem koupit Standard → po návratu Předplatné ukazuje „Aktivní do …“, na webu se stejným účtem je totéž datum.
6. V aplikaci projít Detail sady → Zpět → Sklad a otevřít Zásady → „Zpět do aplikace“. Nikde není potřeba systémové tlačítko Zpět a appka se šipkou nezavře.
7. Na tabletu (820 px) a notebooku (1440 px): levý pruh / boční menu, Předplatné ve dvou sloupcích, Sklad jako tabulka.
8. Lokálně `python vykresli_zasady.py && python vykresli_aplikaci.py && python kontrola_manifestu.py` → „Manifest souhlasí…“. play/BEZPECNOST_DAT.md uvádí E-mail jako povinný a Historii nákupů. `python uat_kontrola.py` projde všechny scénáře.

## Akceptační scénáře (CI je spustí proti API)
- Nepřihlášený návštěvník — načte GET /api/ja — musí vidět varianty Standard 129 Kč, Sezónní vstup 790 Kč a Větší provozovna 229 Kč a zkušební dobu 30 dní.
- Mechanik účtu A — uskladní sadu přes POST /api/sady s pozicí v regálu — musí ji najít hledáním podle SPZ i podle pozice a vidět její kód pro štítek.
- Mechanik účtu A — zapíše objednávku k uskladněné sadě s posun_dni 1 — musí ji v GET /api/priprava na zítřek vidět i s kódem sady a pozicí v regálu.
- Správce účtu A — naplní účet přes POST /api/ukazkova-data a pak ukázková data smaže — musí po naplnění vidět ukázkové sady ve skladu a po smazání už žádnou z nich, zatímco vlastní sada zůstane.
- Správce účtu A — odešle webovou objednávku varianty Sezónní vstup — musí v ní vidět cenu 790 Kč a 6 měsíců a stav čekající na platbu.
- Účet B — požádá o sadu, přípravu a objednávku předplatného účtu A — nesmí uvidět žádnou sadu, jméno motoristy ani objednávku účtu A (404 nebo prázdný seznam).

_Schvaluje se přes ARGA (simtegen_approve_spec) nebo na mini PC._

## Co se při stavbě buildu 10 oproti specifikaci změnilo

1. **V aplikaci jde koupit jen Standard (129 Kč / měsíc).** Šablonový
   modul (`play_nakupy.js`, `web/play.js`, needitují se) zná jen ID
   `predplatne_mesic` a `predplatne_rok`. Sezónní vstup a Větší provozovnu
   Google Play v aplikaci neprodá, dokud šablona nepozná víc produktů. Na
   webu jdou objednat fakturou všechny tři varianty. Úplný popis v obchodě
   a „Co je nového“ proto slibují jen Standard přes Google Play. README
   říká majiteli, co založit v Play Console.
2. **Ceník na obrazovce Předplatné je jen na webu** (`data-objednavka`).
   V aplikaci by ukazoval varianty, které tam koupit nejde, tedy odkaz
   k placení jinde. Cenu a podmínky v aplikaci ukazuje panel Google Play.
   Ze stejného důvodu ukazuje úvodní obrazovka v aplikaci jen Standard.
   Varianty bez `v_aplikaci` v `cenik.js` nesou `.jen-web` a v aplikaci
   jsou skryté stejně bezpečně jako `[data-objednavka]`. Na webu je ceník
   na úvodu celý.
3. **Nákup v aplikaci vidí jen majitel účtu,** ne každý správce.
   `/api/play` připisuje nákup na `data.uzivatel.id`, předplatné ale čte
   middleware podle `servis.id`. Pozvaný správce by zaplatil za svůj
   prázdný účet. Pozvaní vidí větu, kdo kupuje.
4. **Žádné `play_produkt` v `cenik.js`:** ID produktů drží šablona.
5. **Oprava navíc: limit 40 sad ve zkušebce už neplatí pro zaplacený
   servis.** `zkontrolujLimit` hlídal jen sloupec `plan`, jenže faktura
   i Google Play zapisují jen `predplatne.plati_do`. Servis by zaplatil
   a po 40 sadách dostal „Ve zkušebním režimu…“, přestože Standard slibuje
   neomezený počet záznamů.
6. **Sklad na tabletu je seznam ve sloupci s8, ne tabulka.** Řádky nesou
   zaškrtávátko pro dávkový tisk štítků a tlačítko detailu. Druhé vykreslení
   jako tabulka by bylo druhé místo, které se může rozejít. Sezónní přehled
   používá `.dva-sloupce`, ne pevné `.s4`: na tabletu 820 px by tři sloupce
   měly asi 190 px a tlačítka Zavolat / Sada / Zaplaceno by se nevešla.
7. **Visačka v piktogramu je natočený pětiúhelník (`polyline`), ne `rect`.**
   Obdélník ze specifikace ležel přes bok pláště a validátor přidává
   k poloměru rezervu 0,8. Visačka teď visí mimo plášť do 13,85 od středu.
8. **Akceptační scénář objednávky přepsán na nový ceník** (`standard`,
   `sezona`). Starý počítal se zrušenými variantami `zaklad` a `solo`
   a spadl by na 422. Ukázková data hledají `q=Kucerova` bez diakritiky,
   protože UAT klient adresu nekóduje a server hledá bez diakritiky.
9. **Generátory spustil systém, ne stavitel.** Stavitelovi prostředí
   spuštění Pythonu i Node odmítlo. Vygenerované soubory proto vytvořil
   systém před kontrolou (`vykresli_zasady.py`, `vykresli_aplikaci.py`)
   a jsou v commitu: zásady a právní dokumenty, `ZAZNAM_O_ZPRACOVANI.md`,
   `web/manifest.webmanifest`, `web/sw.js`, `web/offline.html`, ikony
   `web/ikona-*.png`, `web/.well-known/assetlinks.json`, `web/ukazka.json`,
   `play/zaznam.json`, `play/BEZPECNOST_DAT.md`. V `index.html` jsou odkaz
   na manifest, registrace service workeru a `<html data-aplikace>`. Ručně
   se do nich nesahalo.
10. **Migrace ze šablony v pracovní kopii.** Šablona po commitu znovu
   nasype `0002_predplatne.sql`, `0004_platby.sql` a `0005_objednavky.sql`.
   `.gitignore` je drží mimo repo, ale lokální kontrola je aplikuje
   a spadne na `table objednavky already exists`. Přitom padá i tvorba
   snímků do obchodu, protože bez API nevznikne žádný snímek. Kopie
   se smazaly, v repu jsou jen produktové migrace `0001`–`0007` a `0900`.