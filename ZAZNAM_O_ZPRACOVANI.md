<!-- GENEROVANÝ SOUBOR — neupravuj ručně. Zdroj: data-manifest.json, generátor: vykresli_zasady.py. -->
# Záznam o činnostech zpracování — Pneusklad — evidence uskladněných pneu

**Verze:** 2.0 · **poslední aktualizace:** (doplnit datum) · **zpracoval:** (doplnit jméno)
**Přezkoumat:** nejméně 1× ročně a při každé změně zpracování, zpracovatelů nebo účelů.

**Správce:** SimteGen s.r.o., IČO (doplnit), se sídlem (doplnit),
e-mail podpora@simtegen.cz, datová schránka (doplnit).
**Zástupce podle čl. 27 GDPR:** nejmenován (správce je usazen v EU).
**Pověřenec pro ochranu osobních údajů:** nejmenován — nesplněna žádná z podmínek čl. 37 GDPR.

Vedeno podle čl. 30 GDPR. Záznam má dvě části: **A** pro zpracování, kde je SimteGen s.r.o.
správcem, a **B** pro zpracování prováděná pro zákazníky, kde je SimteGen s.r.o. zpracovatelem.

---

## A. Záznam správce (čl. 30 odst. 1 GDPR)

### A.1 Účely a rozsah

| Entita / oblast | Účel | Kategorie subjektů | Kategorie údajů | Právní základ | Doba uložení |
|---|---|---|---|---|---|
| uzivatele | účet zákazníka a přihlášení | zákazníci služby | e-mailová adresa, čas založení účtu | čl. 6/1/b — plnění smlouvy | do smazání účtu zákazníkem |
| prihlasovaci_odkazy | jednorázové přihlášení e-mailovým odkazem | zákazníci služby | otisk tokenu, e-mailová adresa, expirace | čl. 6/1/b — plnění smlouvy | 24 hodin |
| relace | udržení přihlášení | zákazníci služby | otisk tokenu, odkaz na účet, expirace | čl. 6/1/b — plnění smlouvy | 30 dní od přihlášení |
| nastaveni_servisu | údaje servisu na štítek a nastavení aplikace | zákazníci služby | název, telefon a adresa provozovny, formát štítku, výchozí cena uskladnění, čítač kódů sad, tarif a konec zkušebního období, příznak zobrazení návodu, otevírací doba a pauza na oběd, počet souběžně odbavovaných zákazníků, čas vytvoření záznamu | čl. 6/1/b — plnění smlouvy | do smazání účtu zákazníkem |
| zakaznici | evidence motoristů, kterým servis skladuje pneu, a jejich kontaktování ohledně přezutí | zákazníci služby | jméno, telefon, e-mail (volitelně), poznámka, příznak ukázkových dat, čas vytvoření záznamu | čl. 6/1/b — plnění smlouvy | do smazání zákazníka v aplikaci nebo do smazání účtu |
| sady | evidence uskladněných sad pneu, tisk štítků a přehled nezaplaceného uskladnění | zákazníci služby | kód sady, odkaz na motoristu, registrační značka a popis vozidla, typ a rozměr pneu, počet kusů, dezén, údaj o montáži na discích, hloubky dezénu čtyř kol, pozice ve skladu, stav, datum příjmu a výdeje, cena a příznak zaplacení, poznámka, příznak ukázkových dat, čas vytvoření záznamu | čl. 6/1/b — plnění smlouvy | po dobu uskladnění a 24 měsíců po výdeji sady |
| pohyby | historie příjmů, výdejů a přesunů sady napříč sezónami | zákazníci služby | odkaz na sadu, typ pohybu, datum, poznámka, čas vytvoření záznamu | čl. 6/1/b — plnění smlouvy | 24 měsíců po výdeji sady |
| objednavky | objednávkový kalendář servisu a příprava kol na následující den | zákazníci služby | odkaz na motoristu a sadu nebo jméno bez evidence, datum a čas termínu, délka, úkon, údaj o montáži na discích, příznak celodenního čekání, stav, příznak připravenosti, poznámka, příznak ukázkových dat, čas vytvoření záznamu | čl. 6/1/b — plnění smlouvy | 24 měsíců od termínu |
| clenove | přístup dalších pracovníků servisu do aplikace a jejich oprávnění | zákazníci služby | e-mailová adresa pracovníka, role (správce, mechanik, jen čtení), čas vytvoření záznamu | čl. 6/1/b — plnění smlouvy | do odebrání pracovníka v aplikaci nebo do smazání účtu |
| provozní a bezpečnostní logy | provozní a bezpečnostní záznamy (logy) | zákazníci a návštěvníci | IP adresa, čas a typ požadavku, identifikace prohlížeče | čl. 6/1/f — oprávněný zájem | (doplnit skutečnou dobu, typicky 30 dnů) |
| podpora a komunikace | vyřízení dotazu nebo požadavku podpory | zákazníci, zájemci | e-mailová adresa a obsah komunikace | čl. 6/1/b, u nezákazníků čl. 6/1/f | (doplnit, typicky 1 rok) |
| účetní a daňové doklady | účetní a daňové doklady | zákazníci | fakturační údaje, částka, datum | čl. 6/1/c — právní povinnost | 10 let; vedeno mimo aplikaci |

**Oprávněný zájem (čl. 6/1/f)** je u logů vymezen jako zajištění provozu, dostupnosti
a bezpečnosti služby a možnost dohledat příčinu poruchy nebo útoku. Test proporcionality:
(doplnit odkaz na provedený balanční test nebo datum jeho provedení).

### A.2 Kategorie příjemců

Zpracovatelé uvedení v části A.3; účetní ((doplnit obchodní firmu)); orgány veřejné moci
v rozsahu, v jakém to ukládá zákon. Údaje se neprodávají ani nepředávají k reklamním účelům.

### A.3 Zpracovatelé a předávání mimo EU

| Zpracovatel | Co dělá | Umístění | Záruky pro předání mimo EU |
|---|---|---|---|
| Cloudflare, Inc. (USA) | hosting aplikace a databáze (primární instance v EU) | primární instance databáze v EU | standardní smluvní doložky EK (čl. 46/2/c), případně rámec EU–USA pro ochranu údajů |
| Resend (Plus Five Five, Inc.) (USA) | odeslání přihlašovacího odkazu a odeslání seznamu přípravy na následující den na e-mail servisu | USA / EU | standardní smluvní doložky EK (čl. 46/2/c), případně rámec EU–USA pro ochranu údajů |

Kopie záruk: uloženy u správce, na žádost poskytovány subjektům údajů.

### A.4 Technická a organizační opatření (obecný popis, čl. 30 odst. 1 písm. g)

Šifrovaný přenos (HTTPS) a šifrování dat v klidu; přihlášení bez hesel (jednorázové e-mailové
odkazy, v databázi jen otisky tokenů); oddělená databáze na produkt s primární instancí v EU;
oddělená testovací databáze bez produkčních dat; omezený a evidovaný přístup k produkci;
zálohování s přepisem do 30 dnů; smazání účtu zákazníkem přímo v aplikaci maže všechna jeho
data; písemný postup při incidentu v `POSTUP_PRI_INCIDENTU.md`; roční přezkum opatření.

### A.5 Anonymní agregáty (mimo působnost GDPR)

Tabulky `navstevy` nenesou `uzivatel_id` ani žádný osobní údaj. Počet zobrazení veřejné úvodní stránky a počet odeslaných žádostí o přihlašovací odkaz, sečtený po dnech a podle značky zdroje odkazu (např. „fb“, „vizitka“). Neukládáme IP adresu, identifikátor prohlížeče ani cookie a nepoužíváme žádný externí měřicí nástroj, takže z čísel nejde poznat jednotlivého člověka — jde o zobrazení, ne o návštěvníky. Záznamy mažeme po 24 měsících.

Nejde o osobní údaje — žádný z těchto záznamů nelze spojit s konkrétní osobou ani s účtem. Proto se jich netýká výpis údajů ani smazání účtu: v exportu je nenajdete a po smazání účtu zůstávají, protože k žádnému účtu nepatří.

---

## B. Záznam zpracovatele (čl. 30 odst. 2 GDPR)

SimteGen s.r.o. zpracovává osobní údaje jako **zpracovatel** pro zákazníky služby, kteří
do aplikace vkládají údaje třetích osob. Právním rámcem je
`web/zpracovatelska-smlouva.html` (čl. 28 GDPR), uzavíraná jako součást obchodních podmínek.

| Položka | Obsah |
|---|---|
| **Správci, pro které se zpracovává** | zákazníci služby Pneusklad — evidence uskladněných pneu; jmenný seznam vede správce v evidenci účtů (viz entita `uzivatele`) |
| **Kategorie zpracování** | uložení v databázi, zpřístupnění a zobrazení v aplikaci, zálohování, export na pokyn správce, výmaz |
| **Kategorie subjektů údajů** | motoristé, kterým servis skladuje nebo přezouvá pneumatiky, a pracovníci servisu, které správce pozve do aplikace |
| **Kategorie údajů** | jméno, telefon a případně e-mail motoristy, kterému servis skladuje pneumatiky, registrační značka a popis jeho vozidla, údaje o uskladněných sadách (rozměr, dezén, hloubky dezénu, pozice ve skladu, cena a stav zaplacení uskladnění), termíny objednávek do dílny a obsah poznámek, které pracovník servisu vyplní |
| **Zvláštní kategorie (čl. 9/10)** | služba k nim není určena; jejich vkládání je smluvně vyloučeno |
| **Další zpracovatelé** | Cloudflare, Inc.; Resend (Plus Five Five, Inc.) (viz A.3) |
| **Předání mimo EU** | jen na pokyn správce nebo v rámci dalších zpracovatelů, se zárukami podle A.3 |
| **Doba zpracování** | po dobu trvání smlouvy o službě; poté výmaz nebo vrácení dle volby správce |
| **Technická a organizační opatření** | shodná s A.4 |

---

## Poznámky k vedení záznamu

- Výjimka z vedení záznamu pro subjekty pod 250 zaměstnanců (čl. 30 odst. 5 GDPR)
  se **nepoužije**, protože zpracování probíhá pravidelně a není příležitostné.
- Záznam se na vyžádání předkládá Úřadu pro ochranu osobních údajů.
- Zdrojem je `data-manifest.json` tohoto repozitáře; generuje `vykresli_zasady.py`.
