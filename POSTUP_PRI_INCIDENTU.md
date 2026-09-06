# Postup při bezpečnostním incidentu

Platí pro každý produkt z této šablony. „Incidentem" se myslí důvodné
podezření, že se k uloženým údajům dostal někdo nepovolaný (únik databáze,
kompromitovaný token, chyba zpřístupňující cizí data).

1. **Zastav škodu (hned).** Otoč Cloudflare API token a RESEND_API_KEY,
   smaž všechny relace (`DELETE FROM relace`), v krajním případě pozastav
   Pages projekt. Nic z toho nepotřebuje ničí souhlas.
2. **Zapiš, co se stalo** — čas zjištění, co uniklo (které entity
   z `data-manifest.json`), kolika účtů se to týká, jak k tomu došlo.
   Bez zápisu se nedá splnit ohlašovací povinnost.
3. **Do 72 hodin od zjištění** ohlas incident Úřadu pro ochranu osobních
   údajů (https://uoou.gov.cz, formulář pro ohlášení porušení zabezpečení),
   pokud únik představuje riziko pro dotčené osoby. U této šablony uniká
   nejvýš e-mail + data deklarovaná v manifestu — to riziko zpravidla je.
4. **Informuj dotčené zákazníky** bez zbytečného odkladu na uložené
   e-maily: co uniklo, co s tím děláme, co mají udělat oni.
5. **Oprav příčinu** normální cestou (build větev → recenze → merge)
   a doplň poučení do tohoto souboru v šabloně, ať ho zdědí další produkty.

Kontakt na správce je v `data-manifest.json` (`kontakt_email`).
