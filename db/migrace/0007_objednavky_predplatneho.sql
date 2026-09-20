-- Subscription orders placed in the app. The order is the "button binding
-- to pay" the terms describe (§ 1826 (3) obč. zák.); the consumer consent
-- to start before the 14-day withdrawal window (§ 1837 l) is a separate
-- checkbox, stored as its own flag with the time it was given. Billing
-- details are personal data of the customer; they live here, go to the
-- operator by e-mail for the invoice, and never into the GitHub mirror.
--
-- stav: nova → fakturovana → zaplacena | zrusena
--
-- NOT called "objednavky": in this product that name is taken by the tyre
-- shop's booking calendar (migration 0002_pneusklad), which is a completely
-- different thing the mechanic uses every day. Two meanings of the same word
-- in one schema is how a wrong JOIN gets written at two in the morning.

CREATE TABLE objednavky_predplatneho (
    id                 INTEGER PRIMARY KEY AUTOINCREMENT,
    uzivatel_id        INTEGER NOT NULL REFERENCES uzivatele(id) ON DELETE CASCADE,
    mesice             INTEGER NOT NULL,
    varianta           TEXT,
    cena_czk           INTEGER,
    fakturace          TEXT,
    spotrebitel        INTEGER NOT NULL DEFAULT 0,
    souhlas_zahajeni   INTEGER NOT NULL DEFAULT 0,
    souhlas_cas        INTEGER,
    stav               TEXT NOT NULL DEFAULT 'nova',
    issue_cislo        INTEGER,
    vytvoreno          INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX idx_objednavky_predplatneho_uzivatel
    ON objednavky_predplatneho(uzivatel_id, vytvoreno);
