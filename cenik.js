// Schválený ceník — jediné místo v produktu, kde je napsaná částka.
//
// Proč vlastní modul: cena se objevuje na třech místech (úvodní obrazovka,
// obrazovka Předplatné, objednávka na serveru) a dokud byla opsaná
// v každém z nich, byla to tři místa, která se můžou rozejít. Server si
// částku na objednávce počítá odtud a stránka si tentýž seznam bere přes
// /api/ja, takže v HTML neleží ani jedna číslice.
//
// Leží v kořeni vedle spolecne.js a predplatne.js: cokoli pod functions/ je
// kandidát na routu.
//
// Ceny schválil majitel (build 10) a appka je ukazuje PŘESNĚ takhle: cena,
// za ní `jednotka` doslova ze schválení, u Standardu i to, co obsahuje.
// Ceny jsou za celou provozovnu, ne za mechanika. Varianta má `obdobi` —
// kolik měsíců pokryje jedna platba (měsíc, nebo sezóna = 6 měsíců).
// Celková cena fakturační objednávky je prostý násobek počtu období —
// žádné slevy, žádné dopočty, protože objednávka zavazující k platbě musí
// ukázat částku, která pak přijde na faktuře.
//
// V aplikaci z Google Play se platí přes Google Play; ceny tam nastavuje
// majitel v Play Console a musí sedět s tímhle souborem (README, Google Play).

export const CENIK = {
  mena: "Kč",
  varianty: [
    {
      klic: "standard",
      nazev: "Standard",
      cena: 129,
      jednotka: "firma / měsíc",
      obdobi: 1,
      vychozi: true,
      popis: "Evidence uskladněných pneu s tiskem štítků (vlastní tiskárna "
        + "štítků), objednávkový kalendář s připomínkou pro mechanika, "
        + "neomezený počet záznamů, 1–2 přihlášení. Kredit na štítky nad "
        + "rámec běžné spotřeby se dokupuje zvlášť.",
    },
    {
      klic: "sezona",
      nazev: "Sezónní vstup",
      cena: 790,
      jednotka: "sezóna (6 měsíců)",
      obdobi: 6,
      popis: "",
    },
    {
      klic: "vetsi",
      nazev: "Větší provozovna",
      cena: 229,
      jednotka: "firma / měsíc",
      obdobi: 1,
      popis: "",
    },
  ],
};

// Nabízené délky fakturační objednávky u měsíčních variant. Šest měsíců je
// sezóna (kola leží v regálu od přezutí k přezutí), dvanáct je celý rok —
// na obojím stojí druhý nákup. Sezónní vstup se objednává po jedné sezóně
// (viz delkyVarianty).
export const OBDOBI = [
  { mesice: 1, nazev: "1 měsíc" },
  { mesice: 3, nazev: "3 měsíce" },
  { mesice: 6, nazev: "6 měsíců", vychozi: true },
  { mesice: 12, nazev: "12 měsíců" },
];

// Zrcadlí klíč `cena_dph` v data-manifest.json, odkud ho generátor píše do
// obchodních podmínek. Dokud je prázdný, appka o DPH MLČÍ: odkazovat
// u zavazujícího tlačítka na dokument, který daňový režim neuvádí, je horší
// než neříct nic. Majitel mění obě místa najednou.
export const CENA_DPH = "";

export function variantaPodleKlice(klic) {
  const hledany = String(klic || "").trim();
  return CENIK.varianty.find((v) => v.klic === hledany) || null;
}

export function vychoziVarianta() {
  return CENIK.varianty.find((v) => v.vychozi) || CENIK.varianty[0];
}

// Délky (v měsících), které jde u varianty objednat: měsíční varianta
// 1/3/6/12, sezónní jen jednu sezónu — její cena je cena za sezónu a nic
// se z ní nedopočítává.
export function delkyVarianty(varianta) {
  if (!varianta) return [];
  if (varianta.obdobi > 1) return [varianta.obdobi];
  return OBDOBI.map((o) => o.mesice);
}

// Celková částka objednávky: cena za období × počet období. null, když
// délka k variantě nepatří.
export function cenaObjednavky(varianta, mesice) {
  if (!varianta || !delkyVarianty(varianta).includes(mesice)) return null;
  return varianta.cena * (mesice / varianta.obdobi);
}
