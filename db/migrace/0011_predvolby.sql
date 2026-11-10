-- The language of the app, chosen by the PERSON, not by the shop.
--
-- A shop with a mechanic who does not read Czech has two people on one
-- warehouse: the owner keeps Czech, the mechanic switches to English. That is
-- why the choice is not a column on nastaveni_servisu (one row per shop,
-- shared by the whole team) but its own row keyed by the signed-in account.
--
-- On the account and not only in the browser (simtegen.js keeps a hand
-- choice in "sg-volba" too): the mechanic signs in from the e-mail link on
-- the workshop tablet and on his phone, and the app must open in English on
-- both. A row exists only after an explicit choice — no row means "never
-- chose", and the app then behaves exactly as before this migration.
--
-- uzivatel_id is the primary key, so export and account deletion reach it
-- unchanged. Nothing existing is deleted or rewritten.

CREATE TABLE predvolby (
    uzivatel_id INTEGER PRIMARY KEY REFERENCES uzivatele(id) ON DELETE CASCADE,
    jazyk       TEXT NOT NULL CHECK (jazyk IN ('cs', 'en')),
    zmeneno     INTEGER NOT NULL DEFAULT (unixepoch())
);
