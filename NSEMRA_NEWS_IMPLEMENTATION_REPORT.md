# Nsemra News: rebrand, mock-data removal, env Super Admin login, notification deletion

Implemented 18 October 2026 on the existing React / Express / MongoDB codebase. No rebuild, no new dependencies, no second auth system, no WebSockets.

## Results of verification actually run

| Check | Result |
| --- | --- |
| Backend integration suite (existing) | 12 passed / 0 failed, before and after the changes |
| New suite `npm run test:nsemra` | 7 passed / 0 failed |
| Browser acceptance suite (Playwright, built app, disposable DB) | 9 passed / 0 failed, including a new notification-UI journey |
| SMTP config tests | 4 passed / 0 failed |
| Frontend production build | Passes (existing >500 kB chunk warning) |
| Frontend ESLint | 20 errors / 6 warnings, all in files whose flagged lines predate this work (previous report: 26 / 8). No errors in new or rewritten code. |
| Built bundle scan | Contains no admin email, admin password, JWT secret or ImageKit private key, and no `NewsFront` / `NSEMRA NEWS` text |
| Live check against the running local backend | `.env` credentials log in as `super_admin`; HttpOnly cookie; no token in body; wrong password returns 401; logout works |

Not exercised: live ImageKit uploads, external mailbox delivery, multi-tab polling in a real browser (covered at API level: deleted rows never return on refresh).

## Admin authentication

- Variables used (values not shown): `ADMIN_EMAIL`, `ADMIN_PASSWORD` in `server/.env` (`BOOTSTRAP_ADMIN_*` accepted as fallback).
- Login: React → Axios → Zod → bcrypt comparison against the MongoDB `Admin` hash → signed JWT in an HTTP-only cookie. The configured credentials already matched the stored hash; nothing was re-synchronized.
- Sync is explicit only: `npm run admin:sync -- --dry-run`, then `npm run admin:sync`. Hardened to refuse ambiguous targets, never convert Editor/Author accounts, use the password exactly as configured, and revoke old sessions when the password changes.
- No hardcoded credentials remain. Eight legacy scripts that logged in with `NewsFrontAdmin2026!` / `Password123!` and wrote to the real database were removed.

## Notifications

| Method | Endpoint | Behaviour |
| --- | --- | --- |
| DELETE | `/api/admin/notifications/:id` | Recipient-scoped delete. Returns `wasUnread`, `unreadCount`, `total`. Another admin's ID returns 404. |
| DELETE | `/api/admin/notifications/bulk` | Zod-validated ObjectIds, 1–100, deduplicated. Returns `deletedCount`, `deletedIds`, `unavailableIds`, `unreadCount`, `total`. |
| POST | `/api/admin/notifications/bulk-delete` | Same as above, for clients that drop DELETE bodies. |

- UI: per-row checkbox, select all / deselect all (scope is the current page only and is cleared on page or filter change), bulk toolbar with count, confirmation dialogs that stay open until the server answers, and accurate success and partial-result messages.
- Polling (Axios, 30 s): the header preview and the Notifications page now keep separate lists. Request sequencing plus a mutation epoch discard any poll that overlapped a delete. Badge counts come from server responses.
- Deleting a notification never touches articles, comments or audit logs (tested).

## Articles

- Save Draft writes to MongoDB, then opens `/admin/articles/:id/edit`, so a refresh reloads it. Later saves update the same record, including after a failed submit/publish step.
- `expectedUpdatedAt` stale-write protection returns 409.
- Fields added to the form: featured-image alt text, canonical URL, Open Graph title/description/image, and a Comments Enabled toggle (new `Article.commentsEnabled`, enforced on public comment submission).
- Tags limited to existing MongoDB tags; no category pre-selected; empty states for categories and tags.

## Mock / simulated data removed

- Frontend: `src/data/admin/*` (10 mock datasets) and `src/assets/blogs.js`.
- `AdminContext`: all session-only create/update/delete, the "simulated" notifications, and role preview. The dashboard delete button was fake; it now archives through the API.
- Fallbacks removed:
  - Dashboard stats derived from partial lists.
  - Category chart fallback.
  - House advert with an invented "500,000 decision-makers" claim.
  - Contact page metrics ("< 2 Hours Average Response", "100% Confidential").
  - "100% Verified Newsroom".
- Invented people and titles removed: five named "lead correspondents", a hardcoded five-person About team, "Accredited Correspondent", and stock-photo staff avatars (now initials).
- Homepage: "Editor's Choice" shows only articles flagged as featured; "Most Read" is ranked by recorded views. All Stories features only flagged articles.
- Server: demo seeders `seedArticles.js`, `seedTaxonomy.js`, `seedSiteContent.js`. None ran at startup. Fresh-install CMS contact defaults no longer invent emails or phone numbers.
- Removed files are backed up outside the repo (scratchpad `removed-files/`).

## Bugs found and fixed along the way

- Media Library crashed (`ReferenceError: search`) whenever the library was empty.
- The browser test suite could drive the developer's real backend if `dist` was built normally. It now refuses to start unless built for its isolated API.

## Brand

- All public and admin copy, page titles, Open Graph and Twitter defaults, structured-data publisher, emails (invitation subject, body and signature, newsletter), and notification text now read **Nsemra News**.
- MongoDB settings and 4 CMS pages migrated via `npm run brand:migrate -- --apply`. New revisions were created and history kept; JSON backup taken first.
- A bare `SMTP_FROM` address now gets the "Nsemra News" display name; the address is unchanged.
- Kept for compatibility (internal, not shown to readers):
  - ImageKit folders `/newsfront/...` (renaming would orphan existing files)
  - JWT issuer/audience, cookie name `newsfront_admin_token`, database `newsfront_db`
  - npm package name, DOM event `newsfront:settings`

## Needs owner input

1. **Demo/test records in the local database (not deleted).** These include 29 seeded or test articles (8 of them published and public, with fabricated view counts), 1 test author account, 1 test category, 10 demo ad campaigns, 1 placeholder media record, and 9 test notifications. Run `npm run db:demo-report` to see them; `-- --apply` deletes only those exact records, after a backup. The seeded categories/tags and "Accra Tech Summit 2026" are listed for review only and are never deleted.
2. **Contact details.** The live CMS contact page still lists `tips@newsfront.com`, `newsroom@newsfront.com` and two phone numbers. Replace them in Website CMS → Contact with real addresses.
3. **About page team.** It is hidden until real team data exists.
4. **Logo / favicon.** Still text-based "NN"; no new brand asset was supplied.
5. **Domain.** No domain or canonical URL was assumed.
