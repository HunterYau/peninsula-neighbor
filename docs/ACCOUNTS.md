# Accounts and remembered sessions

The custom `/sign-in` page defaults to Peninsula Neighbor email/password login, with a Create account tab. The existing ChatGPT sign-in appears below the form. Google, Apple and Microsoft choices remain on the secure hosted ChatGPT account page. No direct Google OAuth client is configured, and the site does not pretend that a provider button is a direct Google login.

## Storage

Migration `0007_needy_grey_gargoyle.sql` adds `local_accounts` and `local_sessions` to the existing Cloudflare D1 database. A password account has a random `local:` user ID referring to the same member-scoped profile, preferences, hours, discussion and saved-item tables as other accounts.

- Passwords: native scrypt, N=16384, r=8, p=5, 32-byte output and a fresh random 32-byte salt. Plaintext passwords are never stored, logged, returned or placed in browser storage.
- Recovery: a random 256-bit code is shown once after signup or recovery. Only its SHA-256 hash is stored. A code is consumed once; successful recovery atomically changes the password and code and revokes all old sessions. A login racing with a reset cannot issue a session for the old password.
- Sessions: random 256-bit tokens; D1 stores only SHA-256 hashes. On HTTPS the `__Host-pn-session` cookie is Secure, HttpOnly, SameSite=Lax, Path=/ and has no Domain. Remember me sets a maximum 30-day lifetime. Without it, the cookie is browser-session-only and the server session expires after 24 hours at most. Browser session restoration behavior varies; Sign out explicitly revokes the stored session.
- Sign-out: same-origin POST revokes the local session and clears its cookie, then the existing hosted sign-out removes platform identity. The app clears its cached personal workspace when changing accounts or signing out.
- Abuse controls: bounded inputs, generic credential errors, same-origin JSON writes, per-email and hashed-IP request quotas, plus signup limits. Cookies and hashes never enter public API responses.

Profile details, interests and bookmarks are stored under the stable account ID and load after a later login, including from another device. Clearing cookies requires signing in again; it does not remove the account or saved data.

## Identity boundaries

Email ownership is **not verified** for password accounts. No email-verification or email-reset messages are sent because an outbound email service is not configured. The signup flow requires the member to acknowledge saving their recovery code. Without the password or code, recovery is unavailable. Email addresses are not published in posts or event listings.

Password and ChatGPT identities remain separate, even when their email addresses match. There is no automatic account linking or data transfer by email. Existing members should use the ChatGPT option to retain their existing workspace. A password account can never gain administrator access through an email match; administrator authorization still requires the platform identity and configured `COMMUNITY_ADMIN_EMAIL`.

The Sites dispatch-owned authentication routes and public audience remain intact. The app-level password accounts implement the owner's explicit request for independent accounts while preserving that integration. No paid API or new dependency is introduced.

## Verification

Authentication tests cover hashing, cookies, data persistence after a new login, duplicate/invalid credentials, cross-origin rejection, tampering, expiry, logout, recovery-code rotation, reset/login races, quotas and exclusion from owner/admin data. A real local Worker round trip verifies registration, optional interests, saved-item persistence, logout, new login and recovery. Chrome desktop and 390px phone QA covers default login, account creation and recovery forms.

Security implementation references: [OWASP password storage](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html), [OWASP sessions](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html), and [Cloudflare native crypto support](https://developers.cloudflare.com/workers/runtime-apis/nodejs/crypto/).
