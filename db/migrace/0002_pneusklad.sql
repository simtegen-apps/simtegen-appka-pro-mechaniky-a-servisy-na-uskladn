-- Pneusklad: shop settings, motorists, stored wheel sets, movement log,
-- bookings.
--
-- One account = one tyre shop (the target customer is a 1-2 person operation
-- sharing one mailbox), so there are no roles and no branch table. Every table
-- declares uzivatel_id inside the same statement that creates it, which is
-- what kontrola_manifestu.py checks and what makes /api/ucet/export and
-- /api/ucet/smazat reach the data generically. Adding the column later with
-- ALTER TABLE would pass review and fail the build.
--
-- Times are unix epoch SECONDS (integers), same as the base migration. Tread
-- depths are stored in TENTHS of a millimetre as integers: mechanics write
-- "5,5 mm" and floats in SQLite would make the "under 4 mm" report depend on
-- rounding. 0 means "not measured", which is why reports skip zeros instead of
-- treating them as bald tyres.
--
-- Money is whole crowns (INTEGER) — storage fees are never charged in hellers.

CREATE TABLE nastaveni_servisu (
    uzivatel_id    INTEGER PRIMARY KEY REFERENCES uzivatele(id) ON DELETE CASCADE,
    nazev          TEXT NOT NULL DEFAULT '',
    telefon        TEXT NOT NULL DEFAULT '',
    adresa         TEXT NOT NULL DEFAULT '',
    format_stitku  TEXT NOT NULL DEFAULT 'role_100x50',
    vychozi_cena   INTEGER NOT NULL DEFAULT 800,
    posledni_cislo INTEGER NOT NULL DEFAULT 0,
    plan           TEXT NOT NULL DEFAULT 'zkusebni',
    zkusebni_do    INTEGER NOT NULL DEFAULT 0,
    limit_sad      INTEGER NOT NULL DEFAULT 40,
    vytvoreno      INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE zakaznici (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    uzivatel_id INTEGER NOT NULL REFERENCES uzivatele(id) ON DELETE CASCADE,
    jmeno       TEXT NOT NULL,
    telefon     TEXT NOT NULL DEFAULT '',
    email       TEXT NOT NULL DEFAULT '',
    poznamka    TEXT NOT NULL DEFAULT '',
    ukazka      INTEGER NOT NULL DEFAULT 0,
    vytvoreno   INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX idx_zakaznici_uzivatel ON zakaznici(uzivatel_id, jmeno);

-- The core table: one row per physical set of wheels in the rack. The set
-- keeps its identity and its code across seasons, the movement log records the
-- comings and goings.
CREATE TABLE sady (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    uzivatel_id     INTEGER NOT NULL REFERENCES uzivatele(id) ON DELETE CASCADE,
    zakaznik_id     INTEGER NOT NULL REFERENCES zakaznici(id) ON DELETE CASCADE,
    kod             TEXT NOT NULL,
    spz             TEXT NOT NULL DEFAULT '',
    vozidlo         TEXT NOT NULL DEFAULT '',
    typ             TEXT NOT NULL DEFAULT 'zimni',
    rozmer          TEXT NOT NULL DEFAULT '',
    pocet_kusu      INTEGER NOT NULL DEFAULT 4,
    dezen           TEXT NOT NULL DEFAULT '',
    na_discich      INTEGER NOT NULL DEFAULT 1,
    hloubka_lp      INTEGER NOT NULL DEFAULT 0,
    hloubka_pp      INTEGER NOT NULL DEFAULT 0,
    hloubka_lz      INTEGER NOT NULL DEFAULT 0,
    hloubka_pz      INTEGER NOT NULL DEFAULT 0,
    pozice          TEXT NOT NULL DEFAULT '',
    stav            TEXT NOT NULL DEFAULT 'uskladneno',
    datum_prijmu    INTEGER NOT NULL DEFAULT (unixepoch()),
    datum_vydeje    INTEGER,
    cena_skladovani INTEGER NOT NULL DEFAULT 0,
    zaplaceno       INTEGER NOT NULL DEFAULT 0,
    poznamka        TEXT NOT NULL DEFAULT '',
    ukazka          INTEGER NOT NULL DEFAULT 0,
    vytvoreno       INTEGER NOT NULL DEFAULT (unixepoch()),
    UNIQUE (uzivatel_id, kod)
);
CREATE INDEX idx_sady_uzivatel ON sady(uzivatel_id, stav);
CREATE INDEX idx_sady_zakaznik ON sady(zakaznik_id);

-- Append-only: this is the "who had what stored across seasons" history the
-- product is sold on. Never updated, only inserted into.
CREATE TABLE pohyby (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    uzivatel_id INTEGER NOT NULL REFERENCES uzivatele(id) ON DELETE CASCADE,
    sada_id     INTEGER NOT NULL REFERENCES sady(id) ON DELETE CASCADE,
    typ         TEXT NOT NULL,
    datum       INTEGER NOT NULL DEFAULT (unixepoch()),
    poznamka    TEXT NOT NULL DEFAULT '',
    vytvoreno   INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX idx_pohyby_sada ON pohyby(sada_id, datum);

-- Bookings are entered by the mechanic, not by motorists. zakaznik_id and
-- sada_id are nullable on purpose: a drive-in customer with no stored wheels
-- still needs a slot in the day, and jmeno_bez_zakaznika holds that name
-- without creating a customer record nobody wanted.
CREATE TABLE objednavky (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    uzivatel_id         INTEGER NOT NULL REFERENCES uzivatele(id) ON DELETE CASCADE,
    zakaznik_id         INTEGER REFERENCES zakaznici(id) ON DELETE SET NULL,
    sada_id             INTEGER REFERENCES sady(id) ON DELETE SET NULL,
    jmeno_bez_zakaznika TEXT NOT NULL DEFAULT '',
    datum               INTEGER NOT NULL,
    delka_min           INTEGER NOT NULL DEFAULT 30,
    ukon                TEXT NOT NULL DEFAULT 'prezuti',
    stav                TEXT NOT NULL DEFAULT 'planovano',
    pripraveno          INTEGER NOT NULL DEFAULT 0,
    poznamka            TEXT NOT NULL DEFAULT '',
    ukazka              INTEGER NOT NULL DEFAULT 0,
    vytvoreno           INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX idx_objednavky_uzivatel ON objednavky(uzivatel_id, datum);
CREATE INDEX idx_objednavky_sada ON objednavky(sada_id, datum);
