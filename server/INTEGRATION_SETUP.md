# Nsemra News integration setup

The existing React application and Express API remain separate. No new authentication or notification platform is used.

## Database and indexes

Development and production both use `MONGODB_ATLAS_URI` and explicitly select
`nsemfoa_data`. A database path embedded in the URL does not override that name.
Only `NODE_ENV=test` uses `MONGODB_URI` and leaves its disposable database name intact.

To copy the legacy local database, keep its connection URL under `MONGODB_URI` in
the ignored `server/.env` and configure `MONGODB_ATLAS_URI` for the destination:

```powershell
npm run db:migrate-atlas
npm run db:migrate-atlas -- --apply
```

The first command previews the transfer. Applying creates a BSON-preserving EJSON
backup under ignored `server/backups`, copies all collections and indexes, and
verifies every document. IDs, article revisions, media references, accounts,
categories, tags, CMS pages and settings remain intact. Existing source records
are never removed. The command can resume an identical partial copy and refuses
conflicting or unrelated destination records rather than replacing them. ImageKit
files stay at their existing URLs; their Media Library records are copied.
If the running app created a version-0 settings singleton in the empty destination,
`--replace-default-settings` allows replacing it only while its values still
exactly match the built-in defaults. The old singleton is included in the backup;
its replacement is atomic and preserves the source settings ID.

Use MongoDB Atlas or a MongoDB replica set. Publication and invitation acceptance use transactions so article state, revision state, notification creation, and single-use invitation consumption remain consistent. A standalone MongoDB process cannot execute these transactions.

Before production traffic, run from `server`:

```powershell
npm install
npm run db:integration-indexes
```

The index command only adds declared indexes; it does not drop indexes, delete documents or rewrite existing records. Resolve any reported duplicate data deliberately before retrying. In particular, subscriber email uniqueness, settings singleton uniqueness and notification event uniqueness must exist in production, where automatic index creation is disabled.

## Email configuration

Set these server-only variables using the chosen provider's SMTP configuration:

```dotenv
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM=
FRONTEND_URL=https://your-public-frontend.example
```

The existing local Brevo entries `SMTP_Server` and `SMTP_Key` are supported as aliases for `SMTP_HOST` and `SMTP_PASSWORD`. Keep the key in the ignored backend environment file. The remaining required fields are `SMTP_USER` (the exact SMTP login shown by Brevo) and `SMTP_FROM` (a configured, verified sender). Do not infer the SMTP login from the application administrator email, and do not substitute a Brevo API key for an SMTP key. Canonical names take precedence over aliases, including explicit empty overrides used to isolate automated tests.

Port 465 uses TLS immediately. Other ports upgrade via STARTTLS, which is required for Brevo and in production. An internal SMTP relay may omit username/password when neither is configured. Brevo always requires a login and SMTP key. Certificate validation is never disabled. The transport does not log credentials, recipient addresses, links, or message contents.

Run `npm run email:verify` from `server` after completing those fields. It verifies connection/authentication without sending a message; it cannot prove sender acceptance or inbox delivery. The supplied `SMTP_LOGINS` value was copied into the canonical `SMTP_USER` field in the ignored local environment file. The latest live Brevo connection and authentication check passed. No email was sent, and sender acceptance/inbox delivery remain untested. Restart the backend process after changing its environment.

Transport reference: [Nodemailer SMTP documentation](https://nodemailer.com/smtp).
Brevo reference: [Configure Brevo SMTP](https://help.brevo.com/hc/en-us/articles/7924908994450-Send-transactional-emails-using-Brevo-SMTP).

`email_sent` means the SMTP server accepted the recipient/message, not verified delivery to an inbox. Invitation records retain attempt count, timestamp, provider message ID and a safe error. Staff lists show the latest email submission status. Resend is restricted to Super Admins and one attempt per staff account per minute; it rotates the token and invalidates old links. The existing secure manual invitation link fallback remains available when email is unavailable.

Newsletter requests require consent and always start pending verification. The server stores only token hashes. Verification expires after 24 hours and is single use. Successful confirmation activates the subscriber. The verification message includes a functional unsubscribe link. Repeated requests do not duplicate records or reactivate unsubscribed addresses. A repeated pending signup can retry verification email after a one-minute cooldown. No campaigns or promotional mail are sent automatically.

## Scheduling

The deployment has been confirmed as an always-running Node server. The local backend environment is explicitly set to persistent scheduling:

```dotenv
SCHEDULER_MODE=persistent
```

`npm start` connects to MongoDB, performs an initial scheduled-publication check and repeats every 60 seconds. The process must remain running under the host's process manager. No external cron service is required for this deployment. Restart an already-running process after changing its environment; the environment file is loaded at startup.

For an environment without a continuously running process:

```dotenv
SCHEDULER_MODE=external
SCHEDULER_SECRET=<a-long-random-server-only-secret>
```

Configure the hosting scheduler to invoke `POST /api/internal/publish-scheduled` with `Authorization: Bearer <SCHEDULER_SECRET>`, normally every minute. The endpoint is protected and refuses requests when no secret is configured. The interval is disabled in external mode. No external hosting scheduler was provisioned or deployed in this task; the host and deployment credentials are still needed for that final infrastructure step. A provider that only issues GET requests requires an authenticated provider-specific adapter; do not expose an unauthenticated GET publishing route.

Each schedule pins an approved revision. Workers atomically acquire a two-minute MongoDB lease. Publication is transactional and author notification event keys are unique per article and revision. Cancelled, archived, future or unapproved work is not published. Expired leases can be reclaimed. Transient failures back off for 1, 2, 4, 8 minutes, bounded at five claims; invalid approval/schedule failures stop immediately. Review the stored `scheduleFailure`, `scheduleFailedAt`, `scheduleAttempts` and `scheduleRetryAt` when a scheduled article has failed. Correct the article/approval and reschedule it to reset retries. Schedules are UTC timestamps, and delayed publication preserves the scheduled publication timestamp.

## Settings ownership

`SiteSettings` is a singleton with an atomic version check. Stale saves return HTTP 409; the administrator can reload the latest saved values. Only Super Admins can save settings. Public responses contain publication configuration, never environment secrets. Public settings reload on navigation focus and after a successful settings save. General identity/contact defaults, supported brand colours, social links, date formatting, archive page size, comments acceptance, scheduling policy and default metadata are connected to public behavior. Mandatory editorial review and comment moderation cannot be disabled.

Page-specific hero copy, page section contact overrides, SEO overrides and page images remain owned by the existing Website CMS. Global settings provide shared defaults rather than replacing page-specific published content. Unsupported notification preferences and authentication settings were removed from the settings form, with a clear explanation and a link to the working Profile password controls.

## Legacy browser comments

The old `newsfront_comments` localStorage key is no longer read or written. This change does **not** remove it from any browser. Old records have no reliable article association or authenticated provenance, and include original demonstration comments, so automatic import is unsafe.

For an accessible browser containing genuine reader comments, export and preserve its existing records before any manual cleanup. An authorized editor must review the export, exclude demonstration records, obtain appropriate permission to retain personal data, and identify the correct article for each genuine comment. Re-enter approved-for-import records through the public submission process using valid reader details; they enter `pending` and require normal moderation. Never mark imported browser records approved automatically. No bulk migration was run, and no user data was deleted.

## Super Admin credentials

The initial Super Admin signs in with `ADMIN_EMAIL` / `ADMIN_PASSWORD` from `server/.env`. Login always checks the bcrypt hash stored in MongoDB; the plain password is never stored or sent to the browser. Nothing is synchronized on server startup. After changing either value, run the explicit sync:

```powershell
npm run admin:sync -- --dry-run   # shows what would change, writes nothing
npm run admin:sync                # applies it
```

The sync only targets the account with `ADMIN_EMAIL` (if it is a Super Admin) or the single existing Super Admin. It refuses when several Super Admins exist or when the email belongs to an Editor/Author. A changed password is re-hashed and existing sessions for that account are signed out.

## Brand migration and demo records

```powershell
npm run brand:migrate             # preview MongoDB settings/CMS text still using a legacy brand name
npm run brand:migrate -- --apply  # write new CMS revisions + settings (history kept, audit logged)
npm run db:demo-report            # list demo/test records written by the removed seed and API-test scripts
npm run db:demo-report -- --apply # delete only exact-provenance matches, after writing a JSON backup
```

`db:demo-report` never deletes seeded categories/tags or any article it cannot attribute with certainty; those are listed under `review`.

## Verification

```powershell
# Isolated real MongoDB replica set + local SMTP server, no production data
npm run test:integration
# Env Super Admin login, article persistence, notification deletion
npm run test:nsemra
```

The first run downloads a MongoDB 7.0 test binary into `.cache/mongodb`. Tests use only disposable databases; production connection variables are overridden before application modules load. Database command failpoints verify rollback and retry behavior without mocking application persistence.

Browser tests expect a production frontend build pointing at the isolated API:

```powershell
cd ../frontend
$env:VITE_API_URL = 'http://localhost:5055/api'
npm run build -- --configLoader native
Remove-Item Env:\VITE_API_URL
cd ../server
npm run test:browser
```

The suite refuses to start unless `frontend/dist` was built for `http://localhost:5055/api`, so it can never drive your real backend. They start disposable services on ports 5055 and 5188 and use installed Chrome (`CHROME_PATH` can override its location). Close any conflicting test processes first. Test screenshots are written to `server/test-results`. Restore a normal frontend production build using the deployment API URL after testing.
