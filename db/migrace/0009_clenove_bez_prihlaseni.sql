-- Old team rows that nobody ever confirmed count as invitations again —
-- without rewriting a single existing row.
--
-- 0008 added clenove.prijato with DEFAULT 1, so every row written before it
-- looks accepted — including a row a správce typed in for an address whose
-- owner had never signed in. Under the old code such a row would move that
-- person into the správce's shop at their very first login, without them
-- agreeing to anything.
--
-- Rule (spolecne.CLENSTVI_PRIJATO): a row is accepted when its person
-- accepted it in the app (prijato_cas set), or when it is an old row and
-- that person's account already existed when this migration ran — the
-- colleagues who were already working keep working. Everybody else sees the
-- old row as an invitation on the Dnes screen and accepts it themselves.
-- The same outcome as "UPDATE clenove SET prijato = 0 WHERE email NOT IN
-- (SELECT email FROM uzivatele)", but nothing existing is changed, so no
-- owner signature is needed (kontrola_migraci.py).

-- When this migration ran. Numbers only (declared under agregaty).
CREATE TABLE stav_migraci (
    nazev     TEXT PRIMARY KEY,
    provedeno INTEGER NOT NULL DEFAULT (unixepoch())
);
INSERT INTO stav_migraci (nazev) VALUES ('0009_clenove_bez_prihlaseni');

-- When the invited person accepted the row in the app; NULL on old rows.
ALTER TABLE clenove ADD COLUMN prijato_cas INTEGER;
