# Specifikace — build 12

Běžící Pneusklad (sklad sad se štítky, objednávkový kalendář, Připravit kola, sezónní přehled, tým, předplatné, Google Play) se převede na návrhový systém v3 přesně v rozsahu, který zákazník chce. Všech 11 oken prohlížeče (confirm/prompt) nahradí dialogy aplikace. Běžné mazání, rušení, výdej a přesun proběhnou hned a nabídnou Vrátit. Otázku dostane jen to, co vrátit nejde. Nadpisy ztratí číslování „01 —“ a každá obrazovka bude mít právě jedno černé tlačítko. Data, migrace, API (až na jednu výjimku pro Vrátit u výdeje) i ID prvků, na která míří snímky a UAT, zůstávají beze změny.

## Placená hodnota (proč přijde druhý nákup)
Platí se za evidenci uložených kol, tedy jediné místo, kde servis ví, čí kola leží ve které polici, co má zítra sundat a koho má před sezónou obvolat. Druhý nákup přichází sám, protože kola leží v regálu celý rok, přezouvá se každé jaro i podzim a předplatné se obnovuje. Tahle stavba hodnotu udrží: platící zákazník appku označil za nepřehlednou, okna prohlížeče ho v aplikaci z Google Play zdržují a omylem smazanou objednávku nebo vydanou sadu teď nejde vzít zpět. Vrátit a jedna jasná akce na obrazovce snižují riziko, že servis kvůli chybě v evidenci odejde.

## Design (obrazovky, navigace, stavy)
BARVA PRODUKTU: zůstává rumělka #c2410c (tmavý režim #f07a45). Je to barva zahřáté pryže a výstražných štítků v dílně, zákazník ji z appky, štítků i ikony v Google Play už zná. Kontrast na papíře #f6f4ef je 4,71:1 (≥ 4,5). web/produkt.css se nemění.

TYP OBRAZOVEK: všechny jsou PŘEHLED. Nástroj (výkres) produkt nemá: zákazník nic neskládá ani nekreslí, eviduje sady a termíny. Mapa regálu by byla nová funkce mimo zadání („bez přestavby zbytku“), proto se nestaví.

CO SE MĚNÍ NAPŘÍČ APPKOU
• Nadpisy: všechny .sekce-titulek bez čísel („Stav dne“, „Najít v evidenci“, „Dnešní objednávky“ …), a to i v dynamicky kreslených (Detail sady, Sezónní přehled). Úvod ztratí .poradi 01–03. Štítek nad nadpisem se ruší („Pro malé a mobilní pneuservisy“ se přesune pod titulek jako běžná věta, „Načítám evidenci“ zmizí, zůstane .kostra).
• Písmo: produktové .radky .klic přestane být mono s velkými písmeny a bude psát obyčejná slova tužkou (.stitek z v3). Mono zůstane jen na tom, co se měří nebo kóduje: kód sady (.kod), rozměr 205/55 R16 (.rozmer), pozice A1-04, hloubky v mm, čas objednávky.
• Čísla: částky, data a počty se budou psát přes SimteGen.kc / datum / pocet místo vlastních korun()/datumCesky()/toLocaleString (např. „1 sad“ nebo „5 sady“ se už nezobrazí).
• Dialogy: confirm/prompt nahradí SimteGen.vratitelne / potvrd / zeptej (viz plán). Nadpis panelu je otázka nebo věta a tlačítko říká, co udělá.

OBRAZOVKY (hlavní akce = jediné černé tlačítko; max. 2 vedlejší vedle ní)
1) Úvod a přihlášení. Hlavní akce „Začít zdarma“. „Vyzkoušet ukázku“ se změní na vedlejší (data-ukazka). Sekce „Co to umí“, „Přihlášení“, „Bez registrace“. Obří číslo je cena „129 Kč“ (nese informaci). Prázdný stav: bez ceníku se karta ceny nevykreslí. Načítání: úvodní obrazovka simtegen.js a .kostra. Chyba: .hlaska.chyba pod polem. Volá jednou POST /api/navsteva {stranka:"uvod"}.
2) Dnes. Hlavní akce „Nová sada na uskladnění“. Sekce „Stav dne“ (obří číslo kol na zítra, stupnice připraveno, vedlejší Připravit kola / Obvolat), „Najít v evidenci“, „Dnešní objednávky“ (3–5 nejbližších, „Celý týden →“). Prázdný stav nového účtu bez sad: .prazdno „Tady uvidíte, která kola máte zítra sundat z regálu. Začněte první uskladněnou sadou.“ s vedlejším „Naplnit ukázkovými daty“ (vlastník účtu). Plní existujícím /api/ukazkova-data, druhé plnění se nepřidává. Hlavní akcí zůstává lišta. Načítání: .kostra. Chyba: .hlaska.chyba „Přehled dne se nepodařilo načíst. Zkontrolujte připojení a zkuste to znovu.“
3) Sklad. Hlavní akce „Nová sada“, vedlejší „Tisk štítků (n)“. Sekce „Sklad“ (obří počet sad v regálu, filtr) a „Hledání“. Prázdný: „V regálu zatím nic neleží.“ Načítání: .kostra. Chyba: .hlaska.chyba.
4) Zákazníci. Hlavní akce „Nový zákazník“. Jedna sekce „Kartotéka“. Stavy beze změny.
5) Zákazník. Hlavní akce „Uskladnit pneu“, vedlejší „Uložit“, varovné „Smazat“ (s Vrátit, viz plán). Sekce „Údaje motoristy“.
6) Nová sada (průvodce 4 kroky + hotovo). Jedno černé tlačítko #ns-krok-dal v jedné .lista-dole, mění text i akci: „Pokračovat“ → „Uložit sadu“ (krok 4) → „Vytisknout štítek“ (hotovo). Druhá lišta #ns-akce-hotovo zmizí. Na kroku hotovo jsou vedlejší „Hned objednat přezutí“ a „Zapsat další sadu“, detail sady otevře klepnutí na kód. Ukazatel kroků zůstává.
7) Detail sady. Hlavní akce „Tisk štítku“, vedlejší „Vydat“ / „Vrátit na sklad“ a „Objednat“. Pět sekcí se sloučí do tří: „Kola“ (zákazník s odkazem Zavolat, SPZ, rozměr, dezén, hloubky 4 kol v mm, varování pod 4 mm), „Uložení a platba“ (místo, přijato/vydáno, cena, poznámka, tiché „Označit jako zaplacené“ a „Přesunout ve skladu“), „Historie“ (.denik). Chyba: .hlaska.chyba.
8) Objednávky. Hlavní akce „Nová objednávka“. Sekce „Týden“ (.tyden) a „Termíny“. „Zrušit“ u termínu proběhne hned a ukáže Vrátit.
9) Nová objednávka. Hlavní akce „Zapsat objednávku“. Sekce „Čí kola“, „Kdy“, „Co se bude dělat“. Plný termín: SimteGen.potvrd(hláška serveru, {ano: "Zapsat i tak"}).
10) Připravit kola. Hlavní akce „Poslat si seznam e-mailem“, vedlejší „Připomínka do kalendáře“. Sekce „Na který den“ (obří počet kol) a „Sundat z regálu“.
11) Sezónní přehled. Hlavní akce „Vytisknout seznam k obvolání“ (data-tisk="#prehled-obvolat", tiskne vzhled styl.css). Sekce „Obvolat“, „Pod 4 mm“, „Nezaplaceno“ bez čísel. Prázdný: „Před sezónou tu uvidíte, koho obvolat.“
12) Nastavení (menu). Hlavní akce „Uložit nastavení“ (jen správce). Šest sekcí se zredukuje na tři: „Štítek“ (název, telefon, adresa, formát, zkušební štítek, výchozí cena), „Provoz“ a „Účet“, kde jsou řádky .radek 56 px vedoucí na Předplatné ›, Tým › (správce) a Účet a data ›, plus „Zobrazit návod“. Mechanik a „jen čtení“ vidí jen sekci Účet.
13) Tým (nová podobrazovka, přesunutý obsah, stejná ID). Hlavní akce „Přidat kolegu“. Seznam členů s „Změnit roli“ a „Odebrat“, obojí hned s Vrátit. Prázdný: „Zatím jste tu sami.“
14) Účet a data (nová podobrazovka, přesunutý obsah). Hlavní akce „Stáhnout moje data“, vedlejší „Odhlásit se“ a „Doporučit kolegovi“ (data-doporucit="ucet"). Sekce „Ukázková data“ (vlastník): „Smazat ukázková data“ s Vrátit. Sekce „Smazání účtu“: varovné tlačítko a SimteGen.potvrd s červeným tlačítkem a fokusem na Zrušit.
15) Předplatné. Hlavní akce na webu „Objednávka zavazující k platbě“ (data-objednavka), v aplikaci tlačítko Google Play. Sekce „Stav účtu“, „Ceník“ / „Nákup“ a „Objednávky provozovny“ bez čísel (dnes je číslo sekce Nákup podle prostředí 02/03). Zrušení fakturační objednávky přes SimteGen.potvrd.

NAVIGACE: beze změny, 4 položky Dnes · Sklad · Objednávky · Nastavení. Hlavní hodnota je na 1–2 klepnutích (Dnes → Nová sada → průvodce → štítek). Tým a Účet a data jsou na 2 klepnutích (Nastavení → řádek). Každá podobrazovka má šipku Zpět v hlavičce se záložní cestou na nadřazenou obrazovku (Tým / Účet a data → Nastavení) a nic nespoléhá na tlačítko prohlížeče.

TABLET A NOTEBOOK (beze změny rozvržení z buildu 10, jen bez čísel): Dnes s5 stav dne + s7 hledání a objednávky. Sklad s4 číslo a filtr + s8 seznam. Objednávky s7 týden + s5 termíny. Předplatné s5 + s7. Nastavení .dva-sloupce (Štítek | Provoz a Účet). Sezónní přehled .dva-sloupce. Detail sady s7 Kola + s5 Uložení a historie.

STAVY: každá obrazovka má .prazdno (věta, co tu bude, a cesta dál), .kostra místo kolečka, .hlaska.chyba česky s tím, co dělat, a úspěch jako .toast. U vratných akcí úspěch dělá SimteGen.vratitelne s Vrátit.

## Plán
1. Infrastruktura šablony: stavba přepíše DESIGN.md, web/styl.css, web/simtegen.js a písma na v3. Produkt je needituje. Před další prací ověřit, že SimteGen.vratitelne/potvrd/zeptej/kdoJsem existují, a zjistit, jak dlouho trvá okno Vrátit (případně jestli vratitelne vrací Promise).
2. web/index.html: produktový <style> pročistit podle v3. .radky .klic bez mono, velkých písmen a prostrkání. Zrušit .poradi. Ponechat jen rozvržení a tisk štítku (Zebra 100×50 mm), který je jádrem produktu.
3. Nadpisy: odstranit „NN — “ ze všech .sekce-titulek v HTML i v šablonových řetězcích (vykresliSadu ř. ~1853–1899, sezónní přehled ř. ~2381, Předplatné ř. ~864). Štítky nad nadpisy přesunout pod nadpis nebo smazat.
4. Jedna hlavní akce: data-ukazka změnit na „tlacitko vedlejsi“. Nová sada: sloučit #ns-akce a #ns-akce-hotovo do jedné lišty s jedním #ns-krok-dal, který podle kroku mění text a obsluhu (Pokračovat / Uložit sadu / Vytisknout štítek). Hotovo krok bude mít 2 vedlejší a detail sady se otevře klepnutím na kód. Sezónní přehled dostane hlavní „Vytisknout seznam k obvolání“ (data-tisk). Projít, že žádná obrazovka nemá v HTML ani v šablonách víc než jedno .tlacitko bez .vedlejsi/.varovne/.ikona (CI počítá i skrytá).
5. Okna prohlížeče na dialogy aplikace (stávající API, stejné endpointy):
   a) Zrušit objednávku dílny (ř. ~2000): provést {akce:"zruseno"} hned a nabídnout SimteGen.vratitelne("Objednávka zrušena", → {akce:"planovano"}).
   b) Vydat sadu (ř. ~1932): provést {akce:"vydat"} hned a nabídnout vratitelne("Sada A1-04 vydána", → {akce:"vratit", pozice: původní}).
   c) Vrátit vydanou sadu na sklad (ř. ~1934): SimteGen.zeptej("Kam sadu ukládáte?", {popisek: "Místo ve skladu", hodnota: pozice}). null = zrušeno.
   d) Přesunout ve skladu (ř. ~1912): zeptej → presunout → vratitelne („Přesunuto na B2-01“, → presunout na původní pozici).
   e) Změnit roli (ř. ~2805): hned + vratitelne → zmenit na původní roli.
   f) Odebrat kolegu (ř. ~2815): hned + vratitelne → pridat se stejným e-mailem a rolí.
   g) Smazat ukázková data (ř. ~2851): hned + vratitelne → naplnit.
   h) Smazat zákazníka (ř. ~1564, tvrdý DELETE s kaskádou vydaných sad): odložené smazání bez změny dat. Zákazník hned zmizí ze seznamu a appka se vrátí do Kartotéky s vratitelne(„Zákazník Jan Dvořák smazán“). POST {akce:"smazat"} odejde až po uplynutí okna Vrátit, nebo dřív při pagehide/visibilitychange (fetch keepalive). Vrátit zruší časovač a vrátí řádek. Pokud má sady v regálu, zůstává stávající hláška bez mazání.
   i) Plný termín (ř. ~2201): SimteGen.potvrd(data.chyba, {ano: "Zapsat i tak"}).
   j) Zrušit fakturační objednávku předplatného (ř. ~2730): SimteGen.potvrd("Zrušit objednávku č. 12?", {popis: "Zrušenou objednávku nejde obnovit, můžete ale objednat znovu.", ano: "Zrušit objednávku"}).
   k) Smazat účet (ř. ~2874): SimteGen.potvrd("Smazat účet a všechna data?", {popis: "Smaže se celá evidence sad, zákazníků a objednávek. Krok je nevratný.", ano: "Smazat účet", nebezpecne: true}).
6. functions/api/sady/[id].js: „vratit“ projde i bez platného předplatného (stejně jako vydat), ale jen když sada byla vydána před méně než 15 minutami. Bez toho by Vrátit po omylem vydané sadě v režimu čtení skončil chybou 402. Jinak 402 jako dosud. Pořadí kontrol (přihlášení → předplatné → role) se nemění.
7. Nastavení rozdělit (přesunem HTML bloků se stejnými ID a obsluhou): Nastavení (Štítek, Provoz, Účet s řádky) + nové podobrazovky obrazovka-tym a obrazovka-ucet. Doplnit je do mapy nadřazených obrazovek pro #hlavicka-zpet. Na obrazovku Účet a data přidat data-doporucit="ucet".
8. Detail sady: vykresliSadu sloučit na 3 sekce (Kola / Uložení a platba / Historie). Rozměr, kód, pozici a hloubky dát do .rozmer/.kod.
9. Formát čísel: korun(), datumCesky(), mm(), počty („${data.sad} sad“) přepsat na SimteGen.kc / datum / cislo / pocet. Částky objednávek předplatného přes SimteGen.kc.
10. Dnes: prázdný stav nového účtu (0 sad, 0 objednávek) s .prazdno a vedlejším „Naplnit ukázkovými daty“ (vlastník, existující /api/ukazkova-data, bez data-ukazkova-data, aby simtegen.js nenaplnil podruhé).
11. Šablonová povinnost: obnov() přepsat na SimteGen.kdoJsem(). Přihlášení ukázat jen při „odhlasen“, při „offline“ nechat poslední obrazovku a SimteGen.offline(obnov) / SimteGen.spojeno(). Při zobrazení úvodu jednou POST /api/navsteva {stranka:"uvod"} (endpoint a tabulku navstevy dodává šablona, needitovat; chybí-li v manifestu agregaty.navstevy, doplní je stavba).
12. Zachovat ID, na která míří snímky a UAT (#dlazdice-priprava, #dnes-na-prehled, #sklad-seznam .radek, [data-obrazovka=…]). data-manifest.json se proto nemění.
13. uat/scenare.json: přidat scénáře z akceptace (zrušení a vrácení objednávky, výdej a Vrátit, přesun a Vrátit, odebrání kolegy a Vrátit, účet B). Stávající nechat.
14. play/co_je_noveho.txt přepsat (viz risks/validation). SPEC.md doplnit o build 11.
15. Generátory: python vykresli_zasady.py && python vykresli_aplikaci.py && python kontrola_manifestu.py. V tomhle prostředí se Python nespustí, proto je musí pustit člověk před CI.

## Soubory
- web/index.html
- functions/api/sady/[id].js
- uat/scenare.json
- play/co_je_noveho.txt
- SPEC.md
- infrastruktura šablony, přepíše stavba (needitovat): DESIGN.md, web/styl.css, web/simtegen.js, web/pismo/*
- generované (needitovat, přegenerovat): web/zasady.html, play/zaznam.json, play/BEZPECNOST_DAT.md, web/manifest.webmanifest, web/sw.js, web/offline.html, web/ukazka.json

## Rizika
1. Odložené smazání zákazníka: když zákazník zavře appku úplně (zabití procesu bez pagehide), požadavek neodejde a zákazník v kartotéce zůstane. Chyba je na bezpečné straně, ale je viditelná. Časovač musí sedět s délkou okna Vrátit v simtegen.js, jinak by Vrátit po vypršení slibovalo něco, co už nejde. Stavba délku ověří a při nesouladu ukáže „Zákazník už je smazaný.“
2. Vrátit u výdeje a přesunu zapisuje do deníku pohybů další řádek („vráceno na sklad“). Pohyby jsou append-only, takže historie bude poctivá, jen delší. Mazat pohyby by porušilo princip evidence.
3. Výjimka pro „vratit“ bez předplatného (15 minut po výdeji) je jediná změna serveru. Bez ní by Vrátit v režimu čtení selhal s 402. Ověřit testem s plati_do v minulosti.
4. Tisk štítku na Zebru má v produktu vlastní @media print (100×50 mm, 203 dpi), což DESIGN v3 nedoporučuje. Je to jádro placené hodnoty a SimteGen.tisk velikost stránky štítku neumí, proto zůstává. CI to podle seznamu odmítnutí nekontroluje. Kdyby to recenzent zamítl, řešení patří do šablony, ne do produktu.
5. Přesun Týmu a Účtu na podobrazovky: zákazník najde tyto věci o klepnutí dál. ID a obsluha zůstávají, mění se jen umístění. Riziko nese návod (navod.js/NAVOD texty), který může zmiňovat „Nastavení → Tým“. Texty návodu zkontrolovat.
6. Jedno černé tlačítko v průvodci Nová sada mění obsluhu podle kroku. Chyba ve stavu průvodce by mohla poslat Uložit dvakrát. Tlačítko se po dobu požadavku zamyká (disabled), stejně jako dnes.
7. Šablonové funkce (vratitelne/potvrd/zeptej/kdoJsem) dodává nová simtegen.js. Ve stávající verzi repa nejsou. Bez přepisu infrastruktury stavbou appka nepoběží.
8. Generátory nejde v tomhle prostředí spustit. Člověk je musí pustit před CI, jinak CI shodí build na rozdílu proti vygenerovaným souborům.
9. Nic se neukládá navíc, manifest ani migrace se nemění. Zásady se proto obsahově nezmění.

## Jak ověřit
Na náhledovém nasazení, telefon ~390 px, přihlášený účet s ukázkovými daty:
1. Objednávky → u zítřejšího termínu „Zrušit“: termín se hned přeškrtne a dole je toast „Objednávka zrušena“ s Vrátit. Klepnout Vrátit: termín je zpět a je i v Připravit kola. Žádné šedé okno prohlížeče.
2. Detail sady → „Vydat“: sada je hned vydaná, toast s Vrátit. Vrátit vrátí sadu na původní pozici, v historii jsou oba pohyby. Totéž s plati_do v minulosti (režim čtení) do 15 minut po výdeji.
3. Detail sady → „Přesunout ve skladu“: otevře se panel aplikace s polem „Místo ve skladu“ předvyplněným A1-04 a tlačítky Zrušit / Přesunout. Po přesunu Vrátit vrátí A1-04.
4. Zákazník bez sad v regálu → Smazat: zmizí ze seznamu, toast s Vrátit. Vrátit ho vrátí. Bez Vrátit a po obnovení stránky už v kartotéce není.
5. Nastavení → Účet a data → „Smazat účet a všechna data“: panel s červeným tlačítkem „Smazat účet“ a fokusem na Zrušit. Zrušit nic nesmaže.
6. Projít všechny obrazovky: žádný nadpis nezačíná číslem, na každé je nejvýš jedno černé tlačítko (úvod: jen „Začít zdarma“, Vyzkoušet ukázku je obrysové; Nová sada: jedno tlačítko „Pokračovat → Uložit sadu → Vytisknout štítek“). Rozměr, kód a pozice jsou v mono písmu, popisky obyčejným písmem.
7. Nový účet bez dat → Dnes ukazuje větu, co sem patří, a „Naplnit ukázkovými daty“. Po naplnění se objeví sady i objednávky.
8. Tablet 820 px a notebook 1440 px: levý pruh / boční menu, Dnes, Sklad a Objednávky ve dvou sloupcích, Nastavení ve dvou sloupcích.
9. Lokálně (člověk): grep -nE "confirm\(|prompt\(|alert\(" web/ functions/ = nic. Dále python vykresli_aplikaci.py, python kontrola_manifestu.py, python vizualni_kontrola.py (5 šířek, světle i tmavě, bez chyb) a python uat_kontrola.py, kde projdou všechny scénáře.
play/co_je_noveho.txt: „Aplikace je přehlednější. Na každé obrazovce je jedno hlavní tlačítko a nadpisy jsou bez čísel. Když zrušíte objednávku, vydáte nebo přesunete sadu či smažete zákazníka, můžete to hned tlačítkem Vrátit vzít zpět. Místo oken prohlížeče se ptá sama aplikace. Tým a údaje k účtu najdete v Nastavení na samostatných obrazovkách.“

## Akceptační scénáře (CI je spustí proti API)
- Mechanik účtu A — zruší zítřejší objednávku k uskladněné sadě (akce zruseno) a hned ji vrátí (akce planovano) — musí ji v GET /api/priprava na zítřek znovu vidět i s kódem sady a pozicí v regálu.
- Mechanik účtu A — vydá uskladněnou sadu a hned ji vrátí na sklad s původní pozicí (akce vratit) — musí ji najít hledáním podle pozice ve stavu uskladněno a v historii vidět výdej i vrácení.
- Mechanik účtu A — přesune sadu z A1-03 na B2-01 a přesun vrátí — musí sadu vidět znovu na pozici A1-03.
- Správce účtu A s vypršelým předplatným — vydá sadu a do 15 minut ji vrátí na sklad — musí dostat úspěch, ne 402, zatímco založení nové sady dál vrací 402.
- Správce účtu A — odebere kolegu a hned ho přidá zpět se stejným e-mailem a rolí — musí ho v GET /api/clenove vidět se stejnou rolí.
- Účet B — pokusí se vrátit objednávku (akce planovano) a sadu (akce vratit) účtu A — musí dostat 404 a u účtu A se objednávka ani sada nezmění.

_Schvaluje se přes ARGA (simtegen_approve_spec) nebo na mini PC._