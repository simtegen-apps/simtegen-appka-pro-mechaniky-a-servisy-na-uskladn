# Specifikace — build 20

Build 18 opraví příčiny chyb skriptu na přihlášení a načítání, které jsem našel v kódu. Přihlášení dnes padá při slabém signálu, odkaz jde odeslat dvakrát a po výpadku zůstane aplikace navždy na kostře načítání. Nikdo také nezkontroluje, jestli se zákazník mezitím přihlásil odkazem v jiné kartě nebo v prohlížeči. Produktový skript se přestěhuje z index.html do dvou souborů (web/pneusklad.js, web/prihlaseni.js), takže počítadlo chyb místo „jine“ zapíše soubor a řádek, a tím i krok přihlášení. Obrazovky, texty, data, ceny ani funkce se nemění.

## Placená hodnota (proč přijde druhý nákup)
Platí se dál 129 Kč měsíčně za provozovnu za evidenci, kde leží čí kola, za štítky a za objednávky s připomínkou, a druhý nákup přichází každou sezónu, protože kola zůstávají v regálu. Tenhle build hodnotu nepřidává: odstraňuje překážku na cestě k ní. Kdo se nepřihlásí, nezaloží účet, nezačne zkušební období a nikdy nezaplatí.

## Design (obrazovky, navigace, stavy)
BARVA PRODUKTU: beze změny #c2410c (pálená oranžová, pryž a výstražné štítky v dílně), kontrast na papíře #f6f4ef asi 4,7:1, tedy ≥ 4,5:1. web/styl.css, web/produkt.css a DESIGN.md se nemění. Žádná nová třída, barva ani obrazovka.

TYPY OBRAZOVEK: všechny zůstávají PŘEHLED. Nástroj produkt nemá: zákazník nic neskládá, sada se zapisuje a štítek se tiskne. Pokus mění jen chování dvou obrazovek, jejich vzhled ne:

1) Načítání (#obrazovka-nacitani), přehled, bez akce.
   - Načítání: .kostra jako dosud.
   - NOVĚ chyba: když po /api/ja selže síť při načítání nastavení, aplikace nezůstane navždy na kostře. Ukáže pruh šablony „Zkusit znovu“ (SimteGen.offline(obnov)) a po úspěchu ho schová (SimteGen.spojeno()).
   - Když server mezitím odpoví 401, otevře se přihlášení.
   - Prázdný stav nemá (je to přechod).
2) Úvod a přihlášení (#obrazovka-prihlaseni), přehled, hlavní akce „Začít zdarma“. Rozložení buildu 16 beze změny: H1, podvěta, tři přednosti, karta tarifu, pole „E-mail provozovny“, tlačítko v .lista-dole, vedlejší „Vyzkoušet ukázku“ (data-ukazka, .jen-v-aplikaci). Tablet a notebook: .mrizka s7 vlevo, s5 vpravo.
   - Načítání: kostra ceny jako dosud. Během odesílání je tlačítko zablokované (disabled, aria-busy) a pod polem stojí „Odesílám…“, takže Enter + klepnutí nepošle dva odkazy.
   - Chyba: hláška serveru pod polem jako dosud. NOVĚ i při výpadku sítě, kdy se ukáže stávající „Něco se nepovedlo. Zkuste to prosím znovu.“ a tlačítko se odblokuje (dnes zůstane „Odesílám…“ navždy).
   - Prázdný stav: obrazovka prázdná nebývá.
   - NOVĚ návrat: když se zákazník vrátí do karty nebo aplikace (visibilitychange na viditelnou, pageshow z mezipaměti zpět), zatímco je na přihlášení, aplikace jednou zjistí stav přes SimteGen.kdoJsem().
     - Při „prihlasen“ rovnou otevře Dnes (u nového účtu s průvodcem a prázdným stavem).
     - Při „odhlasen“ zůstane, jak je.
     - Žádné dotazování v intervalu.
   - Tlačítko Zpět bez přihlášení nechá přihlášení a neotevře Dnes odhlášenému.
3)–16) Dnes, Sklad, Zákazníci, Zákazník, Sada, Nová sada, Objednávky, Nová objednávka, Příprava kol, Sezónní přehled, Nastavení, Tým, Účet a data, Předplatné: beze změny (typ, hlavní akce, prázdné, načítací i chybové stavy podle SPEC buildu 16). Prázdný stav Dnes s „Naplnit ukázkovými daty“ zůstává.

NAVIGACE: beze změny 4 položky (Dnes · Sklad · Objednávky · Nastavení), hlavní hodnota na 0–1 klepnutí, štítek na 2. Spodní pás na telefonu až po přihlášení. Na tabletu a notebooku levý pruh.

TEXTY: žádný nový ani změněný text. Použije se stávající obecne.odesilam a obecne.nepovedlo_znovu (česky i anglicky v texty.js). Kdyby stavba přece jen potřebovala nový klíč, patří do obou jazyků.

ODCHYLKA K POTVRZENÍ MAJITELEM: zadání chce v hlášení chyby „zařízení“. Počítadlo chyb (functions/api/chyba-stranky.js, migrace 0930, web/simtegen.js) je infrastruktura šablony označená NEUPRAVOVAT V PRODUKTU. Úmyslně neukládá user agent ani text chyby a CI to vynucuje (kontrola_manifestu.SABLONOVE_AGREGATY, „jen čísla“). Vlastní měření zadání firmy zakazuje.
- Build proto dodá „krok přihlášení“: soubor a řádek, např. prihlaseni.js:57 = odeslání odkazu, pneusklad.js:… = načtení nastavení.
- Zařízení ne. To nese jen dobrovolné „Nahlásit chybu“, kam šablona už přikládá velikost okna a prohlížeč.
- Hrubou třídu zařízení (telefon/tablet/počítač, aplikace/web) v počítadle navrhuji jako samostatnou změnu šablony.

## Plán
1. Příčiny (zjištěné čtením kódu, data z produkce nemám a neotvírám):
   a) Proč „jine“: celý produktový skript je inline v web/index.html. Chyba v inline skriptu má jako soubor adresu stránky („/“, „/?aplikace=play“, „/?utm_…“). simtegen.js z ní vezme poslední úsek bez dotazu, tedy prázdný řetězec, a misto „:3551“ regex v chyba-stranky.js odmítne → „jine“. Odmítnutý promise počítá šablona vždy jako „jine“.
   b) api() (index.html, funkce api) nechytá síťovou chybu fetch. posliOdkaz při slabém signálu skončí odmítnutým promisem (chyba na „prihlaseni“), zpráva visí na „Odesílám…“ a tlačítko není blokované. Zákazník klepne znovu, nebo Enter + klik, a po třech odkazech za hodinu dostane „Příliš mnoho pokusů“. Přihlášení „se opakovaně rozbíjí“.
   c) obnov(): Promise.all([nactiUcet(), /api/predvolby]). nactiUcet nemá catch, takže výpadek sítě po /api/ja nechá aplikaci navždy na kostře Načítání (chyba na „nacitani“). Opakované obnov (událost online, Zkusit znovu) běží souběžně.
   d) Návrat po přihlášení: odkaz z e-mailu se potvrdí v prohlížeči nebo v jiné kartě. Aplikace z Google Play (TWA sdílí cookies s Chromem) i původní karta zůstanou na přihlášení a nic stav znovu neověří. Zákazník pak žádá nový odkaz a narazí na limit.
   e) popstate bez přihlášení otevře „obrazovka-dnes“ odhlášenému.
2. web/pneusklad.js (nový): přesunout doslova obsah hlavního inline &lt;script&gt; z index.html, kromě bloku přihlášení a startu. Bez změny chování, „use strict“ a top-level deklarace zůstanou (klasický skript, sdílený globální rozsah).
3. web/prihlaseni.js (nový), kroky přihlášení každý ve vlastní funkci, aby řádek v počítadle řekl krok:
   - posliOdkaz: try/catch kolem api, tlačítko disabled + aria-busy po dobu odeslání, ochrana proti dvojímu odeslání (Enter i klik), při síťové chybě obecne.nepovedlo_znovu a odblokování;
   - vykresliUvod: beze změny;
   - zkontrolujNavrat: při visibilitychange → visible a pageshow(persisted), jen když body není .prihlasen a aktivní je #obrazovka-prihlaseni, zavolá obnov() (přes SimteGen.kdoJsem, nikdy vlastní fetch /api/ja);
   - popstate bez .prihlasen nechá přihlášení.
4. web/index.html:
   - místo inline skriptu &lt;script src="pneusklad.js"&gt;&lt;/script&gt; a &lt;script src="prihlaseni.js"&gt;&lt;/script&gt; za simtegen.js a texty.js;
   - inline zůstane jen start: zapisNavstevu (POST /api/navsteva {stranka:"uvod"}, beze změny) a obnov() podle vzoru šablony;
   - obnov dostane: příznak „běží“ proti souběhu; nactiUcet se síťovou chybou → SimteGen.offline(obnov) místo věčné kostry; 401 z /api/nastaveni → přihlášení; jinak jako dosud;
   - markup obrazovek, ID, data-ukazka, data-objednavka, data-predplatne-play, patička a registrace sw.js se nemění.
5. uat/scenare.json: přidat scénáře z pole akceptace. Úvodní scénář doplnit o obsahuje „src=\"pneusklad.js\"“, „src=\"prihlaseni.js\"“, „/api/navsteva“, „SimteGen.kdoJsem“.
6. play/co_je_noveho.txt: „Opravili jsme přihlášení: odkaz z e-mailu vás po návratu do aplikace rovnou přihlásí a při slabém signálu už se přihlášení nezasekne. Nic jiného se nemění.“ (anglicky obdobně, je-li soubor dvojjazyčný).
7. SPEC.md: specifikace buildu 18, nalezené příčiny, odchylka „zařízení“ k potvrzení a seznam souborů mimo rozsah. README.md: jedna věta, že produktový skript je v pneusklad.js a prihlaseni.js kvůli čitelnému počítadlu chyb.
8. Bez zásahu: data-manifest.json (žádná nová data, služba, cookie ani úložiště, play_nakupy, Google Play a cookie aplikace už v manifestu jsou), migrace, zásady, functions/** včetně overeni.js, prihlaseni.js, chyba-stranky.js a _middleware.js (obou), web/simtegen.js, web/play.js, web/sw.js (generuje vykresli_aplikaci.py), styl.css, produkt.css, texty.js (pokud nebude nutný nový klíč), .github/.
9. Generátory a kontroly pustí člověk (Python ani node tu neběží): python vykresli_aplikaci.py, python kontrola_manifestu.py (včetně node --check obou nových souborů), python kontrola_jazyku.py (prochází i web/*.js), python uat_kontrola.py, vizualni_kontrola.py, bezpecnostni_kontrola.py (inline skriptů ubyde).
10. Po nasazení měření pokusu: 7 dní sledovat chyby_stranek pro obrazovky prihlaseni a nacitani a 30 dní nové účty se zdrojem google-play nebo z úvodu (zdroje_navstev / uzivatele.zdroj zapisuje šablona).

## Soubory
- web/index.html
- web/pneusklad.js (nový — přesunutý produktový skript)
- web/prihlaseni.js (nový — kroky přihlášení a návrat po přihlášení)
- uat/scenare.json
- play/co_je_noveho.txt
- SPEC.md
- README.md
- mimo rozsah, jen pokud je přinese obnova šablony (ne stavitel): web/simtegen.js, web/play.js, functions/api/_middleware.js, functions/api/overeni.js, .github/workflows/deploy.yml — uvést v PR jako obnovu šablony

## Rizika
- Příčinu jsem určil z kódu, ne z dat. Počítadlo dnes zapisuje „jine“ a produkční data jsem neviděl. Opravené příčiny (síťová chyba při odeslání odkazu, věčné Načítání, chybějící kontrola po návratu, dvojí odeslání) odpovídají obrazovkám i počtu, ale nemusí být všechny.
- Část chyb nemusí být naše: automatické testy Google Play (pre-launch report) na desítkách zařízení, rozšíření prohlížeče, Překladač Google a skript, který vkládá Cloudflare, se zapíší na „prihlaseni“ jako „jine“ nebo pod cizí soubor.
  - Po buildu jdou naše chyby poznat podle pneusklad.js/prihlaseni.js:řádek.
  - Navrhuji, aby měřítko „pod 2 chyby přihlášení za 7 dní“ počítalo jen chyby v našich souborech. Prosím o potvrzení majitelem.
- Zařízení do počítadla build nedodá. Šablona to zakazuje (bez user agentu, „jen čísla“) a vlastní měření je vyloučené. Je to odchylka k potvrzení, návrh patří do šablony.
- Návrat do aplikace z Google Play funguje automaticky jen tehdy, když e-mailový klient otevře odkaz v Chromu nebo jeho kartě (sdílené cookies s TWA), nebo když Android ověřeným App Link (assetlinks.json) otevře odkaz rovnou v aplikaci.
  - Samsung Internet nebo jiný výchozí prohlížeč má vlastní cookies a aplikace přihlášení nepozná.
  - Ověří to ruční test. Jiné řešení, třeba kód z e-mailu opsaný do aplikace, je změna šablony přihlášení a patří do jiné stavby.
- Přesun skriptu se dotkne ~2 700 řádků. Má proběhnout doslova (vyjmout a vložit), jinak hrozí rozbití celé aplikace. Pojistkou je kontrola syntaxe node --check v kontrola_manifestu.py, vizuální kontrola a UAT.
- Čísla řádků se s každým buildem posunou. Revize musí číst místo spolu s verzí, proto jsou kroky přihlášení ve vlastním malém souboru.
- Offline: sw.js (generovaný) si předem ukládá jen „/“ a styl, ne skripty. Offline skořápka je tak bez skriptů už dnes, nové soubory na tom nic nezhorší. Oprava patří do generátoru šablony.
- Měřítko „3 nové účty do 30 dní“ závisí i na návštěvnosti z Google Play a z úvodu. Oprava může být úplná, a přesto cíl nesplnit pro malý provoz.
- Generátory a kontroly tu nejdou spustit. Před CI je musí pustit člověk.

## Jak ověřit
1. Telefon s aplikací Pneusklad z Google Play, nový e-mail: otevřít aplikaci (otevře se s ?aplikace=play), zadat e-mail, klepnout „Začít zdarma“ a rychle ještě Enter. Musí přijít jen jeden e-mail a tlačítko je do odpovědi zablokované.
2. V Gmailu klepnout na odkaz, potvrdit „Přihlásit se“ a přepnout zpět do aplikace Pneusklad. Aplikace bez dalšího klepnutí ukáže Dnes nového účtu s průvodcem a prázdným stavem („Nová sada na uskladnění“, „Naplnit ukázkovými daty“).
3. Počítač: v kartě A zadat e-mail. Odkaz z e-mailu otevřít v kartě B a přihlásit se. Po přepnutí do karty A je i ta přihlášená na Dnes.
4. Slabý signál: v Chrome DevTools zapnout Offline a klepnout „Začít zdarma“. Pod polem je „Něco se nepovedlo. Zkuste to prosím znovu.“, tlačítko jde znovu stisknout a v konzoli není „Uncaught (in promise)“.
5. Přihlášený účet: v DevTools zablokovat /api/nastaveni (Network request blocking) a obnovit stránku. Místo věčné kostry je pruh „Zkusit znovu“. Po odblokování a klepnutí se otevře Dnes.
6. Odhlášený na úvodu: tlačítko Zpět (i systémové na Androidu) neotevře Dnes.
7. Kontrola počítadla: na náhledu s VYVOJ v konzoli spustit setTimeout(() => { throw new Error("test") }) v kontextu prihlaseni.js (nebo dočasně vyvolat chybu). V D1 chyby_stranek musí být řádek obrazovka „prihlaseni“, místo „prihlaseni.js:N“, ne „jine“.
8. Regrese: zapsat sadu, vytisknout štítek, založit objednávku a připravit kola. Vše jako v buildu 17. Na webu i v aplikaci je volání /api/navsteva při úvodu vidět v záložce Network.
9. CI zelené: kontrola manifestu (včetně node --check pneusklad.js a prihlaseni.js), kontrola jazyků, vizuální kontrola, UAT a bezpečnostní kontrola.
10. Po 7 a 30 dnech: v metrikách SimteGen chyby na prihlaseni/nacitani pod 2 za 7 dní (jen naše soubory) a aspoň 3 nové účty ze zdroje google-play nebo z úvodu.

## Akceptační scénáře (CI je spustí proti API)
- Nepřihlášený návštěvník otevře GET /?aplikace=play a musí vidět pole e-mailu, #poslat-odkaz, data-ukazka, volání /api/navsteva, SimteGen.kdoJsem a skripty src="pneusklad.js" a src="prihlaseni.js".
- Nepřihlášený návštěvník otevře GET /prihlaseni.js a GET /pneusklad.js a musí dostat 200 se skriptem, který obsahuje posliOdkaz a /api/prihlaseni, resp. /api/nastaveni.
- Nepřihlášený návštěvník pošle POST /api/prihlaseni s e-mailem @example.cz a musí dostat 200 s odkazem /api/overeni?token= (vývojový režim CI).
- Nově přihlášený účet A zavolá GET /api/ja a GET /api/nastaveni a musí dostat 200 se svým e-mailem a zkušebním předplatným, tedy registrace a první přihlášení projdou až k datům, která aplikace načítá při startu.
- Nepřihlášený návštěvník pošle POST /api/chyba-stranky {obrazovka:"prihlaseni", misto:"prihlaseni.js:42"} a musí dostat 200 {"ok":true}, tedy nový tvar místa server přijme.
- Přihlášený účet B po zápisu sady účtem A zavolá GET /api/sady a GET /api/nastaveni a nesmí vidět žádnou sadu ani e-mail účtu A.

_Schvaluje se přes ARGA (simtegen_approve_spec) nebo na mini PC._