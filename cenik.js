// Schválený ceník — jediné místo v produktu, kde je napsaná částka.
//
// Proč vlastní modul: cena se objevuje na třech místech (úvodní obrazovka,
// objednávková obrazovka, objednávka na serveru) a dokud byla opsaná
// v každém z nich, byla to tři místa, která se můžou rozejít. Server si
// částku na objednávce počítá odtud a stránka si tentýž seznam bere přes
// /api/ja, takže v HTML neleží ani jedna číslice.
//
// Leží v kořeni vedle spolecne.js a predplatne.js: cokoli pod functions/ je
// kandidát na routu.
//
// Ceny jsou MĚSÍČNÍ a za celou provozovnu, ne za mechanika. Celková cena
// objednávky je prostý násobek počtu měsíců — žádné slevy, žádné dopočty,
// protože objednávka zavazující k platbě musí ukázat částku, která pak
// přijde na faktuře.

export const CENIK = {
  mena: "Kč",
  varianty: [
    {
      klic: "solo",
      nazev: "Sólo",
      mesic: 89,
      popis: "Pro jednoho mechanika.",
    },
    {
      klic: "zaklad",
      nazev: "Základ",
      mesic: 129,
      vychozi: true,
      popis: "Do 2 mechaniků. Evidence uskladněných pneu s tiskem štítků na "
        + "vlastní tiskárně, objednávkový kalendář s přípravou kol na zítřek "
        + "a přihlášení pro mechaniky.",
    },
    {
      klic: "tym",
      nazev: "Tým",
      mesic: 249,
      popis: "Pro větší tým.",
    },
  ],
};

// Nabízené délky předplatného. Šest měsíců je sezóna (kola leží v regálu od
// přezutí k přezutí), dvanáct je celý rok — na obojím stojí druhý nákup.
export const OBDOBI = [
  { mesice: 1, nazev: "1 měsíc" },
  { mesice: 3, nazev: "3 měsíce" },
  { mesice: 6, nazev: "Sezóna (6 měsíců)", vychozi: true },
  { mesice: 12, nazev: "Celý rok (12 měsíců)" },
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
