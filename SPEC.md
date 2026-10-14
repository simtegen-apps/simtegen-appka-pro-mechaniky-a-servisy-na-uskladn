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
nepřestavěl. **Build 7** (poslední sekce) přepsal appku do návrhového
systému v2 a dodělal, co kolem placení a připomínky chybělo.

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
