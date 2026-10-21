-- Subscriptions bought in the Google Play app (play_nakupy.js). One row per
-- purchase token: the token is what Google is asked about at every renewal,
-- and UNIQUE is what stops a second account from claiming the same
-- purchase. plati_do mirrors Google's expiry; the account's real end date
-- stays in predplatne.plati_do (the later of web invoice and Play wins),
-- and every new paid period also lands in platby — the review counts
-- second purchases from there, whichever way the money came.

CREATE TABLE play_nakupy (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    uzivatel_id INTEGER NOT NULL REFERENCES uzivatele(id) ON DELETE CASCADE,
    token       TEXT NOT NULL UNIQUE,
    produkt     TEXT NOT NULL,
    plati_do    INTEGER NOT NULL,
    stav        TEXT NOT NULL,
    overeno     INTEGER NOT NULL DEFAULT (unixepoch()),
    zapsano     INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX idx_play_nakupy_uzivatel ON play_nakupy(uzivatel_id, plati_do);
