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

### Hosted discovery readback and schedule

- Initial hosted run exposed Workers' lack of `redirect: error`; switched to `manual` and reject non-2xx responses. A regression test verifies redirect rejection and that HTML is not accepted as a calendar. The suite now has **30 passing tests**, with TypeScript and the official Sites build passing.
- The corrected hosted import processed 384 future timed calendar records: four RPV Recreation & Parks, 14 RPV community-calendar, and 366 PVLD listings. Three additional verified Chamber/Conservancy announcements were saved. This is a count of source records processed, not a claim of 387 unique events. The public feed conservatively consolidates matching fingerprints and returns the next 200.
- All seven source-check records persisted with truthful outcomes. Peninsula Shopping Center's stale June event was omitted; uncertain PVPLC plant-sale times were omitted. No neighbor sightings or member activity were manufactured.
- The private Site's supported service credential retrieved the current `discovery-v1` instructions, exercised the unattended writer without a visitor identity or browser Origin, and read back the saved hosted feed and source checks.
- Linked cloud task `Automation_690cc59e88f48191b3d9aed4e3c54f3e` was saved enabled for daily 07:00 America/Los_Angeles, starting October 18, 2026. Creation verifies saved scheduling; its first scheduled execution has not yet been observed. The initial import above was run during setup through the same unattended writer.
- The application remains owner-private. Browser visual inspection is still unverified under the earlier preview approval restriction.


## Integrated community workflows

- 39 tests and TypeScript checks pass. Tests retain all previous discussion, inbox, discovery, RSVP, ownership, preference, planner, and export checks and add administrator-only approval, pending-feed privacy, unpublication and withdrawal, organization profiles, private demographic/availability preferences, opt-in rewards, representative-only hour verification, self-verification rejection, verification cascade cleanup, combined search filters, Pacific dates, distance/unknown-coordinate behavior, source deduplication, and saved cancellation handling.
- Generated append-only migration `0003_parched_bastion.sql` adds five tables and three indexes; applied successfully to local D1 (eight commands).
- Real local HTTP smoke passed: development sign-in, shared discussion/reply/resolution, administrator-approved event, RSVP/cancellation, and volunteer service record. Disposable records were removed.
- Additional local HTTP round-trip verified pending submissions are absent from anonymous catalog reads, administrator approval makes a listing visible, organization profiles are produced, member age/interests/availability persist privately, recommendations carry explanations, favorites persist through the existing preferences endpoint, optional badges are enabled only on request, and the representative inbox responds. Its disposable contribution was withdrawn and original member settings restored.
- Production administrator authorization uses a Sites runtime secret configured from the platform-verified Site owner's email; it is absent from source and client code. Missing configuration fails closed. Local mock administration is only in the portable development configuration.
- Production build uses the official Sites packaging workflow. No new dependencies or paid APIs were introduced. The existing daily automation is preserved.
- Browser visual and mobile interaction inspection remains unverified under the earlier preview-navigation approval restriction. No alternate browser surface was used. Responsive CSS and native controls are included, but automated database and HTTP results do not establish visual quality.

## Photo refresh

- Added four credited, reusable Palos Verdes photographs, checked against their Commons file pages and inspected locally. The home header, selected place previews/details, and Explore banner use real place photography. Source/license links are visible in the interface and documented in `public/photos/credits.json` and `docs/PHOTOS.md`.
- 45 tests and TypeScript checks pass. New checks cover image metadata validation, public HTTPS links, logo/source filtering, cached and robots-aware event-page image discovery, preservation/removal of image metadata across imports, pending-image moderation, event/catalog serialization, and bundled JPEG/license evidence.
- The official Sites build passes. The append-only image migration adds photo metadata to events and discoveries plus an image-check timestamp; it applied locally in three commands.
- Local HTTP returned 200 for the redesigned home page and all four JPEGs with the correct image content type. The home HTML includes the photo header, image asset reference, and photographer credit.
- Three genuine organizer event images were persisted through the unattended writer and returned by both discovery and unified catalog APIs: PVLD Unraveled artwork, PVLD ACOTAR artwork, and RPV Pumpkin Decorating flyer. These are source-linked organizer images, not stock photos or invented event photographs.
- Existing local HTTP regression checks for sign-in, discussion/reply/resolution, event approval, RSVP/cancellation, and private service records still pass, with disposable records removed.
- The existing daily discovery instructions are now `discovery-v2-photos`. No schedule duplication or audience change is needed.
- Desktop/mobile visual inspection is pending explicit permission for the project's HTTP preview, because automatic approval review previously rejected preview navigation as a workaround for a blocked file URL. No alternate browser surface has been used.
