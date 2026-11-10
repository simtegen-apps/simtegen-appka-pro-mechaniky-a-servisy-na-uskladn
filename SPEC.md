# Specifikace — build 15

Build 15 doplní do běžícího Pneuskladu angličtinu. Jazyk si volí každý pracovník servisu sám: na úvodu, v Nastavení → Účet, nebo jedním klepnutím z jednorázové nabídky. Volba se ukládá k jeho účtu, takže platí na telefonu i na dílenském tabletu. Česky mluvící servisy neuvidí žádnou změnu: v češtině se nový kód vůbec nespustí. Obrazovky, data, ceny ani tok práce se nemění. Česky zůstanou jen právní texty, nápověda a přihlašovací e-mail ze šablony, a to výslovně řečené.

## Placená hodnota (proč přijde druhý nákup)
Servis dál platí 129 Kč měsíčně za provozovnu za evidenci, kde leží čí kola, za štítky a za objednávky s připomínkou. Angličtina odstraní důvod odejít, když servis zaměstná mechanika, který nečte česky: celý tým zapisuje do jedné evidence, a předplatné se proto obnovuje každou sezónu (jaro i podzim), dokud kola leží v regálu.

## Design (obrazovky, navigace, stavy)
BARVA PRODUKTU: beze změny #c2410c, pálená oranžová. Je to barva pryže a výstražných štítků v dílně. Kontrast na papíře #f6f4ef je asi 6,7:1, tedy ≥ 4,5:1. Tmavá varianta #f07a45 zůstává v web/produkt.css. Návrhový systém v3 „Papír a výkres“ se nemění: žádná nová třída, barva ani rozměr.

ŽÁDNÁ NOVÁ OBRAZOVKA. Všech 15 obrazovek buildu 14 zůstává se stejným typem, stejnými sekcemi a stejnou hlavní akcí. V angličtině mají jen přeložené texty. Měnit se budou tři místa:

1) Úvod a přihlášení (#obrazovka-prihlaseni). Typ: přehled, 3 sekce jako dosud.
- Hlavní akce zůstává „Začít zdarma“ / „Start free“ (#poslat-odkaz) v .lista-dole.
- Nově je v .hlavicka vpravo malé tlačítko #hlavicka-jazyk (.tlacitko vedlejsi). Ukáže se jen na úvodu. V češtině má text „English“ s lang="en", v angličtině „Čeština“ s lang="cs".
- Je v hlavičce, ne v obsahu, aby nesesunulo H1, tři body a cenu pod ohyb (360×740).
- Přepnutí přeloží stránku na místě a do adresy zapíše ?jazyk=en přes history.replaceState. Nic se neukládá, žádná cookie, žádné localStorage.
- Odkaz ve tvaru https://pneusklad.simtegen.com/?jazyk=en otevře úvod rovnou anglicky. Statické české H1, body a meta pro vyhledávač zůstávají v HTML beze změny.
- Volání POST /api/navsteva {stranka:"uvod"} a přihlašovací formulář zůstávají.
- Po odeslání odkazu v angličtině hláška řekne: „We have sent a sign-in link to … The e-mail is in Czech — open the link in it and tap ‚Přihlásit se‘ (Sign in).“ Přihlašovací e-mail i stránka /api/overeni patří šabloně a zůstávají česky.
- Odkazy na zásady, podmínky a nápovědu mají v angličtině dovětek „(in Czech)“.
- Tablet a notebook: beze změny, tedy .mrizka s7 (H1 a body) + s5 (cena a přihlášení). Přepínač je v hlavičce na všech šířkách.

2) Nastavení (#obrazovka-nastaveni). Typ: přehled, beze změny.
- Do sekce „Účet“ přibude jeden .radek: „Jazyk aplikace · Language“ s hodnotou „Čeština“ / „English“ a tlačítkem „Switch to English“ / „Přepnout do češtiny“.
- Vidí ho každá role, i mechanik a jen čtení. Sekci Účet vidí všichni a jazyk je osobní volba, ne nastavení servisu.
- Jedno klepnutí: POST /api/jazyk, obsah se na místě přeloží a ukáže se SimteGen.vratitelne „Language saved“ s Vrátit.
- Hlavní akce obrazovky zůstává „Uložit nastavení“ (správce). Tablet a notebook: .dva-sloupce jako dosud, řádek je v pravém sloupci v sekci Účet.

3) Dnes (#obrazovka-dnes). Typ: přehled, beze změny.
- Nahoře může jednou přibýt .hlaska (info), dvojjazyčná: „Use Pneusklad in English? · Používat aplikaci v angličtině?“. Má dvě tlačítka .vedlejsi: „English“ a „Ponechat češtinu“.
- Ukáže se jen přihlášenému, který ještě jazyk nezvolil (GET /api/jazyk vrátí null) a jehož navigator.language nezačíná na cs ani sk.
- Obě tlačítka volbu uloží, takže se nabídka už nikdy neukáže. Hlavní akce „Nová sada na uskladnění“ zůstává.
- Účel: anglicky mluvící mechanik se přihlásí odkazem z e-mailu v novém okně, kde se volba z úvodu ztratí (nic se neukládá v prohlížeči). Tady ji nastaví jedním klepnutím.
- Stávající zákazník bez volby zůstává v češtině. Nikdo se nepřepne sám.

NAVIGACE: beze změny, 4 položky. V angličtině Today · Storage · Bookings · Settings. Hlavní hodnota zůstává na 1–2 klepnutích. Jazyk je na 2 klepnutích (Settings → řádek Language) nebo na 1 klepnutí z úvodu či z nabídky. Každá podobrazovka má dál šipku Zpět („Back“) se záložní cestou a nic nespoléhá na tlačítko prohlížeče.

SLOVNÍK OBORU, aby byla angličtina všude stejná:
- sada = tyre set, regál = rack, pozice = rack position, štítek = label
- uskladnění = storage, přezutí = tyre change, výdej = release
- dezén = tread, hloubka dezénu = tread depth, SPZ = plate
- objednávka = booking, Připravit kola = Prepare wheels, Sezónní přehled = Season overview
- správce / mechanik / jen čtení = admin / mechanic / read only
- Předplatné = Subscription, Účet a data = Account and data

Formát čísel, peněz a dat zůstává český („1 249 Kč“, „25. 10.“): servis účtuje v Kč v Česku a stejně vypadají vytištěné štítky. „Dnes / Zítra / Včera“ ze SimteGen.datum se přeloží na Today / Tomorrow / Yesterday. Počty jdou přes anglické tvary (1 set / 3 sets) a dny v týdnu na Mon–Sun.

STAVY PRO NOVÁ MÍSTA:
- Načítání: #obrazovka-nacitani s .kostra zůstává, dokud nedoběhne /api/ja a GET /api/jazyk (paralelně). Anglický uživatel tak nevidí probliknutí češtiny.
- Prázdný: nenastane, volba má vždy dvě hodnoty.
- Chyba při uložení: rozhraní se přepne aspoň pro toto otevření a ukáže .hlaska.chyba v cílovém jazyce: „Your language choice was not saved — next time the app opens in Czech. Try again.“ s tlačítkem Try again.
- Offline: platí SimteGen.kdoJsem() / SimteGen.offline(obnov). Když GET /api/jazyk selže, zůstane poslední jazyk stránky. Pruh offline ze šablony se v angličtině přeloží.
- Ostatní obrazovky mají prázdné, načítací i chybové stavy přesně jako v buildu 14. Jejich věty jsou ve slovníku přeložené.

APLIKACE Z GOOGLE PLAY: přepínač funguje stejně. Pravidla platby se nemění: karta data-objednavka se v aplikaci dál neukáže a přeložené texty nesmí zmínit fakturu ani placení mimo Google Play. Záznam v obchodě zůstává český (generátor zná jen cs-CZ).

## Plán
1. Migrace db/migrace/0011_predvolby.sql založí novou tabulku:
   CREATE TABLE predvolby (uzivatel_id INTEGER PRIMARY KEY REFERENCES uzivatele(id) ON DELETE CASCADE, jazyk TEXT NOT NULL CHECK (jazyk IN ('cs','en')), zmeneno INTEGER NOT NULL DEFAULT (unixepoch()));
   - Klíčem je uzivatel_id osoby, ne servisu. Do nastaveni_servisu jazyk nepatří, protože ty sdílí celý tým.
   - Migrace nic nemaže ani nepřepisuje, schvalovací podpis tedy nepotřebuje. Export i smazání účtu ji zahrnou automaticky přes uzivatel_id.
2. data-manifest.json, do `ukladame` přidat entitu:
   {"entita": "predvolby", "ucel": "jazyk aplikace, který si pracovník servisu sám zvolil (čeština nebo angličtina)", "pole": "odkaz na účet, zvolený jazyk aplikace, čas poslední změny", "retence": "do smazání účtu zákazníkem", "play_typy": ["akce_v_aplikaci"], "play_ucely": ["funkce"], "play_volitelne": true}
   - Řádek vznikne jen při výslovné volbě.
   - uloziste_v_prohlizeci zůstává [], cookies a služby se nemění.
3. Nový endpoint functions/api/jazyk.js, vzorem je functions/api/navod.js:
   - GET vrátí {jazyk: "cs" | "en" | null}.
   - POST {jazyk} uloží přes INSERT … ON CONFLICT(uzivatel_id) DO UPDATE a vrátí {stav: "ulozeno", jazyk}.
   - Nepřihlášený dostane 401 „Nejste přihlášeni.“, neznámý jazyk 422 „Neznámý jazyk.“.
   - Endpoint pracuje s data.uzivatel.id (osoba). Nekontroluje roli ani předplatné, protože jazyk je osobní volba, ne zápis do evidence.
4. Nový soubor web/preklad.js, statický a bez závislostí:
   - Slovník PREKLAD_EN {česká věta: anglická}. Pokryje všechny texty z web/index.html, české chybové hlášky z functions/api/* (produktové i šablonové, např. /api/prihlaseni) a viditelné texty šablony (offline pruh, Vrátit, Zrušit, pruh a karty z simtegen.js/play.js, ukázková data).
   - Krátký seznam regexů pro věty s čísly a pro Dnes/Zítra/Včera.
   - window.Preklad = {jazyk(), nastav(j), t(text, hodnoty), tvary(cz)}.
   - V angličtině projde #appka a body. Překládá textové uzly a atributy placeholder, aria-label, title a alt, pamatuje si originály ve WeakMap a MutationObserverem přeloží i vše, co se vloží později (toasty, panely, potvrzení, odpovědi API).
   - Přepnutí zpět do češtiny vrátí originály a observer odpojí. Věta mimo slovník zůstane česky, nic nespadne.
   - V češtině se nic nespouští.
5. web/index.html:
   - Načíst preklad.js hned za simtegen.js. Nastavit document.documentElement.lang podle jazyka.
   - Start obnov(): po stavu `prihlasen` z SimteGen.kdoJsem() paralelně zavolat GET /api/jazyk a teprve pak opustit #obrazovka-nacitani. U nepřihlášeného rozhodne ?jazyk=en.
   - Přidat #hlavicka-jazyk (jen na úvodu), řádek Jazyk v sekci Účet v Nastavení a jednorázovou .hlaska nabídky na Dnes podle Designu.
   - Texty skládané v JS s hodnotami obalit Preklad.t("… {n} …", {n}). Platí to i pro titulky obrazovek v hlavičce, názvy dnů v .tyden, document.title, SimteGen.potvrd/zeptej volby {ano, ne}, SimteGen.pocet tvary přes Preklad.tvary.
   - Obalit i text kalendářní připomínky .ics (název a popis události) a popisky polí na štítku sady (data na štítku zůstávají, jak je pracovník zapsal).
   - Po přepnutí jazyka znovu vykreslit aktuální obrazovku stávající funkcí ukaz(id).
   - Neměnit ID, volání /api/navsteva, přihlašovací formulář, data-objednavka, data-predplatne-play, data-ukazka ani data-ukazkova-data.
6. functions/api/priprava.js: přečíst predvolby.jazyk odesílatele (data.uzivatel.id). Při `en` poslat předmět a text e-mailu „Prepare for … — n bookings“ anglicky, včetně anglických názvů úkonů (NAZVY_UKONU_EN). Limit 5 e-mailů denně zůstává.
7. uat/scenare.json: přidat akceptační scénáře z pole akceptace (jazyk A, oddělení A/B, 401, 422, export, sady beze změny v EN).
8. Spustit generátory: python vykresli_zasady.py, python vykresli_aplikaci.py (BEZPECNOST_DAT, zaznam.json), python kontrola_manifestu.py a python uat_kontrola.py. V tomto prostředí Python neběží, takže je musí před CI spustit člověk. Napsat to do SPEC.md.
9. play/co_je_noveho.txt přepsat, například: „Aplikaci teď můžete používat i v angličtině. Jazyk si každý pracovník servisu zvolí sám v Nastavení → Účet nebo na úvodní obrazovce a volba platí na všech jeho zařízeních. Evidence, štítky ani objednávky se nemění.“
10. README.md: krátká sekce „Angličtina“. Každý nový český text v index.html nebo v hlášce API potřebuje řádek v web/preklad.js, jinak se v angličtině ukáže česky. Doplnit i slovník oboru.
11. SPEC.md: specifikace buildu 15 a seznam toho, co zůstává česky.
12. Nesahat na: simtegen.js, play.js, ukazka-uctu.js, ukazka.js, prihlaseni.js, overeni.js, ja.js, _middleware.js obou úrovní, 0910_zdroje.sql, styl.css, ikony.svg ani na .github/. Generované soubory needitovat ručně.

## Soubory
- db/migrace/0011_predvolby.sql
- functions/api/jazyk.js
- functions/api/priprava.js
- web/preklad.js
- web/index.html
- data-manifest.json
- uat/scenare.json
- play/co_je_noveho.txt
- README.md
- SPEC.md
- web/zasady.html (generuje vykresli_zasady.py)
- web/podminky.html (generuje vykresli_zasady.py)
- web/zpracovatelska-smlouva.html (generuje vykresli_zasady.py)
- ZAZNAM_O_ZPRACOVANI.md (generuje vykresli_zasady.py)
- play/BEZPECNOST_DAT.md (generuje vykresli_aplikaci.py)
- play/zaznam.json (generuje vykresli_aplikaci.py)

## Rizika
- **Slovník se rozejde s textem.** Když někdo později změní českou větu v index.html, v API nebo v šabloně (simtegen.js a play.js se obnovují při každé stavbě), anglický uživatel ji uvidí česky. Nic se nerozbije. Pravidlo jde do README a validace obsahuje průchod všemi obrazovkami v EN. Automatickou kontrolu do CI přidat nejde, protože .github/ patří člověku.
- **Přihlašovací e-mail a stránka /api/overeni zůstávají česky.** Patří šabloně, kterou produkt nesmí měnit. Anglická hláška na úvodu to předem vysvětlí a řekne, na co klepnout. Trvalé řešení je požadavek na šablonu, aby přijala jazyk, a SimteGen ho má dostat jako úkol.
- **Česky zůstávají i právní texty, nápověda a další dokumenty.** Jde o zásady, podmínky, zpracovatelskou smlouvu, formulář odstoupení, nápovědu (napoveda.html), e-maily k fakturační objednávce předplatného, záznam v Google Play a ukázková data (česká jména motoristů jsou v ČR věrohodná). Závazné jsou české právní texty. Pokud zákazník potřebuje i anglické podmínky nebo anglický Play záznam, je to další zadání pro majitele.
- **Neznám přesný důvod zákazníka.** Předpoklad je, že jde o pracovníky servisu. Pokud jde o motoristy (anglické štítky pro cizince), řeší to i tento návrh: popisky štítku se řídí jazykem toho, kdo tiskne. Zákaznický portál pro motoristy ale produkt nemá a nepřibude. Majitel by to měl při schválení potvrdit.
- **Smíšený tým.** Majitel tiskne české štítky, mechanik anglické, takže v regálu můžou viset oba. Údaje (kód, jméno, SPZ, rozměr, pozice) jsou stejné, liší se jen popisky polí.
- **Stávající zákazníci.** Bez uložené volby zůstává čeština. Jednorázovou nabídku uvidí jen ten, kdo má prohlížeč v jiném jazyce než cs a sk, a jedním klepnutím „Ponechat češtinu“ ji navždy zavře.
- **Výkon a čitelnost.** MutationObserver běží jen v angličtině a jen hledá ve slovníku, takže je to zanedbatelné. Anglické texty jsou většinou kratší, přesto je potřeba zkontrolovat zalomení tlačítek na 320 px.
- **SEO.** Anglický úvod vzniká jen v JS, statický český obsah i meta se nemění a hreflang ani anglické URL se nepřidávají. Vyhledávače tak dál vidí jen češtinu, a to je záměr.
- **Generátory.** Python v tomto prostředí neběží. Bez spuštění vykresli_zasady.py a vykresli_aplikaci.py CI spadne na rozdílu zásad a Bezpečnosti údajů, takže je musí pustit člověk.

## Jak ověřit
1. Na telefonu (Chrome 360×740) otevřít anonymně https://pneusklad.simtegen.com. Úvod je česky beze změny a vpravo v hlavičce je „English“. Klepnout na něj: celý úvod je anglicky (Start free, Try the demo, ceník), cena je pořád „129 Kč“ a nad ohybem. V adrese je ?jazyk=en.
2. Zadat e-mail a „Start free“. Hláška je anglicky a vysvětluje, že e-mail je česky. Otevřít odkaz a přihlásit se. Na Dnes se ukáže nabídka „Use Pneusklad in English?“ (prohlížeč v angličtině), klepnout na English.
3. Projít v angličtině všechny obrazovky: Today, Storage, set detail, New set (4 kroky a štítek), Bookings, New booking, Prepare wheels, Season overview, Settings, Team, Account and data, Subscription. Kontroluje se, že tam nezůstala žádná česká věta mimo vysvětlené výjimky. Zkusit i chybu (vypnout síť → anglický pruh offline a Try again), Vrátit u výdeje sady a potvrzovací dialog smazání.
4. Vytisknout štítek sady: popisky jsou anglicky, údaje beze změny. Uložit připomínku .ics: název a popis události jsou anglicky. „Send me the list by e-mail“: e-mail přijde anglicky.
5. Otevřít aplikaci na druhém zařízení stejným účtem: rovnou anglicky, bez probliknutí češtiny.
6. Settings → Language → „Přepnout do češtiny“: vše je zpět česky, toast s Vrátit funguje.
7. Přihlásit se českým účtem servisu bez volby (prohlížeč česky): aplikace vypadá a chová se přesně jako v buildu 14, žádná nabídka.
8. V aplikaci z Google Play přepnout na English: karta předplatného ukazuje jen nákup přes Google Play, nikde není faktura ani převod.
9. Account and data → stáhnout data: v exportu je tabulka predvolby s „en“. CI (kontrola manifestu, zásady, aplikace, UAT, vizuální kontrola) je zelené.

## Akceptační scénáře (CI je spustí proti API)
- Přihlášený účet A pošle POST /api/jazyk {"jazyk":"en"} a pak GET /api/jazyk musí vidět odpověď 200 s jazykem „en“.
- Přihlášený účet B po volbě účtu A zavolá GET /api/jazyk a GET /api/sady a musí vidět jazyk null (ne „en“) a žádnou sadu účtu A.
- Nepřihlášený návštěvník zavolá GET i POST /api/jazyk a musí dostat 401 bez jakýchkoli údajů.
- Přihlášený účet A pošle POST /api/jazyk {"jazyk":"de"} a musí dostat 422 a GET /api/jazyk dál vrací „en“.
- Přihlášený účet A s jazykem „en“ založí přes POST /api/sady novou sadu a musí ji dostat přes GET /api/sady/{id} se stejným kódem a pozicí v regálu jako dosud.
- Přihlášený účet A stáhne GET /api/ucet/export a musí v něm vidět tabulku predvolby se svou volbou „en“.

_Schvaluje se přes ARGA (simtegen_approve_spec) nebo na mini PC._

## Co se při stavbě buildu 15 oproti specifikaci změnilo

1. **Překlad jede přes jazykový systém šablony, ne přes vlastní
   `web/preklad.js`.** Obnova šablony těsně před stavbou přinesla jazyky
   do `simtegen.js` (`<meta name="simtegen-jazyky" content="cs en">`,
   slovník `web/texty.js` se `SimteGen.slovnik`, klíče `data-t` v HTML,
   `SimteGen.t` ve skriptu, přepínač `data-prepinac-jazyka`) a CI to
   vynucuje (`kontrola_jazyku.py`; vizuální kontrola otevře `?jazyk=en`
   a odmítne každé ě, š, č, ř, ž, ů, ť, ď, ň na anglické obrazovce).
   Slovník podle českých vět by šel proti šabloně i kontrole. Výsledek pro
   zákazníka je stejný, česká obrazovka zůstává doslova stejná.
2. **Kdo si jazyk ještě nezvolil, dostane jazyk prohlížeče.** Rozhoduje
   šablona: `?jazyk=` → ruční volba v prohlížeči → jazyk prohlížeče
   (slovenský = čeština) → angličtina. Kdo má prohlížeč česky, vidí
   aplikaci jako v buildu 14. Kdo ho má anglicky, vidí ji rovnou anglicky
   a na Dnes jednou nabídku „Pneusklad is now in English. Keep English on
   all your devices?“ s tlačítky „Keep English“ a „Čeština“. Obě volbu
   uloží k účtu a nabídka se už neukáže.
3. **Ruční volbu si prohlížeč pamatuje (`sg-volba`).** Dělá to šablona
   a zásady to uvádějí (`vykresli_zasady.py`). Produkt sám do prohlížeče
   nic neukládá a `uloziste_v_prohlizeci` zůstává prázdné.
4. **Přepnutí jazyka znamená nové načtení stránky.** Tak to dělá
   `SimteGen.nastavJazyk`, proto po přepnutí v Nastavení není toast
   s Vrátit. Zpět se přepne stejným řádkem a stránka se otevře na Dnes.
   Když se volbu nepodaří uložit k účtu, jazyk se nepřepne a pod řádkem
   je chyba („Your language choice could not be saved…“). Jinak by ho
   příští otevření podle účtu vrátilo.
5. **Jazyk účtu má po přihlášení přednost.** Liší-li se od jazyka
   stránky, stránka se jednou načte znovu v jazyce účtu, ještě pod
   načítací kostrou. Proti zacyklení je v adrese značka `jazyk-z-uctu`,
   hned se smaže. Odkaz s `?jazyk=` (a kontrola v CI) platí, jak je
   napsaný.
6. **Přepínač je na třech místech:** v hlavičce úvodu jedno tlačítko
   s druhým jazykem („English“ / „Čeština“), plný přepínač šablony
   v patičce (CI ho vyžaduje) a řádek „Jazyk aplikace · Language“
   v Nastavení → Účet. Přepnutí patičkou přihlášenému uloží volbu k účtu
   také.
7. **Čísla, peníze a data se v angličtině píšou anglicky** („CZK 129“,
   „25 Oct“, „1,249“). Formát řídí `simtegen.js` podle jazyka stránky,
   specifikace počítala s českým. Částky se nepřepočítávají, ceník je
   dál jen v Kč.
8. **Hlášky API se nepřekládají na serveru.** API mluví česky dál.
   Anglická obrazovka je přeloží tabulkou `HLASKY_SERVERU` / `HLASKY_VZORY`
   v `index.html` na klíče `chyba.*`. Hláška, kterou tabulka nezná, se
   ukáže jako obecná anglická věta, nikdy česky. Nová hláška v API
   potřebuje řádek v tabulce i ve slovníku.
9. **Ceník má anglická jména u sebe.** `cenik.js` nese u variant
   `nazev_en`, `jednotka_en`, `popis_en` a u délek `nazev_en`. Částky
   jsou tytéž a `/api/ja` je posílá beze změny.
10. **Česky zůstávají i tyto části:** `web/play.js` (nákup v aplikaci
    z Google Play a pruh ukázky; šablona, needituje se), přihlašovací
    e-mail a stránka `/api/overeni`, e-maily k fakturační objednávce,
    nápověda a právní dokumenty. Odkazy na ně mají v angličtině dovětek
    „In Czech:“ / „(both in Czech)“ a `lang="cs"`.
11. **Akceptační scénář úvodu hledá stejné texty volněji**
    (`>Víte, kde má …</h1>` místo celé značky), protože nadpis, body,
    `<title>` a popisek e-mailu nesou atribut `data-t`. Nově kontroluje
    i `simtegen-jazyky` a `texty.js`.
12. **Generátory ani kontroly stavitel nespustil.** Python ani Node tu
    bez schválení nejdou spustit. Před CI je musí pustit člověk:
    `python vykresli_zasady.py`, `python vykresli_napovedu.py` (nové
    téma „Aplikace v angličtině“), `python vykresli_aplikaci.py`
    (Bezpečnost údajů, záznam v obchodě s větou o angličtině
    v `dlouhy_popis`), `python vykresli_seo.py`, pak
    `python kontrola_manifestu.py` a `python uat_kontrola.py`.