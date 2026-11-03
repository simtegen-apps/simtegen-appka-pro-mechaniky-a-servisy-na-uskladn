-- A fixed one-day window for "Poslat si seznam e-mailem" (POST /api/priprava).
--
-- Every tap is an e-mail from the firm's sending domain. Without a cap one
-- trial account with one booking could call it in a loop, burn the Resend
-- quota and the domain's reputation — and then the login links of every
-- customer stop arriving. A real shop sends the list once in the evening,
-- maybe twice; functions/api/priprava.js allows five a day. Two numbers on
-- the shop's own settings row, like the invitation window (0008).
ALTER TABLE nastaveni_servisu ADD COLUMN priprava_od INTEGER NOT NULL DEFAULT 0;
ALTER TABLE nastaveni_servisu ADD COLUMN priprava_pocet INTEGER NOT NULL DEFAULT 0;
