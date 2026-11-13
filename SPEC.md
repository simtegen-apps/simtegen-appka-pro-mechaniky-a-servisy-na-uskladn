# Specifikace — build 17

Build 16 zjednoduší hotový Pneusklad jen v textech a rozložení, funkce ani data se nemění. Úvod bude mít hlavní větu, podvětu, tři krátké přednosti, jednu kartu ceny s jedním tarifem a větou o zkušebním období a jedno tlačítko. Z hlavičky, z Dnes i z Nastavení zmizí volba jazyka. Jazyk se zvolí sám a ručně se mění jen jedním řádkem v Účtu. Přepínač měny v produktu nebude. Patička s právními odkazy na jednom malém řádku bude jen na úvodu a v Účtu, spodní menu se ukáže až po přihlášení. Zmizí vysvětlující odstavce pod nadpisy sekcí a prázdné stavy budou mít jeden řádek, česky i anglicky.

## Placená hodnota (proč přijde druhý nákup)
Servis dál platí 129 Kč měsíčně za provozovnu za evidenci, kde leží čí kola, za tisk štítků a za objednávky s připomínkou. Druhý nákup přichází každou sezónu, protože kola zůstávají v regálu a evidence se přenáší ze sezóny do sezóny. Tento build tu hodnotu chrání: platící zákazník appku označil za nepřehlednou a kratší obrazovky odstraní důvod odejít, aniž by se změnila jediná funkce nebo jediný údaj.

## Design (obrazovky, navigace, stavy)
BARVA PRODUKTU: beze změny #c2410c (pálená oranžová). Je to barva pryže a výstražných štítků v dílně. Kontrast na papíře #f6f4ef vychází přibližně 4,7:1, tedy ≥ 4,5:1 (SPEC buildu 15 uváděl 6,7:1, to byla chyba výpočtu; CI to stejně přepočítá). web/produkt.css se nemění. Návrhový systém v3 se nemění: žádná nová třída ani barva. Do <style> v index.html přibudou jen pravidla viditelnosti (patička, menu) bez barev.

TYPY OBRAZOVEK: všechny zůstávají PŘEHLED. Nástroj produkt nemá a mít nebude: zákazník nic neskládá, sada se zapisuje a štítek se tiskne. Obrazovky ani jejich hlavní akce se nemění:
1) Načítání (#obrazovka-nacitani): .kostra, beze změny.
2) Úvod a přihlášení (#obrazovka-prihlaseni), přehled. Na obrazovce je jen tohle:
   - H1 .titulek-velky „Víte, kde má který zákazník uložené pneu?“ (beze změny, drží SEO a UAT)
   - podvěta jako jeden <p> „Pro malé a mobilní pneuservisy. Bez instalace.“
   - tři přednosti jako .seznam bez druhého řádku: „Evidence pneu přes všechny sezóny“, „Štítky z vaší tiskárny“, „Připomínka den před přezutím“
   - ceník jako jedna .karta.vykres: .stitek „Standard“, .cislo-obri `<span data-cena="doporuceni">`, vedle `<span data-cena-jednotka="doporuceni">`, a jedna věta „Prvních 30 dní zdarma, bez karty.“ (počet dní ze zkusebni_dni)
   - pole „E-mail provozovny“ s nápovědou „Pošleme vám odkaz, heslo nepotřebujete.“
   - hlavní akce „Začít zdarma“ v .lista-dole
   Zmizí: nadpis sekce Přihlášení, odstavec o datech v EU, druhé řádky předností, „Cena od“, celá sekce Ceník se třemi variantami, nadpis a odstavec sekce ukázky a tlačítko English.
   - Ukázka: tlačítko data-ukazka (vedlejší) zůstává kvůli pravidlům Google Play, ale s třídou .jen-v-aplikaci. Na webu je tak na úvodu opravdu jedno tlačítko.
   - Měna: částku dává simtegen.js podle země (CZ = Kč, Evropa = EUR, jinde USD), žádný data-prepinac-meny.
   - Tablet a notebook: .mrizka s7 vlevo (H1, podvěta, přednosti) a s5 vpravo (karta ceny, e-mail, tlačítko). Patička je pod obsahem na celou šířku.
   - Načítání: .kostra místo částky, dokud nedorazí cenik.json. Chyba: když se ceník nenačte, karta zůstane skrytá (žádný prázdný rám) a přihlášení funguje dál. Chyba odeslání odkazu se ukáže pod polem jako dosud.
3) Dnes (#obrazovka-dnes), přehled, hlavní akce „Nová sada na uskladnění“. Zmizí nabídka #jazyk-nabidka. Prázdný stav: „Zapište první uskladněnou sadu.“ a vedlejší „Naplnit ukázkovými daty“ (data-ukazkova-data, jen vlastník). Sekce Stav dne, Najít a Dnešní objednávky zůstávají. Načítání .kostra, chyba .hlaska.chyba jako dosud.
4) Sklad, přehled. Prázdný stav: „V regálu zatím nic neleží.“
5) Zákazníci, přehled. Prázdný stav: „Zatím žádní zákazníci.“
6) Zákazník a 7) Sada (detail), přehled, beze změny rozložení.
8) Nová sada (průvodce 4 kroky), přehled. Zmizí odstavec pod „Hloubka dezénu“, pole dostane jen nápovědu „V mm, nepovinné.“
9) Objednávky, přehled. Prázdný stav: „Tento týden žádné objednávky.“
10) Nová objednávka, přehled, beze změny.
11) Příprava kol, přehled. Prázdný stav: „Na tento den nic naplánováno.“
12) Sezónní přehled, přehled. Zmizí odstavce pod třemi sekcemi (obvolat, opotřebené, nezaplacené), nadpis s počtem zůstane. Prázdný stav: „Přehled se naplní s první sadou.“
13) Nastavení, přehled, hlavní akce „Uložit nastavení“. Zmizí odstavec pod Provoz a řádek „Jazyk aplikace · Language“. Řádky Předplatné, Tým a Účet a data zůstávají jako cesta do podobrazovek.
14) Tým, přehled, hlavní akce „Přidat kolegu“. Zmizí odstavec o rolích (role jsou vidět na přepínači). Prázdný stav: „Zatím jste tu sami.“
15) Účet a data (#obrazovka-ucet), přehled, hlavní akce „Stáhnout moje data“, vedlejší „Odhlásit se“. Sekce bez odstavců: Vaše data, Ukázková data, Odejít ze servisu (jen člen cizího servisu) a Smazání účtu (nevratnost řekne potvrzovací panel SimteGen.potvrd). Karta Doporučit kolegovi zůstane jen s tlačítkem. Nově přibudou jeden řádek „Jazyk“ se slotem `<div data-prepinac-jazyka>` (Čeština | English kreslí simtegen.js) a řádek „Nápověda“ (odkaz na napoveda.html, lang="cs"). Dole je patička.
16) Předplatné, přehled, hlavní akce „Objednávka zavazující k platbě“ (jen web), v aplikaci nákup přes data-predplatne-play. Samostatná sekce Ceník s odstavci (seznam variant a „Cena je za provozovnu…“) zmizí. Ceny jsou vidět ve volbě varianty a v „Celkem k úhradě“ přímo v objednávce, takže volba varianty zůstává (je to funkce). Chyba načtení: jeden řádek „Stav předplatného se nepodařilo načíst.“ a tlačítko Zkusit znovu.

PATIČKA: jen na úvodu a v Účtu. Řeší to body[data-obrazovka] nastavovaný v ukaz(id) a pravidlo .paticka { display:none }, kromě těchto dvou obrazovek. Obsah je jeden malý řádek .popisek: „Zásady · Podmínky · Smlouva o zpracování · Odstoupení“. Podmínky a Odstoupení mají data-objednavka, takže je aplikace z Google Play skryje. V angličtině řádek začíná „In Czech:“. Nahlásit chybu z patičky zmizí, zůstává v menu (tablet, notebook) a v hlavičce (telefon).

NAVIGACE: beze změny 4 položky (Dnes · Sklad · Objednávky · Nastavení). Na telefonu se spodní pás ukáže až po přihlášení (body:not(.prihlasen) .navigace skryté pod 768 px a .lista-dole pak sedí u spodní hrany). Na tabletu a notebooku zůstává před přihlášením levý pruh jen se značkou a Nahlásit chybu. Kliky: hlavní hodnota je na 0–1 klepnutí (Dnes, Sklad), štítek na 2 (Sklad → sada → Tisk), jazyk na 3 (Nastavení → Účet a data → řádek Jazyk). Každá podobrazovka má dál vlastní šipku Zpět.

JAZYK: volí se sám. Před přihlášením platí volba šablony (?jazyk=, ruční volba, jazyk prohlížeče, slovenština = čeština). Po přihlášení má přednost uložená volba účtu (/api/jazyk), bez volby (null) zůstane automatika a nic se nevynucuje. Ruční změna jde jen přes řádek v Účtu. Uloží se k účtu jako dosud a po novém načtení se aplikace vrátí do Účtu a ukáže „Jazyk uložen“ s Vrátit.

TEXTY: slovní limity podle nové části Text v DESIGN.md. Cíle stavby: H1 ≤ 8 slov, podvěta ≤ 8, přednost ≤ 5, tlačítko ≤ 4, prázdný stav jedna věta ≤ 8 slov, žádný .popisek pod .sekce-titulek. Angličtina se zkrátí stejně, například „Record your first stored set.“, „Nothing on the rack yet.“, „First 30 days free, no card.“

## Plán
1. Obnova šablony (stavba, ne stavitel): převzít aktuální DESIGN.md (nová část Text), web/styl.css, web/simtegen.js, web/ikony.svg a kontrolní skripty. Přečíst novou část Text a pokud jsou její limity přísnější než cíle ve specifikaci, platí limity šablony.
2. web/index.html, úvod: přestavět #obrazovka-prihlaseni podle Designu. Cena přes data-cena="doporuceni" a data-cena-jednotka="doporuceni" z web/cenik.json, žádný data-prepinac-meny. Smazat #uvod-cenik-sekce a vykresliUvod() zjednodušit na větu o zkušebním období. Obal tlačítka data-ukazka dostane .jen-v-aplikaci. Zachovat #email, #poslat-odkaz, POST /api/navsteva {stranka:"uvod"} a celou cestu přihlášení beze změny.
3. web/index.html, jazyk: odstranit #hlavicka-jazyk, #jazyk-nabidka, řádek #nast-jazyk a k nim JS (nabidniJazyk, zNabidky, predPrihlasenimAnglicky, obsluhu tlačítek). V srovnejJazyk() při volbě null jazyk nevynucovat (cil = volba || SimteGen.jazyk()). V #obrazovka-ucet přidat jeden .radek se slotem data-prepinac-jazyka. Stávající zachycení kliku v [data-prepinac-jazyka] (POST /api/jazyk s keepalive) doplnit o značku jazyk-zmenen, aby se aplikace po novém načtení vrátila do Účtu (poPrepnutiJazyka → ukaz("obrazovka-ucet")).
4. web/index.html, patička a menu: v ukaz(id) nastavit document.body.dataset.obrazovka. Do <style> přidat: .paticka viditelná jen pro obrazovka-prihlaseni a obrazovka-ucet. Pod 768 px body:not(.prihlasen) .navigace { display:none } a .lista-dole { bottom: env(safe-area-inset-bottom) }. Patičku přepsat na jeden řádek právních odkazů s „·“, Nápovědu přesunout jako řádek do Účtu, Nahlásit chybu z patičky odstranit.
5. web/index.html, sekce: smazat všechny .popisek přímo pod .sekce-titulek (provoz, tým, účet, ukázková data, odejít, smazání, hloubka dezénu, tři sekce Sezónního přehledu ve funkci sekce(), Ceník na Předplatném). Zrušit samostatnou sekci Ceník na Předplatném. Kartu Doporučit zkrátit na tlačítko. ID, data-objednavka, data-predplatne-play, data-ukazka a data-ukazkova-data zůstávají.
6. web/texty.js: zkrátit české i anglické texty podle limitů (prázdné stavy, přednosti, podvěta, nápověda e-mailu, zkušební věta, patička). Smazat klíče, které nikdo nepoužívá (uvod.*_popis, nast.provoz_popis, tym.popis, ucet.*_popis, jazyk.nabidka…, nast.jazyk…). Oba jazyky musí mít stejné klíče a {proměnné} (kontrola_jazyku.py).
7. uat/scenare.json: scénář úvodu upravit na nové přednosti a na data-cena="doporuceni" místo #uvod-cena-cislo. Doplnit neobsahuje: „hlavicka-jazyk“, „jazyk-nabidka“, „data-prepinac-meny“. Přidat scénáře z pole akceptace. Scénář „Ceník a zkušební doba…“ (/api/ja) zůstává, server se nemění.
8. napoveda.json: téma „Aplikace v angličtině“ přepsat (jazyk se volí sám, ručně v Nastavení → Účet a data → Jazyk) a téma Tým (odchod ze servisu) srovnat s novými názvy. Vygeneruje vykresli_napovedu.py.
9. play/co_je_noveho.txt přepsat, například: „Aplikace je přehlednější: kratší texty, jednodušší úvodní obrazovka a méně odstavců. Jazyk se nastaví sám podle telefonu, změníte ho v Nastavení → Účet a data. Evidence, štítky, objednávky ani ceny se nemění.“
10. README.md (krátká poznámka o jazyce a patičce) a SPEC.md (specifikace buildu 16 a seznam souborů změněných mimo rozsah).
11. Bez zásahu: data-manifest.json (žádná nová entita, služba, cookie ani úložiště, sg-volba už v zásadách je), migrace, functions/** včetně _middleware.js, overeni.js a jazyk.js, cenik.js, web/cenik.json, web/play.js, web/produkt.css, .github/. Modul SCHRÁNKA (hlaseni.js, migrace hlášení) do tohoto buildu nepatří: majitel zakázal měnit funkce a data a hlášení dnes obsluhuje nahlasit.js. Je to samostatná stavba.
12. Generátory pustí člověk (Python tu neběží): python vykresli_napovedu.py, python vykresli_seo.py (meta zůstávají, ale kontrola porovnává), python vykresli_aplikaci.py a pak python kontrola_manifestu.py, python kontrola_jazyku.py, python uat_kontrola.py a vizualni_kontrola.py.

## Soubory
- web/index.html
- web/texty.js
- uat/scenare.json
- napoveda.json
- web/napoveda.html (generuje vykresli_napovedu.py)
- play/co_je_noveho.txt
- README.md
- SPEC.md
- obnova šablony, ne stavitel: DESIGN.md, web/styl.css, web/simtegen.js, web/ikony.svg, kontrolní skripty (*_kontrola.py, kontrola_jazyku.py, vykresli_*.py); kdyby obnova přinesla změny v functions/api/_middleware.js, web/play.js nebo .github/workflows/deploy.yml, uvést je v PR jako obnovu šablony

## Rizika
- Jazyk se volí sám: stávající česky mluvící uživatel s telefonem nastaveným anglicky, který jazyk nikdy nezvolil, uvidí po buildu aplikaci anglicky. Majitel to výslovně chce. Návrat je jedno klepnutí v Účtu a volba se uloží k účtu. Zmíní to co_je_noveho.txt a nápověda.
- Měna podle země: zahraniční návštěvník uvidí na úvodu 4,90 € (schválený web/cenik.json), ale fakturační objednávka je dál jen v Kč a v aplikaci platí cena z Google Play. Podle šablony je to záměr, ale majitel by měl potvrdit, že na úvodu stačí cena v jiné měně a placení zůstává v Kč.
- Jeden tarif na úvodu: Sezónní vstup a Větší provozovna zmizí z úvodu, ale v objednávce na Předplatném se dál dají vybrat, protože majitel zakázal měnit funkce. Kdyby chtěl prodávat jen Standard, je to změna ceníku a objednávky a patří do jiného zadání.
- Neznámé limity slov: nová část Text v DESIGN.md v repu zatím není, přijde s obnovou šablony. Cíle ve specifikaci jsou odhad. Při přísnější kontrole se texty zkrátí víc, struktura zůstává.
- Patička na jednom řádku na 360 px: „Zásady · Podmínky · Smlouva o zpracování · Odstoupení“ je na hraně šířky. Kdyby se nevešla, zkrátí se popisky odkazů (názvy dokumentů na stránkách zůstanou celé), řádek se nezalomí.
- Ukázka jen v aplikaci: kontrola Google Play hledá data-ukazka v aplikaci, kde zůstává. Kdyby vizuální kontrola vyžadovala viditelné tlačítko i na webu, vrátí se jako vedlejší tlačítko bez odstavce.
- Tablet bez menu před přihlášením: zůstává levý pruh se značkou a Nahlásit chybu. Kdyby recenzent chtěl i tam plochu bez menu, je to jedno pravidlo v CSS.
- Generátory a kontroly tu nejdou spustit (Python ani Node), před CI je musí pustit člověk.

## Jak ověřit
1. Telefon 360×740, anonymní okno, https://pneusklad.simtegen.com: vidíte jen H1, podvětu, tři krátké přednosti, kartu „Standard 129 Kč / firma / měsíc“ s větou „Prvních 30 dní zdarma, bez karty.“, pole e-mailu a jedno černé tlačítko „Začít zdarma“. Dole nesmí být spodní menu, tlačítko English ani přepínač měny. Pod tím je jeden řádek právních odkazů.
2. Totéž přes VPN z Německa: cena je 4,90 € a přepínač měny nikde není.
3. Přihlásit se odkazem: spodní menu se objeví a patička zmizí na Dnes, Skladu, Objednávkách i Nastavení. Nový účet: na Dnes je jednořádkový prázdný stav, „Nová sada na uskladnění“ a „Naplnit ukázkovými daty“.
4. Projít Sklad, Zákazníky, Objednávky, Přípravu, Sezónní přehled, Nastavení, Tým a Předplatné: pod nadpisy sekcí nesmí být žádný vysvětlující odstavec a prázdné stavy mají jeden řádek. Zapsat sadu, vytisknout štítek, založit objednávku a připravit kola: vše funguje jako v buildu 15.
5. Nastavení → Účet a data: je tu řádek Jazyk (Čeština | English), řádek Nápověda a dole patička. Přepnout na English: aplikace se znovu otevře v Účtu, anglicky, s „Language saved“ a Vrátit. Na druhém zařízení se stejným účtem je rovnou anglicky.
6. Totéž s ?jazyk=en a na tabletu 820 px a notebooku 1440 px: úvod ve dvou sloupcích, patička na celou šířku, levé menu jen se značkou a Nahlásit chybu.
7. Aplikace z Google Play: na úvodu je navíc vedlejší „Vyzkoušet ukázku“, v patičce jen Zásady a Smlouva o zpracování, nikde faktura ani převod.
8. CI zelené: kontrola jazyků, vizuální kontrola (počet slov, jedno černé tlačítko, 13 px, EN bez diakritiky), UAT a kontrola manifestu.

## Akceptační scénáře (CI je spustí proti API)
- Nepřihlášený návštěvník otevře GET / a musí vidět nadpis „Víte, kde má který zákazník uložené pneu?“, data-cena="doporuceni", pole e-mailu a #poslat-odkaz, a nesmí vidět hlavicka-jazyk, jazyk-nabidka ani data-prepinac-meny.
- Přihlášený účet A založí přes POST /api/sady sadu s pozicí v regálu a pak ji dostane přes GET /api/sady/{id} se stejným kódem a pozicí, tedy evidence funguje beze změny.
- Přihlášený účet B po zápisu účtu A zavolá GET /api/sady a GET /api/jazyk a nesmí vidět žádnou sadu účtu A ani jeho jazykovou volbu.
- Přihlášený účet A pošle POST /api/jazyk {"jazyk":"en"} a GET /api/jazyk musí vrátit „en“, které je i v GET /api/ucet/export v tabulce predvolby.
- Nepřihlášený návštěvník zavolá GET /api/ja a musí vidět ceník se Standardem za 129 a "zkusebni_dni":30, bez jakéhokoli e-mailu.

_Schvaluje se přes ARGA (simtegen_approve_spec) nebo na mini PC._