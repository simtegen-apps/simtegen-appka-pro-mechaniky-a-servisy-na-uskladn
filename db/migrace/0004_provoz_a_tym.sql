-- Booking detail, shop operating hours, and access for more than one person.
--
-- "Přehození" disappears as a separate operation: in a tyre shop the real
-- distinction is whether the wheels come on rims or not, so the old value is
-- folded into 'prezuti' plus the na_discich flag rather than left behind as a
-- dead option nobody can pick any more.
--
-- Times of day are MINUTES since midnight (integers), not unix seconds: an
-- opening hour has no date, and storing 08:00 as an epoch would silently make
-- it a specific morning in 1970.

ALTER TABLE objednavky ADD COLUMN na_discich INTEGER NOT NULL DEFAULT 1;

-- A booking with no agreed hour: the car is dropped off and waits for a gap.
ALTER TABLE objednavky ADD COLUMN cely_den INTEGER NOT NULL DEFAULT 0;

UPDATE objednavky SET ukon = 'prezuti', na_discich = 1 WHERE ukon = 'prehozeni';

-- How many cars the shop can handle at the same time, and when it is open.
-- Defaults describe an ordinary one-bay shop: 8-17 with lunch 12:00-12:30.
ALTER TABLE nastaveni_servisu ADD COLUMN soubezne_objednavky INTEGER NOT NULL DEFAULT 1;
ALTER TABLE nastaveni_servisu ADD COLUMN otevreno_od INTEGER NOT NULL DEFAULT 480;
ALTER TABLE nastaveni_servisu ADD COLUMN otevreno_do INTEGER NOT NULL DEFAULT 1020;
ALTER TABLE nastaveni_servisu ADD COLUMN obed_od INTEGER NOT NULL DEFAULT 720;
ALTER TABLE nastaveni_servisu ADD COLUMN obed_do INTEGER NOT NULL DEFAULT 750;

-- Everyone else who may open the shop's account.
--
-- uzivatel_id is the SHOP owner, not the colleague — that is what keeps the
-- row inside the shop's export and inside the shop's account deletion, and it
-- is how every other table in this product already reads. The colleague signs
-- in with their own e-mail through the ordinary one-time link; this row is
-- what turns that login into access to this shop and nothing else.
--
-- role: 'spravce' (everything), 'mechanik' (daily work, no settings or team),
--       'cteni' (look, do not touch).
CREATE TABLE clenove (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    uzivatel_id INTEGER NOT NULL REFERENCES uzivatele(id) ON DELETE CASCADE,
    email       TEXT NOT NULL,
    role        TEXT NOT NULL DEFAULT 'mechanik',
    vytvoreno   INTEGER NOT NULL DEFAULT (unixepoch()),
    UNIQUE (uzivatel_id, email)
);
CREATE INDEX idx_clenove_email ON clenove(email);
