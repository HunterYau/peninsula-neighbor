# Local event discovery

The Events page and Today dashboard read a shared, persistent discovery feed. Member-organized events and RSVPs remain separate from outside organizer listings. The initial deployment has seven approved first-party sources. It does not monitor private groups or undisclosed private parties.

## Unattended update contract

The linked daily Sites task runs at 7:00 a.m. America/Los_Angeles. It obtains the selected Site through `get_site`, confirms owner-only access, obtains supported service access, and retrieves the current versioned instructions from `GET /api/discovery/instructions`. That document contains the exact allowlisted sources, request shapes, evidence requirements, and readback steps; it contains no credentials.

`POST /api/discovery/update` accepts JSON, `X-Discovery-Writer: scheduled-update`, and no browser Origin. It relies on **owner-private Sites dispatch authentication**, which accepts the Site's service bearer without a visitor identity. Do not make this Site public without replacing that boundary with explicit updater authorization. Service access grants no access to private member preferences, conversations, or hours. Never commit a bearer or put one in a task prompt.

1. Post `{"crawl":true}`. The server fetches only the three fixed library/city ICS feeds. Each host's robots policy is checked first; failed/denied robots checks stop that source. Redirects are rejected. Downloads are capped at 2 MB with 15-second request timeouts. Requests are sequential.
2. Research the other approved first-party pages and public search results for smaller announcements. This step is performed by the linked task, not by an AI API call from the site. Verify dates including the year, Pacific start/end times, public place, and participation requirements against the organizer. Use visible times only when verified; structured data can be wrong. Never infer missing times or dates.
3. Post supplemental `events` and actual `checks` using the schema in the saved instructions. Sources outside the allowlist require a code change before importing. Supplied URLs are evidence links, never arbitrary server fetch targets.
4. Read `GET /api/discovery` and verify persisted entries, check timestamps, and failures. Data-only updates do not require republishing.

Retries upsert existing records. Calendar UID plus recurrence ID preserves identity across renamed/rescheduled/cancelled occurrences. A normalized title/start/location fingerprint consolidates matching listings from multiple sources in the displayed feed. It is conservative, so differently worded cross-source duplicates may remain. Supplemental updates should include a stable `occurrence` when the organizer supplies one; use it unchanged for corrections. Explicit cancellations are retained with a cancellation badge. Missing entries are not assumed cancelled. Uncertain complete candidates use `status: review` and stay out of the public feed; the updater must recheck them before publishing.

A failed source does not advance old event freshness or delete old events. Entries older than 48 hours since their individual check carry a freshness warning. Expired events disappear from the public query; the updater removes event records older than 30 days. Exact-time events only: all-day entries and unresolved recurring rules are omitted instead of inventing a schedule. The public response is capped at 200 upcoming listings.

## Neighbor sightings

Signed-in members can share a public pop-up, stand, or gathering for 1–24 hours (default four). Sightings have a distinct **unverified** label, author, public location, posted time, and expiry. Authors can end them early. Other members can report them privately for owner review. The API validates links, ownership, expiry, origin, and the existing member write quota. Expired sightings disappear immediately; the updater later removes records expired over seven days ago.

## Coverage

- PVLD public ICS: calendar listings include events hosted by outside groups; appearance does not guarantee unrestricted attendance.
- RPV Recreation & Parks and City Manager: official public ICS, named Pacific timezone.
- Peninsula Shopping Center: public events page; its June listing was stale at setup and was not imported as upcoming.
- PVPLC: visible dated calendar and occurrence pages; machine-readable times may conflict, so verify visually stated times.
- Chamber: direct event detail pages; respect its excluded search/integration paths.
- Lunada Market: public business event announcements.

The task can discover announcements only on accessible public sources. It does not guarantee every local activity is covered, and a daily update can miss last-minute events. Visitors can reload the stored feed; this does not launch a new internet search. Neighbor sightings fill part of that gap. No paid AI API key is required by the application; scheduled research depends on the connected Sites task and its available search tools.
