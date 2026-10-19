# NewsFront implementation report

Implemented on 18 October 2026 in the existing React / Express / MongoDB project.

## Root causes and resulting behavior

| Area | Root cause | Implemented behavior |
| --- | --- | --- |
| Reader comments | The public component owned a localStorage array; moderation owned a separate React array. Existing `ArticleComment` was not connected to either. | Guest submissions persist as pending in the existing MongoDB model. Editors/Super Admins search, filter, approve, reject, mark spam, archive and restore comments through authenticated APIs. Public lists/counts include only approved comments for the requested published article. Replies reference real approved comments on the same article. Public responses omit reader email. |
| Contact | A timer displayed success without persistence. No admin inbox existed. | Validated enquiries persist in `ContactSubmission`; authorized staff can search/filter, inspect the message and change its status. Success follows confirmed persistence, and failure preserves form input. Contact notifications use the existing MongoDB notification service. |
| Newsletter | A timer displayed a subscription success without storage or verification. | Normalized, unique subscriber records retain consent and source. Requests remain pending until a hashed, expiring single-use token is confirmed. Real SMTP verification messages include unsubscribe links. Opt-outs remain unsubscribed on repeated requests. No campaign sender was added. |
| Settings | Context and component state were authoritative, with hardcoded defaults and unsupported controls. | A MongoDB singleton persists supported settings, records the acting admin, audits changes and rejects stale versions with HTTP 409. Global identity/contact defaults, supported branding, social links, metadata, timezone/date format, archive page size, comments and scheduling policies feed public components. Page-specific content remains owned by the Website CMS. |
| Staff invitations | Secure link/token generation existed, but no email transport or recorded email result existed. | Nodemailer SMTP submits real invitation messages. Invitation records retain `not_configured`, `email_sent` or `email_failed`, attempt timestamps/counts and provider IDs. Owner-only resend rotates tokens and enforces a database-backed cooldown. Activation atomically consumes the token and activates the intended invited Editor/Author. |
| Scheduler | The worker queried `dueArticles` but referenced an undefined `article` without iterating. It also lacked approval checks, locks, reliable retries and atomic side effects. | A reusable worker atomically claims due records using MongoDB leases. A shared transactional publication service publishes the pinned approved revision, records its publication timestamp and creates one author notification per article/revision. It skips future/cancelled/archived work, rejects revoked approval, retries transient failures with bounded backoff, and recovers expired leases. |

## Publishing and security corrections

- Manual and scheduled publication now share the same revision-aware transaction. Generic create/update requests cannot bypass review by directly assigning published/scheduled/pending-review transitions.
- The article editor saves first and then calls the appropriate submit/publish/schedule API. Working edits to an already published article keep its approved public revision. Changes to a published article's URL require unpublishing first.
- Public article resolution uses approved revision content and populated taxonomy, including an explicitly empty approved featured image. Scheduler operational fields are stripped from public responses. Article details no longer show a stale cached story after a failed or different-slug API request.
- New public forms use Zod bounds, normalized email, honeypots and rate limits. Replies must belong to the same published article. Public comments render as React plain text.
- All admin endpoints reuse JWT cookie authentication and backend role checks. Private enquiries/subscribers are never exposed publicly. Settings responses contain no server secrets. Existing Origin/CSRF protections remain in place.
- Central errors honor both `status` and `statusCode`, return Zod validation failures as HTTP 400, and withhold internal errors/stacks from users. Error logs omit request query strings, credentials and tokens.
- Existing localStorage comment records were left untouched. No automatic import or approval was performed because legacy records lack trustworthy article association/provenance. The reviewed manual recovery procedure is in the setup guide.

## APIs

| Method | Endpoint | Access |
| --- | --- | --- |
| GET, POST | `/api/articles/:slug/comments` | Public; POST is rate limited, creates pending only |
| GET | `/api/admin/comments` | Editor / Super Admin |
| PATCH | `/api/admin/comments/:id/status` | Editor / Super Admin |
| POST | `/api/contact` | Public, rate limited |
| GET | `/api/admin/contact-submissions` | Editor / Super Admin |
| GET | `/api/admin/contact-submissions/:id` | Editor / Super Admin |
| PATCH | `/api/admin/contact-submissions/:id/status` | Editor / Super Admin |
| POST | `/api/newsletter/subscribe` | Public, rate limited, consent required |
| POST | `/api/newsletter/confirm` | Public, valid unexpired token required |
| POST | `/api/newsletter/unsubscribe` | Public, secure token required |
| GET | `/api/admin/newsletter-subscribers` | Super Admin |
| GET | `/api/site/settings` | Public configuration only |
| GET, PATCH | `/api/admin/settings/general` | Super Admin; versioned updates |
| POST | `/api/internal/publish-scheduled` | Dedicated server-only bearer secret |

Enhanced existing endpoints: staff list/invite/reinvite, invitation verify/accept, article create/update/publish/schedule, and public article delivery. Newsletter token links open frontend confirmation pages; GET navigation does not activate or unsubscribe a subscriber automatically.

## Models

Created: `ContactSubmission`, `NewsletterSubscriber`, `SiteSettings`.

Reused/extended: `ArticleComment` (moderation metadata and archived status), `AdminInvitation` (SMTP results), `Admin` (resend cooldown), `Article` (schedule revision/lease/retry fields and optimistic concurrency), `ArticleRevision`, `Notification` (contact enquiry event), and `AdminAuditLog`.

## Files created

Backend:

- `server/src/config/settingsDefaults.js`
- `server/src/controllers/engagementController.js`
- `server/src/models/ContactSubmission.js`
- `server/src/models/NewsletterSubscriber.js`
- `server/src/models/SiteSettings.js`
- `server/src/routes/engagementRoutes.js`
- `server/src/routes/schedulerRoutes.js`
- `server/src/services/emailService.js`
- `server/src/services/publicationService.js`
- `server/src/services/settingsService.js`
- `server/src/utils/http.js`
- `server/src/validations/engagementValidation.js`
- `server/src/scripts/ensureIntegrationIndexes.js`
- `server/test/integration.test.js`
- `server/test/browser.test.js`
- `server/test/settingsRestartProbe.js`
- `server/INTEGRATION_SETUP.md`

Frontend:

- `frontend/src/context/SiteSettingsContext.jsx`
- `frontend/src/pages/NewsletterAction.jsx`
- `frontend/src/pages/admin/EngagementManagement.jsx`
- `frontend/src/services/admin/engagementService.js`
- `frontend/src/services/public/engagementService.js`
- `frontend/src/utils/formatPublicDate.js`

This report is also new. Test screenshots are generated under ignored `server/test-results/`.

## Files modified

Backend: `server/package.json`, `server/package-lock.json`, `server/.env.example`, `server/.gitignore`, `server/src/app.js`, `server/src/middleware/errorHandler.js`, `server/src/controllers/adminArticleController.js`, `server/src/controllers/adminInvitationController.js`, `server/src/controllers/adminStaffController.js`, `server/src/controllers/publicArticleController.js`, `server/src/models/Admin.js`, `server/src/models/AdminInvitation.js`, `server/src/models/Article.js`, `server/src/models/ArticleComment.js`, `server/src/models/Notification.js`, `server/src/services/articleScheduler.js`.

Frontend: `src/main.jsx`, `src/router/router.jsx`, `src/context/BlogProvider.jsx`, `src/context/admin/AdminContext.jsx`, `src/components/admin/articles/ArticleEditor.jsx`, `src/components/admin/layout/AdminSidebar.jsx`, `src/components/common/CommentSection.jsx`, `src/components/common/Newsletter.jsx`, `src/layout/Footer.jsx`, `src/layout/Navbar.jsx`, `src/layout/SystemLayout.jsx`, `src/pages/Blog.jsx`, `src/pages/BlogPage.jsx`, `src/pages/CategoryPage.jsx`, `src/pages/Contact.jsx`, `src/pages/admin/Authors.jsx`, `src/pages/admin/Comments.jsx`, `src/pages/admin/Settings.jsx`.

No authentication replacement, duplicate Article/Comment model, Socket.IO, WebSocket service or campaign platform was added. Runtime email dependency: `nodemailer`. Test-only dependencies: `mongodb-memory-server`, `smtp-server`, `playwright`.

## Verification actually executed

| Check | Result |
| --- | --- |
| Backend integration suite | **12 passed, 0 failed** (11 substantive journeys plus their parent test). Real disposable MongoDB replica set and local SMTP server. |
| Browser acceptance suite | **8 passed, 0 failed** (7 substantive journeys plus their parent test). Installed Chrome, built React app, real Express API, disposable MongoDB and actual local SMTP acceptance. |
| Standard `npm run build` | **Passed** with the normal project API configuration restored. Vite retains its bundle-size warning. |
| Full frontend ESLint run | **26 errors, 8 warnings remain**. All error-bearing files are untouched by this change; an intersection check against Git's changed files returned zero. Changed/new frontend files have no ESLint errors. |
| Frontend diff whitespace check | Passed. |

Backend coverage includes moderation/public visibility/privacy, reply association, contact status persistence, settings RBAC/stale-write rejection, database reconnection and a fresh API process reading saved settings, duplicate subscriptions, missing SMTP, provider rejection/acceptance, verification reuse, unsubscribe/opt-out preservation, resend cooldown/token rotation/expired invitations, activation and subsequent login, approved manual publishing, author draft edits, concurrent workers, future/cancelled/archived/unapproved schedules, pinned revisions, exact timestamps, expired lease recovery, revoked approval, and unique notifications. A real MongoDB command failpoint forces transaction failure: publication rolls back, another due article still publishes, and retry later succeeds once.

Regression API reads passed for authentication, profile, staff, categories, tags, media, advertisements, Website CMS pages, analytics, notifications and public article feeds. Live ImageKit uploads/deletes and external mailbox delivery were not exercised.

Browser coverage includes a reader submission approved in admin and visible publicly with the correct count; enquiry status surviving refresh; actual SMTP verification and unsubscribe links; settings surviving refresh and updating public branding; staff invitation email, activation and new Editor login; public visibility only after scheduled publication; and a real database failure preserving contact input without claiming success. Browser page exceptions were checked; the final suite found none. Screenshots of comments and settings were generated and the settings screenshot was visually inspected.

The first browser attempt encountered an existing Vite server on port 5173. Its two identifiable test records (one enquiry and one pending subscriber) plus the associated test notification were removed using exact IDs, timestamps and content guards. No real reader records were deleted. The corrected harness uses port 5188 and checks port binding before browser navigation. Subsequent test records existed only in disposable databases and were removed with those databases.

## Remaining infrastructure and known limitations

1. **Brevo SMTP connection and authentication are verified.** The existing key and hostname remain under `SMTP_Key` and `SMTP_Server`, supported by the transport. After the sender and login were supplied, the `SMTP_LOGINS` value was copied into `SMTP_USER` in the ignored local environment file. The live `npm run email:verify` check passed without sending an email or displaying credentials. Sender acceptance and external inbox delivery remain untested. Restart the backend process to load the updated environment.
2. **The host is confirmed as an always-running Node server.** The local environment now explicitly uses `SCHEDULER_MODE=persistent`; the worker starts after the server connects to MongoDB, checks immediately and repeats every 60 seconds. No external cron service is needed for this deployment. Restart the server after editing environment settings. The optional protected external trigger remains available for a future hosting change.
3. **MongoDB must support transactions.** Use Atlas or a replica set. Run `npm run db:integration-indexes` before production traffic to create the required singleton, subscriber, notification and worker indexes. Production auto-indexing remains disabled as before.
4. **Existing frontend lint debt remains.** The 26 errors include unused declarations, two existing undefined `search` references in MediaLibrary, and state-in-effect diagnostics in unrelated components. These were not silently suppressed or expanded into unrelated repairs. The existing public archive still loads up to 50 articles through BlogProvider; server-side archive pagination beyond that existing limit was outside these fixes.
5. **SMTP acceptance is not inbox delivery.** No delivery webhook or promotional sending system was invented. Unsupported settings controls were removed instead of pretending their underlying capabilities exist.

See [server/INTEGRATION_SETUP.md](server/INTEGRATION_SETUP.md) for deployment configuration, safe legacy comment handling and repeatable test commands. Fake success timers were removed from the affected comments/contact/newsletter/settings/invitation flows; confirmation now follows a real backend result and accurately distinguishes persistence from email submission.

## Follow-up: confirmed Node host and existing Brevo credentials

Added `server/src/config/smtp.js`, `server/src/scripts/verifyEmail.js` and `server/test/smtpConfig.test.js`. Updated the email service, server startup diagnostics, test SMTP isolation, package scripts, environment example and setup guide. The ignored local `server/.env` preserves the existing key/server entries, explicitly sets persistent scheduling, and adds the missing login/sender fields as empty values for completion.

Executed after these changes: **4 SMTP configuration tests passed** and **12 backend integration tests passed**. The initial live verification correctly stopped when login/sender were absent. After those values were supplied, the login was mapped from `SMTP_LOGINS` into `SMTP_USER` and the live Brevo connection/authentication check passed. No actual email was sent; sender acceptance and external mailbox delivery were not claimed verified.
