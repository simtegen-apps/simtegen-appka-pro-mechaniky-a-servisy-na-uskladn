-- Team invitations must be accepted by the invited person.
--
-- Until now a row in clenove WAS access: any správce could type a stranger's
-- address into their team and that person, at their next login, landed in
-- the správce's shop (and wrote their customers' names into it). From now on
-- a new row is only an invitation (prijato = 0); it turns into access when
-- the person signed in with that very address accepts it (POST /api/clenove
-- {akce: "prijmout"}). The resolver (spolecne.nactiKontext) reads accepted
-- rows only.
--
-- DEFAULT 1 on purpose: the colleagues who already work in a shop keep their
-- access without an UPDATE of existing rows. Only rows inserted from now on
-- carry prijato = 0, written explicitly by the handler.
ALTER TABLE clenove ADD COLUMN prijato INTEGER NOT NULL DEFAULT 1;

-- A fixed one-hour window of invitations per shop (functions/api/clenove.js):
-- without it a free account could try addresses by the thousand. Two numbers
-- on the shop's own settings row, no new table and nothing about the
-- invited people.
ALTER TABLE nastaveni_servisu ADD COLUMN pozvanky_od INTEGER NOT NULL DEFAULT 0;
ALTER TABLE nastaveni_servisu ADD COLUMN pozvanky_pocet INTEGER NOT NULL DEFAULT 0;
