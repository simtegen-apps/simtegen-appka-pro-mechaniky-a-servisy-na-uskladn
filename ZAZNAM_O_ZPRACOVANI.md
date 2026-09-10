<!-- GENEROVANÝ SOUBOR — neupravuj ručně. Zdroj: data-manifest.json, generátor: vykresli_zasady.py. -->
# Záznam o činnostech zpracování — Pneusklad — evidence uskladněných pneu

Správce: **SimteGen s.r.o.**, kontakt: podpora@simtegen.cz.
Vedeno podle čl. 30 GDPR; zdrojem je `data-manifest.json` tohoto repozitáře.

## Účely a rozsah

| Entita | Účel | Údaje | Doba uložení |
|---|---|---|---|
| uzivatele | účet zákazníka a přihlášení | e-mailová adresa, čas založení účtu | do smazání účtu zákazníkem |
| prihlasovaci_odkazy | jednorázové přihlášení e-mailovým odkazem | otisk tokenu, e-mailová adresa, expirace | 24 hodin |
| relace | udržení přihlášení | otisk tokenu, odkaz na účet, expirace | 30 dní od přihlášení |
| nastaveni_servisu | údaje servisu na štítek a nastavení aplikace | název, telefon a adresa provozovny, formát štítku, výchozí cena uskladnění, čítač kódů sad, tarif a konec zkušebního období, příznak zobrazení návodu, čas vytvoření záznamu | do smazání účtu zákazníkem |
| zakaznici | evidence motoristů, kterým servis skladuje pneu, a jejich kontaktování ohledně přezutí | jméno, telefon, e-mail (volitelně), poznámka, příznak ukázkových dat, čas vytvoření záznamu | do smazání zákazníka v aplikaci nebo do smazání účtu |
| sady | evidence uskladněných sad pneu, tisk štítků a přehled nezaplaceného uskladnění | kód sady, odkaz na motoristu, registrační značka a popis vozidla, typ a rozměr pneu, počet kusů, dezén, údaj o montáži na discích, hloubky dezénu čtyř kol, pozice ve skladu, stav, datum příjmu a výdeje, cena a příznak zaplacení, poznámka, příznak ukázkových dat, čas vytvoření záznamu | po dobu uskladnění a 24 měsíců po výdeji sady |
| pohyby | historie příjmů, výdejů a přesunů sady napříč sezónami | odkaz na sadu, typ pohybu, datum, poznámka, čas vytvoření záznamu | 24 měsíců po výdeji sady |
| objednavky | objednávkový kalendář servisu a příprava kol na následující den | odkaz na motoristu a sadu nebo jméno bez evidence, datum a čas termínu, délka, úkon, stav, příznak připravenosti, poznámka, příznak ukázkových dat, čas vytvoření záznamu | 24 měsíců od termínu |

Subjekty údajů: zákazníci služby. Právní základ: plnění smlouvy
(čl. 6 odst. 1 písm. b), zabezpečení služby jako oprávněný zájem
(čl. 6 odst. 1 písm. f).

## Zpracovatelé

Cloudflare (hosting aplikace a databáze (primární instance v EU)); Resend (odeslání přihlašovacího odkazu a odeslání seznamu přípravy na následující den na e-mail servisu). Předání mimo EU se řídí zpracovatelskými smlouvami uvedených
zpracovatelů (standardní smluvní doložky); primární instance databáze je
umístěna v EU.

## Technická a organizační opatření

Šifrovaný přenos (HTTPS), přihlášení bez hesel (jednorázové e-mailové
odkazy, v databázi jen otisky tokenů), oddělená databáze na produkt,
smazání účtu zákazníkem přímo v aplikaci maže všechna jeho data,
postup při incidentu v `POSTUP_PRI_INCIDENTU.md`.
