-- Daily page-view counters for the public landing screen. Aggregates only:
-- one row per day, page and link tag, no account, no IP, no user agent —
-- which is why this table is allowed to live without uzivatel_id (declared
-- in the manifest under `agregaty`, and the CI checker verifies the columns
-- carry nothing personal). The review needs the top of the funnel: "nobody
-- came" and "they came and left" are different diagnoses with different
-- fixes, and `zdroj` answers the third question — which channel brought
-- them, the one the candidate dossier could not answer from research.

CREATE TABLE navstevy (
    den     TEXT NOT NULL,
    stranka TEXT NOT NULL,
    zdroj   TEXT NOT NULL DEFAULT '',
    pocet   INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (den, stranka, zdroj)
);
