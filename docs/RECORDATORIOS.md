# Daily payment reminders

The platform reminds each family by notification and email (if they have it turned on in their profile):

- **3 days before** a charge is due (for example, the monthly fee on the 7th, for the 10th).
- On **days 1, 8, 15 and 30** after the due date.

It sends **one message per family**, covering all their children, and never repeats the same reminder on the same day. Secretaría can also send them by hand from **Cobros → Recordatorios de pago → Enviar ahora**. The director can turn off the automatic ones from the same place.

For the automatic sending to work, something has to run the task **once a day**. There are two options:

## Option A: a Railway cron service (recommended)

1. In the Railway project: **+ New → GitHub Repo →** `ocampova/Escuela` (the same repository and branch).
2. In that new service, under **Settings**:
   - **Custom Start Command:** `npm run recordatorios`
   - **Cron Schedule:** `0 14 * * *` (every day at 8:00 a.m. Costa Rica time, which is 14:00 UTC)
3. Under **Variables**, reference the ones from the main service: `DATABASE_URL=${{Postgres.DATABASE_URL}}`, `RESEND_API_KEY`, `MAIL_FROM`, `MAIL_REPLY_TO` and `APP_URL` (if you use your own domain; otherwise `https://<your-domain>.up.railway.app`).
4. The service starts, sends the reminders and shuts down until the next day. Its log shows a summary: `[recordatorios] {"families":5,...}`.

## Option B: an external cron (cron-job.org or similar)

1. In the main service, add the variable `CRON_SECRET` with a random value (for example `${{secret(32)}}`).
2. In cron-job.org create a daily job at 8:00 a.m. (Costa Rica):
   - URL: `https://<your-domain>/api/cron/recordatorios`
   - Method: **POST**
   - Header: `Authorization: Bearer <the same CRON_SECRET>`
