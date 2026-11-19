-- Refunds and chargebacks of Google Play purchases (play_nakupy.js,
-- kontrolaVracenych; audit 19. 11. 2026). Numbered right after the module's
-- 0900 so it never collides with the template's 09x0 or a product's own;
-- written into a product once (stavitel._PLAY_MIGRACE_DALSI), never changed.
-- Nothing is dropped or rewritten: one column, one table.
--
-- play_nakupy.vraceno: until when Google took this purchase's access back
-- (0 = never). A refund without revocation keeps the subscription ACTIVE at
-- Google until its period ends; without the date, the next reconciliation
-- would grant the refunded period again and count its payment twice.
--
-- play_kontroly: when the app last asked Google for voided purchases (one
-- row per kind of check). Not customer data — a time, no account — and it
-- must outlive the isolate, or every isolate would ask again.

ALTER TABLE play_nakupy ADD COLUMN vraceno INTEGER NOT NULL DEFAULT 0;

CREATE TABLE play_kontroly (
    druh TEXT PRIMARY KEY,
    cas  INTEGER NOT NULL
);
