# Specifikace — build 14

Build 13 mění jen úvodní stránku hotového Pneuskladu na https://pneusklad.simtegen.com. Dostane nový <title>, novou meta description (vygenerovanou z manifestu), H1 „Víte, kde má který zákazník uložené pneu?“ a pod ním tři krátké body: evidence pneu, tisk štítků, objednávky s připomínkou. Cena 129 Kč měsíčně za firmu a věta „Prvních 30 dní zdarma, bez karty.“ budou vidět bez posouvání na telefonu i na notebooku. Funkce, ceny, API, migrace, datový model ani přihlašovací formulář se nemění.

## Placená hodnota (proč přijde druhý nákup)
Servis platí 129 Kč měsíčně za firmu za evidenci, kde leží čí kola, za štítky ze své tiskárny a za objednávky s připomínkou den předem. Druhý nákup přichází, protože pneu leží v regálu přes sezóny a evidenci potřebuje při každém přezouvání (jaro i podzim, každý rok). Tahle změna platenou hodnotu nemění, jen ji úvodní stránka a vyhledávač podají dřív a jasněji.

## Design (obrazovky, navigace, stavy)
Návrhový systém v3 „Papír a výkres“ zůstává beze změny. Barva produktu zůstává #c2410c (pálená oranžová, barva pryže a výstražných štítků v dílně). Kontrast na papíře #f6f4ef vychází asi 6,7:1, tedy splňuje ≥ 4,5:1. Tmavá varianta #f07a45 zůstává v web/produkt.css.

MĚNÍ SE JEN JEDNA OBRAZOVKA: Úvod a přihlášení (#obrazovka-prihlaseni)
- Typ: přehled se třemi sekcemi. Ostatní obrazovky (Dnes, Sklad, Objednávky, Nastavení, detaily, Předplatné) zůstávají přesně jak jsou, navigace dál 4 položky.
- Proč obrazovka existuje: cizí návštěvník během pěti vteřin pozná, co produkt dělá, za kolik, a nechá si poslat přihlašovací odkaz.
- Hlavní akce: tlačítko „Začít zdarma“ (#poslat-odkaz) v .lista-dole, beze změny. Vedlejší akce „Vyzkoušet ukázku“ (data-ukazka) zůstává.

Pořadí na telefonu (jeden sloupec, vše do 1. obrazovky 360×740 nad ohybem až po cenu a zkušební dobu):
1. `<h1 class="titulek-velky">Víte, kde má který zákazník uložené pneu?</h1>`. Nahrazuje `<p class="titulek-velky">Kde leží čí kola.</p>`. Dosavadní dlouhý odstavec pod ním odpadá.
2. Tři krátké body. Je to `ul.seznam` se třemi `.radek`, každý s tučným názvem a jedním řádkem vysvětlení. Bez nadpisu „Co to umí“, aby se vešly nad ohyb.
   - **Evidence pneu**: kdo má jakou sadu a kde v regálu, sezónu po sezóně.
   - **Tisk štítků**: kód sady na štítek z vaší tiskárny štítků.
   - **Objednávky s připomínkou**: den předem víte, která kola sundat z regálu.
   Druhý řádek prvního bodu nese důvod platit i podruhé (evidence přes sezóny).
3. Karta ceny (#uvod-cena, .karta.vykres), hned pod body. Obsahuje štítek „Cena od“, obří číslo z window.CENIK přes /api/ja (dnes 129 Kč) a text „měsíčně za firmu“ (dřív „za celou provozovnu“, sjednoceno s textem markeťáka). Odstavec #uvod-zkusebni se přesune DO karty, takže „Prvních 30 dní zdarma, bez karty.“ stojí přímo pod cenou. V HTML dál nebude žádná částka.
4. Sekce „Přihlášení“: e-mail, nápověda a věta o datech v EU, beze změny.
5. Sekce „Bez registrace“ s tlačítkem data-ukazka, beze změny.
6. Nová sekce „Ceník“ až pod přihlášením. Sem se přesunou řádky všech variant (#uvod-cenik, #uvod-cenik-obsah) se stejnými ID, takže vykresliUvod() funguje beze změny. Pravidlo Google Play (v aplikaci jen varianty koupitelné přes Play) dál řeší stávající kód.

Tablet a notebook (od 768 px):
- Obsah obrazovky se zabalí do `.mrizka` (styl.css, 12 sloupců).
- Vlevo `.s7`: H1 a tři body (H1 v clamp velikosti 3,75rem).
- Vpravo `.s5`: karta ceny se zkušební dobou, pod ní Přihlášení a tlačítko „Začít zdarma“.
- Pod oběma sloupci přes celou šířku: Bez registrace a Ceník.
- Cena i e-mailové pole jsou tak na notebooku 1366×768 i tabletu 768×1024 v první obrazovce. Není to roztažený telefon.

Stavy úvodu:
- Načítání: stávající #obrazovka-nacitani s .kostra. H1 a body jsou statické v HTML, takže je vyhledávač i pomalé připojení vidí hned.
- Prázdný stav (ceník nedorazil): karta ceny se nevykreslí (karta.hidden jako dnes), H1, body a přihlášení zůstanou. Žádný prázdný rám.
- Chyba: .zprava / .hlaska.chyba pod polem e-mailu, jako dosud.
- Offline: řeší SimteGen.kdoJsem() / SimteGen.offline() beze změny.

Nadpisy pro vyhledávač:
- Hlavička aplikace (`<h1 id="hlavicka-titulek">Pneusklad</h1>`) je vzor návrhového systému pro všechny obrazovky a zůstává.
- Na úvodu tak budou dvě H1. Google to připouští. Hlavní, největší a obsahová je ta markeťákova.
- Sekční nadpisy zůstávají H2 (.sekce-titulek).

Aplikace z Google Play: úvod v ní vypadá stejně. Cenu ukazovat smí. Fakturační objednávka (data-objednavka) se úvodu netýká.

## Plán
1. data-manifest.json: přepsat kořenové pole `popis` na přesně „Evidence uskladněných pneu, tisk štítků a objednávkový kalendář s připomínkou pro malé a mobilní pneuservisy. 129 Kč měsíčně za firmu.“ (134 znaků, limit 160). Pole `produkt` (og:title) a celou sekci `aplikace` (Play záznam) nechat beze změny, zadání je jen web a vyhledávače. Entity, `ukladame`, `agregaty`, služby ani cookies se nemění.
2. Spustit `python vykresli_seo.py`. Přepíše blok `<!-- SEO -->` v web/index.html (meta description, og:description), robots.txt a sitemap.xml. Blok needitovat ručně, CI ho porovnává. Pokud generátor v tomto prostředí nejde spustit, musí ho pustit člověk před CI.
3. web/index.html `<head>`: `<title>` změnit na „Evidence uskladněných pneu pro malé pneuservisy | Pneusklad“.
4. web/index.html, #obrazovka-prihlaseni:
   - `<p class="titulek-velky">Kde leží čí kola.</p>` nahradit `<h1 class="titulek-velky">Víte, kde má který zákazník uložené pneu?</h1>` a odstranit dlouhý odstavec pod ním.
   - Sekci „Co to umí“ nahradit třemi body bez nadpisu: Evidence pneu / Tisk štítků / Objednávky s připomínkou, každý s jedním řádkem vysvětlení.
   - Kartu #uvod-cena přesunout hned pod body, text „měsíčně za celou provozovnu“ změnit na „měsíčně za firmu“ a #uvod-zkusebni přesunout dovnitř karty pod číslo.
   - #uvod-cenik a #uvod-cenik-obsah přesunout do nové sekce „Ceník“ za „Bez registrace“.
   - Obsah zabalit do `.mrizka` se sloupci `.s7` / `.s5` pro ≥768 px. Jen existující třídy, žádné nové barvy ani rozměry.
   - JS (vykresliUvod, posliOdkaz, volání POST /api/navsteva {stranka:"uvod"}, kdoJsem) se nemění, ID zůstávají.
5. Nesahat na: cenik.js, functions/**, db/migrace/**, functions/api/_middleware.js, 0910_zdroje.sql, web/simtegen.js, web/play.js, web/styl.css, .github/. Přihlašovací formulář zůstává na úvodu.
6. play/co_je_noveho.txt přepsat (do 500 znaků, vykat), například: „Úvodní stránka je přehlednější: hned nahoře vidíte, co aplikace umí (evidence pneu, tisk štítků, objednávky s připomínkou), kolik stojí a že prvních 30 dní je zdarma. Ve funkcích ani cenách se nic nemění.“
7. SPEC.md: aktualizovat odstavec 1) Úvod a přihlášení na nové pořadí a nadpisy.
8. Zkontrolovat pomocí `python kontrola_manifestu.py`, `python vizualni_kontrola.py` a `python uat_kontrola.py` (popř. CI), že SEO blok, aplikace a UAT jsou zelené.

## Soubory
- data-manifest.json
- web/index.html
- web/robots.txt
- web/sitemap.xml
- play/co_je_noveho.txt
- SPEC.md

## Rizika
- **Částka „129 Kč“ ve dvou místech.** V meta description je ručně napsaná, ale jediný zdroj ceny je cenik.js. Při budoucí změně ceny se musí ručně upravit i `popis` v manifestu, jinak vyhledávač ukáže starou cenu. Patří to do README k ceníku.
- **Dvě H1 na úvodu.** Hlavička aplikace „Pneusklad“ je H1 a ve zdroji stojí dřív. Google to toleruje, ale SEO audit může hlásit „více H1“. Pokud by to markeťákovi vadilo, další krok je převést nadpis hlavičky na `role="heading"` s úpravou v návrhovém systému. To je mimo rozsah „jen texty“.
- **Nadpis nad ohybem na úzkých telefonech.** Na telefonu 320 px se H1 v clamp velikosti zalomí do 4–5 řádků a cena se může posunout pod ohyb. Ověřit na 360×740 i 320×640, případně zkrátit vysvětlující řádky bodů (ne H1).
- **Generátor SEO.** Když se `vykresli_seo.py` nespustí, CI spadne na rozdílu SEO bloku. Generátor musí spustit člověk.
- **og:title zůstává „Pneusklad — evidence uskladněných pneu“.** Plyne z pole `produkt` a markeťák ho nezmínil. Změna by zasáhla zásady a Play záznam.
- **Text v Google Play se nemění.** Play záznam (aplikace.popis, dlouhy_popis) zůstává. Mimo zadání.

## Jak ověřit
1. Na telefonu (Chrome, okno 360×740) otevřít anonymně https://pneusklad.simtegen.com a bez posouvání uvidět:
   - H1 „Víte, kde má který zákazník uložené pneu?“,
   - tři body Evidence pneu / Tisk štítků / Objednávky s připomínkou,
   - kartu „Cena od 129 Kč měsíčně za firmu“ s větou „Prvních 30 dní zdarma, bez karty.“
2. Posunout dolů: Přihlášení s e-mailem, „Vyzkoušet ukázku“, Ceník se všemi variantami. „Začít zdarma“ pošle odkaz jako dřív.
3. Na notebooku: H1 a body vlevo, cena a přihlášení vpravo, vše v první obrazovce.
4. Zobrazit zdroj stránky (view-source): `<title>` a `<meta name="description">` se shodují s textem markeťáka znak po znaku.
5. Přihlásit se existujícím účtem: Dnes, Sklad, Objednávky a štítek fungují a vypadají jako před změnou.
6. V aplikaci z Google Play: úvod má novou H1 a cenu, žádnou nabídku faktury.
7. CI (kontrola manifestu, SEO, aplikace, UAT, vizuální kontrola) je zelené.

## Akceptační scénáře (CI je spustí proti API)
- Nepřihlášený návštěvník otevře https://pneusklad.simtegen.com a ve zdroji stránky musí vidět <title> „Evidence uskladněných pneu pro malé pneuservisy | Pneusklad“, meta description „Evidence uskladněných pneu, tisk štítků a objednávkový kalendář s připomínkou pro malé a mobilní pneuservisy. 129 Kč měsíčně za firmu.“ a H1 „Víte, kde má který zákazník uložené pneu?“.
- Nepřihlášený návštěvník na telefonu 360×740 načte úvodní stránku a bez posouvání musí vidět tři body Evidence pneu, Tisk štítků a Objednávky s připomínkou, cenu 129 Kč měsíčně za firmu a větu „Prvních 30 dní zdarma, bez karty.“.
- Nepřihlášený návštěvník zadá na úvodní stránce e-mail a klepne na „Začít zdarma“ a musí vidět potvrzení o odeslaném přihlašovacím odkazu jako před změnou.
- Přihlášený servis A založí přes POST /api/sady novou sadu a musí ji dostat zpět přes GET /api/sady/{id} s kódem a pozicí ve skladu stejně jako před změnou.
- Servis B zavolá GET /api/sady a GET /api/sady/{id} sady servisu A a nesmí sadu servisu A vidět ani otevřít (prázdný seznam, 404).

_Schvaluje se přes ARGA (simtegen_approve_spec) nebo na mini PC._