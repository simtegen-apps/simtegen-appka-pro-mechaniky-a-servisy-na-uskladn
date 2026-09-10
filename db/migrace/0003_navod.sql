-- The walkthrough has to remember it was already shown.
--
-- It cannot remember it in the browser: the manifest declares an empty
-- uloziste_v_prohlizeci and kontrola_manifestu.py fails the build on any
-- localStorage in web/. Putting the flag on the account is also the better
-- answer — a shop that opens the app on the workshop tablet and again on the
-- owner's phone gets the tour once, not once per device.
--
-- ALTER rather than a fresh table: this is one more preference on a row that
-- already exists once per account and already carries uzivatel_id as its
-- primary key, so export and account deletion reach it unchanged.

ALTER TABLE nastaveni_servisu ADD COLUMN navod_viden INTEGER NOT NULL DEFAULT 0;
