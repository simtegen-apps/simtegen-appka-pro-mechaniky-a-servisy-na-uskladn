# Google Play — co vyplnit v Play Console

GENEROVANÝ SOUBOR z data-manifest.json (`python vykresli_aplikaci.py`) — needituj ručně.
Kde je `<adresa>`, doplň adresu produktu (vlastní doména, nebo `<repo>.pages.dev`).

## 1. Hlavní záznam v obchodě (Main store listing)

Workflow Vydání ho nahrává sám, jakmile má servisní účet. Ručně jen poprvé, nebo bez něj:

- **Název aplikace:** Pneusklad: uskladnění pneu
- **Krátký popis:** Evidence uskladněných pneu, štítky a objednávky pro malé pneuservisy.
- **Kategorie:** Firmy (`BUSINESS`) — v Play Console: Nastavení obchodu
- **Kontaktní e-mail:** support@simtegen.com
- **Web:** `<adresa>`
- **Úplný popis:**

```
Pneusklad je evidence uskladněných pneumatik pro malé a mobilní pneuservisy. Ke každé sadě zapíšete zákazníka, registrační značku, rozměr, dezén, hloubku dezénu všech čtyř kol a místo v regálu. Aplikace sadě přidělí kód a vytiskne štítek na vaší tiskárně štítků (role 100 × 50 mm) nebo na archy A4.

Objednávkový kalendář plní mechanik: zapíše, kdo kdy přijede a co se bude dělat. Den předem aplikace ukáže seznam kol, která je potřeba připravit, i s místem ve skladu. Seznam si můžete poslat e-mailem nebo uložit jako připomínku do kalendáře v telefonu.

Před sezónou uvidíte, koho obvolat na přezutí, které sady mají méně než 4 mm dezénu a kdo nemá zaplacené uskladnění.

Do servisu se mohou přihlásit i kolegové s oprávněním správce, mechanik nebo jen čtení. Přihlašujete se odkazem z e-mailu, bez hesla. Data jsou uložena v Evropské unii a kdykoli si je v aplikaci stáhnete nebo smažete.

Prvních 30 dní je zdarma. Potom předplatné Standard za celou provozovnu: 129 Kč měsíčně přes Google Play. Obnovuje se automaticky a zrušit ho můžete kdykoli v Google Play. Bez registrace si můžete vyzkoušet ukázku s vymyšlenými daty.
```

## 2. Zásady ochrany soukromí (Privacy policy)

`<adresa>/zasady.html`

## 3. Bezpečnost údajů (Data safety)

Vyplní se sama: workflow Vydání ji s každým vydáním posílá Googlu (`bezpecnost_dat.csv`). Níž je totéž ke kontrole.

1. *Shromažďuje nebo sdílí aplikace některý z požadovaných typů uživatelských údajů?* **Ano**
2. *Jsou všechny shromážděné údaje šifrovány při přenosu?* **Ano** (jen HTTPS)
3. *Poskytujete uživatelům způsob, jak požádat o smazání údajů?* **Ano** — v aplikaci Účet → Smazat účet a všechna data; popis na webu.
4. *Metoda vytvoření účtu:* **Uživatelské jméno a další ověření** (e-mail + jednorázový odkaz, bez hesla). Odkaz na smazání účtu: `<adresa>/zasady.html`

**Sdílení: u žádného typu Ne.** Cloudflare (hosting, databáze), Resend (e-maily) a GitHub (evidence hlášení, šifrovaně) zpracovávají údaje pro nás — Google je za sdílení nepočítá.
**Zpracování dočasné (ephemeral): Ne** — údaje se ukládají.

| Kategorie | Typ údajů | Shromažďováno | Povinné? | Účely | Odkud (manifest) |
|---|---|---|---|---|---|
| Osobní údaje (Personal info) | E-mailová adresa (Email address) | Ano | povinné | Funkce aplikace (App functionality), Správa účtu (Account management), Prevence podvodů, zabezpečení a dodržování předpisů (Fraud prevention, security, and compliance) | uzivatele, prihlasovaci_odkazy, zakaznici, clenove |
| Osobní údaje (Personal info) | Jméno (Name) | Ano | povinné | Funkce aplikace (App functionality), Správa účtu (Account management) | nastaveni_servisu, zakaznici, objednavky, objednavky_predplatneho |
| Osobní údaje (Personal info) | Adresa (Address) | Ano | volitelné | Funkce aplikace (App functionality), Správa účtu (Account management) | nastaveni_servisu, objednavky_predplatneho |
| Osobní údaje (Personal info) | Telefonní číslo (Phone number) | Ano | povinné | Funkce aplikace (App functionality) | nastaveni_servisu, zakaznici |
| Osobní údaje (Personal info) | Jiné informace (Other info) | Ano | povinné | Funkce aplikace (App functionality) | sady |
| Finanční údaje (Financial info) | Historie nákupů (Purchase history) | Ano | povinné | Funkce aplikace (App functionality), Správa účtu (Account management) | predplatne, platby, objednavky_predplatneho, play_nakupy |
| Finanční údaje (Financial info) | Jiné finanční údaje (Other financial info) | Ano | povinné | Funkce aplikace (App functionality), Správa účtu (Account management) | sady, objednavky_predplatneho |
| Zprávy (Messages) | Jiné zprávy v aplikaci (Other in-app messages) | Ano | volitelné | Funkce aplikace (App functionality), Komunikace vývojáře (Developer communications) | hlášení chyb (tlačítko Nahlásit chybu) |
| Aktivita v aplikaci (App activity) | Jiný obsah vytvořený uživatelem (Other user-generated content) | Ano | povinné | Funkce aplikace (App functionality) | zakaznici, sady, pohyby, objednavky |
| Aktivita v aplikaci (App activity) | Interakce s aplikací (App interactions) | Ano | volitelné | Analýza (Analytics) | zdroj příchodu (odkaz z kampaně) |
| Kalendář (Calendar) | Události v kalendáři (Calendar events) | Ano | povinné | Funkce aplikace (App functionality) | objednavky |
| Informace o aplikaci a výkonu (App info and performance) | Diagnostika (Diagnostics) | Ano | volitelné | Funkce aplikace (App functionality), Komunikace vývojáře (Developer communications) | hlášení chyb (tlačítko Nahlásit chybu) |

## 4. Obsah aplikace — ostatní prohlášení (App content)

- **Reklamy:** Ne, aplikace neobsahuje reklamy.
- **Cílová skupina:** 18 let a více.
- **Hodnocení obsahu (dotazník IARC):** kategorie Nástroje / Produktivita; na otázky o násilí, sexu, vulgaritách, drogách, hazardu a sdílení polohy odpověz Ne. Uživatelé spolu v aplikaci nekomunikují.
- **Zpravodajská aplikace / vládní aplikace / finanční funkce / zdraví:** Ne.
- **Přístup k aplikaci (App access):** Všechny funkce nebo jejich část jsou omezené → Přidat pokyny. Název: `Ukázka`; uživatelské jméno a heslo nevyplňuj; do „Další informace“ vlož:

```
No login credentials are needed. On the start screen tap "Vyzkoušet ukázku" (Try the demo): the app creates a temporary account with sample data and all paid features unlocked; it is deleted after 24 hours. Sign-in for real customers is by a one-time link sent to their e-mail (no password). Purchases are disabled in the demo account; the subscription offer and its terms are shown there.
```
