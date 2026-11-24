// The product's mails to its customers in the product's own dress.
//
// Every mail goes out as multipart: the text part is what it always was
// (the record — § 1837 l "textual form", the words the tests pin), and this
// builds the HTML part from THAT text, line for line: no new sentences, the
// legal ones byte-identical. A customer knows the product, not the firm, so
// the head is the product's name with its colour square; SimteGen signs
// small at the foot.
//
// Lives OUTSIDE functions/ like spolecne.js: everything under functions/ is
// a route candidate, and a helper that suddenly answers HTTP requests is a
// bug nobody looks for. The mails the template repo's workflows send (trial
// reminders, invoices, payments) are built by .github/nastroje/email_obal.py
// — the same markup, keep the two in step (tests/test_email_obal.py
// compares them).
//
// Mail clients are not browsers: tables, inline styles, one system font,
// no CSS variables, web fonts, scripts, SVG or data: URIs (Gmail and
// Outlook strip or block them). Everything that comes from data — the
// product's name, billing details, the firm's answer to a report — is
// escaped; only links this code was handed as links become anchors.

// Absolute on purpose: a mail is opened far from the product's site, in any
// client, where a relative URL resolves to nothing and a data: URI is
// stripped. simtegen.com is the firm's own site; the alt text carries the
// name when the client blocks images (most do until asked).
export const LOGO_SIMTEGEN = "https://simtegen.com/email/simtegen-logo-600.png";

const PISMO = "Arial, Helvetica, sans-serif";
const PAPIR = "#f6f4ef";
const LIST = "#ffffff";
const LINKA = "#dcd8cf";
const INKOUST = "#141414";
const DRUHOTNY = "#5e5c57";

const PODPIS = { cs: "aplikace od SimteGen", en: "an app by SimteGen" };
// The login link's button. The only words the HTML adds, and they are a
// control's label, not a sentence: the Czech one is the button the link
// opens on (ochrana.potvrzeniPrihlaseni), the English one the verb of the
// English subject ("your sign-in link").
export const PRIHLASIT = { cs: "Přihlásit se", en: "Sign in" };

export function escapuj(hodnota) {
  return String(hodnota === undefined || hodnota === null ? "" : hodnota)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

// "#abc" / "#aabbcc" → "#aabbcc"; anything else → the ink. The value lands
// in an attribute and a style, so a pattern, not a trust.
export function hexBarva(barva) {
  const s = String(barva || "").trim();
  if (/^#[0-9a-fA-F]{6}$/.test(s)) return s.toLowerCase();
  if (/^#[0-9a-fA-F]{3}$/.test(s)) return ("#" + s.slice(1).split("").map((c) => c + c).join("")).toLowerCase();
  return INKOUST;
}

// The light-theme --barva-produktu from web/produkt.css (the first :root —
// the dark one sits in @media below it; kontrola_manifestu allows nothing
// else in the file). Null when the file does not say: the mail is in ink.
export function barvaZCss(css) {
  const blok = /:root\s*\{([^}]*)\}/.exec(String(css || ""));
  const m = blok && /--barva-produktu\s*:\s*(#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3})\s*;/.exec(blok[1]);
  return m ? hexBarva(m[1]) : null;
}

// Only absolute https links become anchors: the login link (our origin),
// the product's own address from its manifest. Never whitespace, quotes
// or angle brackets — escaped anyway, refused first.
function odkazOk(url) {
  return /^https:\/\/[^\s"'<>\\]+$/.test(String(url || ""));
}

function odstavec(radky) {
  return `<p style="margin:0 0 16px 0;font-family:${PISMO};font-size:15px;line-height:22px;color:${INKOUST};">`
    + radky.join("<br>") + "</p>";
}

function tlacitkoHtml(url, popisek) {
  const h = escapuj(url);
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 12px 0;">`
    + `<tr><td bgcolor="${INKOUST}" style="background-color:${INKOUST};">`
    + `<a href="${h}" style="display:inline-block;padding:14px 28px;font-family:${PISMO};font-size:15px;`
    + `font-weight:bold;line-height:20px;color:${PAPIR};text-decoration:none;">${escapuj(popisek)}</a>`
    + "</td></tr></table>"
    // The same link as text under the button: a client that drops the
    // button's styling, or a customer who copies links by hand, still has it.
    + `<p style="margin:0 0 16px 0;font-family:${PISMO};font-size:13px;line-height:20px;color:${DRUHOTNY};`
    + `word-break:break-all;"><a href="${h}" style="color:${DRUHOTNY};text-decoration:underline;">${h}</a></p>`;
}

function odkazHtml(url) {
  const h = escapuj(url);
  return `<a href="${h}" style="color:${INKOUST};text-decoration:underline;word-break:break-all;">${h}</a>`;
}

// The text part, paragraph by paragraph (blank line = paragraph, newline =
// <br>). A line that is exactly the button's link becomes the button; a
// line that is exactly one of `odkazy` becomes an anchor showing itself.
function teloHtml(text, tlacitko, odkazy) {
  const tlacitkoUrl = tlacitko && odkazOk(tlacitko.odkaz) ? tlacitko.odkaz : null;
  const jine = new Set((odkazy || []).filter(odkazOk));
  const vystup = [];
  const odstavce = String(text || "").replace(/\r\n?/g, "\n").trim().split(/\n{2,}/);
  for (const kus of odstavce) {
    let radky = [];
    for (const radek of kus.split("\n")) {
      const cisty = radek.trim();
      if (tlacitkoUrl && cisty === tlacitkoUrl) {
        if (radky.length) vystup.push(odstavec(radky));
        radky = [];
        vystup.push(tlacitkoHtml(tlacitkoUrl, tlacitko.popisek));
      } else if (jine.has(cisty)) {
        radky.push(odkazHtml(cisty));
      } else {
        radky.push(escapuj(radek));
      }
    }
    if (radky.length) vystup.push(odstavec(radky));
  }
  return vystup.join("\n");
}

function hlavickaHtml(produkt, barva) {
  if (!produkt) return "";
  return `<tr><td style="padding:24px 32px 4px 32px;">`
    + `<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>`
    + `<td valign="middle" style="padding:0 10px 0 0;">`
    + `<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>`
    + `<td width="12" height="12" bgcolor="${barva}" style="width:12px;height:12px;background-color:${barva};`
    + `font-size:0;line-height:0;">&nbsp;</td></tr></table></td>`
    + `<td valign="middle" style="font-family:${PISMO};font-size:18px;line-height:24px;font-weight:bold;`
    + `color:${INKOUST};">${escapuj(produkt)}</td>`
    + "</tr></table></td></tr>";
}

function patickaHtml(jazyk) {
  return `<tr><td style="padding:8px 32px 24px 32px;">`
    + `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>`
    + `<td style="border-top:1px solid ${LINKA};padding:16px 0 0 0;">`
    + `<img src="${LOGO_SIMTEGEN}" width="90" alt="SimteGen" style="display:block;width:90px;max-width:90px;`
    + `height:auto;border:0;outline:none;text-decoration:none;font-family:${PISMO};font-size:13px;`
    + `font-weight:bold;color:${INKOUST};">`
    + `<p style="margin:8px 0 0 0;font-family:${PISMO};font-size:12px;line-height:18px;color:${DRUHOTNY};">`
    + `${PODPIS[jazyk]}</p>`
    + "</td></tr></table></td></tr>";
}

// { predmet, text, produkt, barva, jazyk, tlacitko: {odkaz, popisek}, odkazy }
// → the whole HTML document. `text` is the mail's text part, unchanged.
export function htmlEmailu({ predmet, text, produkt, barva, jazyk, tlacitko, odkazy } = {}) {
  const j = jazyk === "en" ? "en" : "cs";
  const nazev = String(produkt || "").trim();
  return `<!doctype html>\n<html lang="${j}">\n<head>\n<meta charset="utf-8">\n`
    + `<meta name="viewport" content="width=device-width, initial-scale=1">\n`
    + `<meta name="color-scheme" content="light">\n<meta name="supported-color-schemes" content="light">\n`
    + `<title>${escapuj(predmet)}</title>\n</head>\n`
    + `<body style="margin:0;padding:0;background-color:${PAPIR};">\n`
    + `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${PAPIR}" `
    + `style="background-color:${PAPIR};"><tr><td align="center" style="padding:24px 12px;">\n`
    + `<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" bgcolor="${LIST}" `
    + `style="width:100%;max-width:600px;background-color:${LIST};border:1px solid ${LINKA};">\n`
    + hlavickaHtml(nazev, hexBarva(barva)) + "\n"
    + `<tr><td style="padding:20px 32px 8px 32px;">\n${teloHtml(text, tlacitko, odkazy)}\n</td></tr>\n`
    + patickaHtml(j) + "\n"
    + "</table>\n</td></tr></table>\n</body>\n</html>\n";
}
