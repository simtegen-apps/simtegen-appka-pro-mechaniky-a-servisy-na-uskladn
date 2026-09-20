-- Subscription state, one row per account. The app never handles money:
-- the owner invoices, sees the payment arrive, and marks it through the
-- "Predplatne" workflow, which upserts plati_do here. The app only ever
-- asks "is this account paid up?" (predplatne.js).
--
-- uzivatel_id is the primary key on purpose: export and account deletion
-- reach this table generically, and "one account, one subscription" is a
-- constraint, not a convention.
--
-- Numbered 0005 and not 0002 as the template ships it: this product already
-- applied 0002_pneusklad, 0003_navod and 0004_provoz_a_tym in production,
-- and migrations are append-only.

CREATE TABLE predplatne (
    uzivatel_id INTEGER PRIMARY KEY REFERENCES uzivatele(id) ON DELETE CASCADE,
    plati_do    INTEGER NOT NULL,
    poznamka    TEXT,
    zmeneno     INTEGER NOT NULL DEFAULT (unixepoch())
);

-- The product was sold before this module existed: back then a paying shop
-- was switched on by hand with nastaveni_servisu.plan != 'zkusebni'. Those
-- accounts must not wake up expired the morning after this deploys, so they
-- are carried over with a year of runway. The owner then sets the real end
-- date from the invoice (see README, "Jak zapsat platbu předplatného").
INSERT INTO predplatne (uzivatel_id, plati_do, poznamka)
SELECT uzivatel_id, unixepoch() + 365 * 24 * 3600,
       'převedeno z tarifu při zavedení předplatného — upřesnit podle faktury'
FROM nastaveni_servisu
WHERE plan != 'zkusebni';
