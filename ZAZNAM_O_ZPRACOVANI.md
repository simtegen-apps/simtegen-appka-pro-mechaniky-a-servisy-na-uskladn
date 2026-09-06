<!-- GENEROVANÝ SOUBOR — neupravuj ručně. Zdroj: data-manifest.json, generátor: vykresli_zasady.py. -->
# Záznam o činnostech zpracování — Produkt SimteGen

Správce: **SimteGen s.r.o.**, kontakt: (bude doplněn).
Vedeno podle čl. 30 GDPR; zdrojem je `data-manifest.json` tohoto repozitáře.

## Účely a rozsah

| Entita | Účel | Údaje | Doba uložení |
|---|---|---|---|
| uzivatele | účet zákazníka a přihlášení | e-mailová adresa, čas založení účtu | do smazání účtu zákazníkem |
| prihlasovaci_odkazy | jednorázové přihlášení e-mailovým odkazem | otisk tokenu, e-mailová adresa, expirace | 24 hodin |
| relace | udržení přihlášení | otisk tokenu, odkaz na účet, expirace | 30 dní od přihlášení |

Subjekty údajů: zákazníci služby. Právní základ: plnění smlouvy
(čl. 6 odst. 1 písm. b), zabezpečení služby jako oprávněný zájem
(čl. 6 odst. 1 písm. f).

## Zpracovatelé

Cloudflare (hosting aplikace a databáze (primární instance v EU)); Resend (odeslání přihlašovacího odkazu na e-mail). Předání mimo EU se řídí zpracovatelskými smlouvami uvedených
zpracovatelů (standardní smluvní doložky); primární instance databáze je
umístěna v EU.

## Technická a organizační opatření

Šifrovaný přenos (HTTPS), přihlášení bez hesel (jednorázové e-mailové
odkazy, v databázi jen otisky tokenů), oddělená databáze na produkt,
smazání účtu zákazníkem přímo v aplikaci maže všechna jeho data,
postup při incidentu v `POSTUP_PRI_INCIDENTU.md`.
