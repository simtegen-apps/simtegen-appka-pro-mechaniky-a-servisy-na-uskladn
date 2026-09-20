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
2. **`agregaty` je seznam jmen tabulek, ne objektů.** Šablona se mezitím
   obnovila a `kontrola_manifestu.py` už agregáty umí sám: tabulka uvedená
   v `agregaty` smí být bez `uzivatel_id`, ale kontrola jí zakáže jakýkoli
   sloupec, který vypadá jako osobní údaj. Držíme se toho tvaru, aby
   příští obnova šablony nešla proti manifestu. Text do zásad nese nový
   klíč `agregaty_popis`.
3. **Do generátoru přibyl jen aditivní blok.** `vykresli_zasady.py` nově
   vykresluje sekci „Co počítáme anonymně“ v zásadách a `A.5` v záznamu
   o zpracování, obojí jen když manifest nějaký agregát deklaruje. Žádná
   existující věta se nezměnila.
4. **Zkušební doba je 60 dní, ne 14.** V této větvi je `ZKUSEBNI_DNU = 60`
   (`spolecne.js`) a appka se podle toho chová. Do manifestu se proto
   doplnilo `zkusebni_dni: 60` — jinak by obchodní podmínky vykreslily
   šablonových 30 a slibovaly něco jiného, než kód dělá. Úvodní obrazovka
   bere číslo z konstanty `ZKUSEBNI_DNI` v `index.html`; mění se všechna
   tři místa najednou.
5. **`window.CENIK` v této větvi neexistoval — zavedl se.** Nese schválené
   ceny 89 / 129 / 249 Kč měsíčně za celou provozovnu. Protože v této
   větvi není modul předplatného ani objednávkové tlačítko, úvod cenu jen
   ukazuje a říká pravdu: „Po zkušebním období se vám ozveme; nic se
   nestrhává automaticky.“ Žádná částka se v HTML neopakuje, vykresluje
   se z ceníku.
6. **`web/index.html` nově linkuje `web/styl.css`.** Vyžaduje to obnovená
   kontrola (`_zkontroluj_design`). Appka si nechává vlastní starší
   vrstvu; srovnaná jsou jen místa, kde by se obě praly — `.obrazovka`,
   `.seznam`, `.prazdno`, `.stitek` (v appce je to vytištěný štítek, ne
   textový odznak), fokus pole a barva odkazů. Viz blok „Srovnání se
   styl.css“ v hlavičce stylu.
7. **Patička nese čtyři právní odkazy.** Generátor 2.0 vyrábí šest
   dokumentů místo jednoho; zásady, podmínky, zpracovatelská smlouva
   a formulář pro odstoupení patří do patičky, kterou vidí i nepřihlášený
   návštěvník.
8. **Doplněno `obsah_zakaznika_popis` a `subjekty_obsahu`** do manifestu,
   aby zpracovatelská smlouva popisovala pneuservis, a ne obecný obsah.
   Identifikační sloty (`ico`, `dic`, `sidlo`, `zapis_or`, `ucinnost_od`,
   `odpovedna_osoba`) zůstávají prázdné — patří majiteli.

## Co zbývá majiteli (blokuje zveřejnění úvodní stránky)

Úvodní obrazovka je veřejná nabídka placené služby s cenou. Dokud jsou
v generovaných dokumentech červené sloty „(doplnit …)“, nabízí služba cenu
bez identifikace prodávajícího. Před spuštěním náboru je potřeba vyplnit
v manifestu `ico`, `sidlo`, `dic` (nebo „nejsme plátci DPH“), `zapis_or`,
`ucinnost_od` a `odpovedna_osoba` a znovu spustit `python3
vykresli_zasady.py`. Appka o DPH mlčí, dokud to majitel nerozhodne —
raději nic než věta, kterou dokument nepotvrdí.