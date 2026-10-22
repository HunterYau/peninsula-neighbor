# Local event discovery

The Events page and Today dashboard read a shared, persistent discovery feed. Member-organized events and RSVPs remain separate from outside organizer listings. The initial deployment has seven approved first-party sources. It does not monitor private groups or undisclosed private parties.

## Administrator update contract

As of October 22, 2026, the linked daily Sites task is paused. Preserve that state until unattended authorization has been configured and verified. The public Site must not rely on a caller-supplied header as authentication.

`POST /api/discovery/update` requires the configured, signed-in platform administrator, a matching browser Origin, and JSON. Ordinary members, password accounts (even with the administrator email), anonymous requests, forged writer headers and cross-origin calls are rejected before storage access. `GET /api/discovery/instructions` documents the current `discovery-v3-admin-auth` contract without credentials. Site service access alone does not authorize writes. Do not copy visitor cookies into an unattended task.

Use **Administrator → Refresh official calendars** for a manual import. Crawls are limited to once per minute; source failures are reported independently and preserve the last successful check. Data-only imports do not require deployment.

1. Post `{"crawl":true}`. The server fetches only the three fixed library/city ICS feeds. Each host's robots policy is checked first; failed/denied robots checks stop that source. Redirects are rejected. Downloads are capped at 2 MB with 15-second request timeouts. Requests are sequential.
2. Research the other approved first-party pages and public search results for smaller announcements. This requires separate authorized research; the paused task is not performing it. Verify dates including the year, Pacific start/end times, public place, and participation requirements against the organizer. Use visible times only when verified; structured data can be wrong. Never infer missing times or dates.
3. Post supplemental `events` and actual `checks` using the schema in the saved instructions. Sources outside the allowlist require a code change before importing. Supplied URLs are evidence links, never arbitrary server fetch targets.
4. Read `GET /api/discovery` and verify persisted entries, check timestamps, and failures. Data-only updates do not require republishing.

Retries upsert existing records. Calendar UID plus recurrence ID preserves identity across renamed/rescheduled/cancelled occurrences. A normalized title/start/location fingerprint consolidates matching listings from multiple sources in the displayed feed. It is conservative, so differently worded cross-source duplicates may remain. Supplemental updates should include a stable `occurrence` when the organizer supplies one; use it unchanged for corrections. Explicit cancellations are retained with a cancellation badge. Missing entries are not assumed cancelled. Uncertain complete candidates use `status: review` and stay out of the public feed; the updater must recheck them before publishing.

A failed source does not advance old event freshness or delete old events. Entries older than 48 hours since their individual check carry a freshness warning. Expired events disappear from the public query; the updater removes event records older than 30 days. Exact-time events only: all-day entries and unresolved recurring rules are omitted instead of inventing a schedule. The public response is capped at 200 upcoming listings.

## Neighbor sightings

Signed-in members can share a public pop-up, stand, or gathering for 1–24 hours (default four). Sightings require administrator approval, then have a distinct community-source label, author, public location, posted time, and expiry. Approval is not official verification. Authors can end them early. Other members can report them privately for owner review. The API validates links, ownership, expiry, origin, and the existing member write quota. Expired sightings disappear immediately; the updater later removes records expired over seven days ago.

## Coverage

- PVLD public ICS: calendar listings include events hosted by outside groups; appearance does not guarantee unrestricted attendance.
- RPV Recreation & Parks and City Manager: official public ICS, named Pacific timezone.
- Peninsula Shopping Center: public events page; its June listing was stale at setup and was not imported as upcoming.
- PVPLC: visible dated calendar and occurrence pages; machine-readable times may conflict, so verify visually stated times.
- Chamber: direct event detail pages; respect its excluded search/integration paths.
- Lunada Market: public business event announcements.

The importer and any future authorized research can discover announcements only on accessible public sources. It does not guarantee every local activity is covered, and a daily update can miss last-minute events. Visitors can reload the stored feed; this does not launch a new internet search. Neighbor sightings fill part of that gap. No paid AI API key is required by the application; unattended research remains paused until a supported writer identity is available and verified.
