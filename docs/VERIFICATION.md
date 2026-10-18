# Version 2 verification

Work performed October 17–18, 2026. This file is updated as gates finish; it is not a claim that an untested feature is verified.

## Completed evidence

- Clean full-stack build: Vinext client, server, and Cloudflare Worker artifacts generated successfully.
- TypeScript check passed after the full-stack implementation.
- 23 automated tests passed using Node’s standard test runner and a fresh SQLite database loaded from the actual generated migration.
- Tests cover anonymous/cross-origin rejection; cross-user shared posts and replies; author-only changes; input validation; bound search parameters; RSVP idempotency, capacity, cancellation and ownership; private preferences and hours; report persistence; expiry and write quota; planner constraints; cross-resource search; end-of-month reminder behavior; calendar escaping and UTF-8 folding; backup validation/merge; CSV formula protection; and complementary help suggestions.
- Initial local D1 migration applied successfully (14 SQL commands); the append-only inbox migration also applied successfully (6 commands).
- Local server returned HTTP 200 for the app, real empty shared post results, and signed-out profile state.
- Development sign-in returned a profile and default account preferences through the real HTTP routes.
- Local live-condition route returned forecast data and a successful empty NWS-alert response, with source timestamp and no errors.
- Real HTTP smoke test passed through development sign-in, post/reply/resolution, event creation, RSVP/cancellation, and private service-record operations. All disposable records were removed.
- Additional tests verify participant-only inbox access, private/public separation, closure/reopening rules, unread acknowledgement boundaries, earlier-message pagination, a send/closure race, and public-board pagination/author filters.
- Secondary text colors used in the readability pass were checked numerically: `#63757d` on white has a contrast ratio of approximately 4.8:1.

- Initial owner-private v2 deployment succeeded at https://peninsula-neighbor.hunteryau.chatgpt.site, version `appgver_f7f0c05c35d48191a83fc3728088510a`, from source commit `e2fadd92010965cc3dcc6177fcc0dfb332e84852`. Native database inspection confirmed all nine application tables in the hosted `DB` binding.
- The same source commit is pushed to the existing private GitHub repository. The local and `origin/main` hashes matched after GitHub Desktop completed the push.

## Pending verification

- Browser layout and interaction inspection: automatic approval review rejected preview navigation after the old file URL was blocked. Explicit approval for the new HTTP development URL has been requested; no alternate browser surface was used.
- Mobile layouts, keyboard paths, and full UI form/export round-trips still require the browser pass.


## Limits to claims

Automated tests exercise actual SQL and API logic, but do not establish resident adoption, visual quality, hardware/mobile compatibility across all browsers, or official organizer endorsement. Local development identity is simulated by the starter and is separate from hosted platform sign-in. No evidence of interviews or measurable community outcomes has been invented.


## Daily discovery implementation

- 29 tests and TypeScript passed, including Pacific DST, calendar line folding, exact-time validation, organizer URL restrictions, robots policy, retry deduplication, stable occurrence updates, cancellation/review states, stale-source behavior, and sighting ownership/reporting/expiry.
- Actual PVLD and RPV public ICS downloads parsed successfully: 366 valid future timed library listings and four recreation listings at setup. All-day or incomplete entries were omitted.
- Discovery migration applied to local D1 successfully (six commands).
- Built Worker HTTP checks returned 200 for the application, discovery feed, sightings, and versioned updater instructions. Browser-origin and missing-writer-header update attempts returned 403, malformed event payload returned 400, and an empty unattended update plus persisted readback returned 200.
- Browser layout QA remains unavailable under the earlier preview approval restriction; no alternate browser access was attempted.
