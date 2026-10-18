# Integrated community features

The existing React/Vinext, D1, ChatGPT sign-in, Leaflet/OpenStreetMap, and custom CSS remain in use. No dependency, paid API, new account service, geocoder, or AI API is required by this update. The existing daily discovery task and all existing views remain available.

## Where to find things

| Workflow | Location |
| --- | --- |
| Search all events, volunteer roles, businesses, places, and resources | **Smart search & map**; also reached from the existing command search |
| Filter by area, distance, dates, type/category, participant age | Smart search; times/dates are Pacific |
| Click map pins for information, bookmarks, source links, and directions | Smart search map and the retained Explore map |
| Explained recommendations | Today and **My interests & activity** |
| Create a public listing | **Submit a listing**; privately pending administrator approval |
| Create a community event or short-lived sighting | Existing Events flow; new entries now require approval |
| Manage private age, interests, neighborhood, availability, optional badges | **My interests & activity** |
| Edit public display name and biography | Existing profile dialog / Saved & settings |
| Read organization contacts and associated opportunities | **Organizations**; stable shareable hash links from listings |
| Bookmark events / volunteer roles | Listing cards, discovery feed, event dialog, retained volunteer rows |
| Retrieve favorites | Existing **Saved & settings** with a new saved-opportunities panel |
| Log hours, export records, request confirmation | Existing **Volunteer** view |
| Review claims and confirm someone else's hours | Organization profile request, administrator approval, Volunteer representative inbox |
| Approve/reject/unpublish listings, events, sightings, organization affiliations; review reports | **Administrator review**, visible only to the configured site administrator |
| Discuss, ask questions, request help, reply, or message privately | Retained Community board and Private inbox |

## Authorization and moderation

`COMMUNITY_ADMIN_EMAIL` is a Sites runtime **secret**, initialized to the verified Site owner's email from the platform's access policy. It is checked against dispatch-provided identity, never a browser-supplied profile field. Missing configuration fails closed. No production administrator email is committed. The existing same-origin write requirement, bound SQL, Zod input validation, member quotas, private ownership rules, and participant-only inbox remain enforced.

The local-only Seedy development identity receives administrator access only when the portable dev server is running. Production builds omit this local binding and depend on the runtime secret.

New community submissions are stored privately as pending. Only an administrator can approve them; authors can withdraw their own submissions, including after publication. Approved submissions appear in the unified catalog, relevant existing views, and organization pages. Approval dates are labeled **administrator-reviewed community listing**, not official endorsement. New direct member events and sightings also enter review. Only their author can see a pending/rejected direct event or sighting; RSVPs require approval. Events and sightings that existed before this change are retained as legacy community information. Discussions continue publishing immediately as before.

Official curated resources and daily organizer-feed entries remain separate from reviewed community submissions. Dates refer to the actual directory review, source check, or administrative decision. Missing ages, eligibility details, registration deadlines, and coordinates remain unknown. No demonstration listings or fake account activity are seeded in production.

## Search, recommendations, and saved items

Search uses the shared normalized catalog, covering curated resources, imported events, approved member events, and approved submissions. The client combines all requested filters. Distance is a straight-line estimate from a selected neighborhood center or an explicitly requested device position. Device coordinates remain only in the mounted page, never in account settings or server requests. Listings without known coordinates cannot satisfy a distance filter and are counted as unmapped. No geocoding is fabricated.

Participant-age filters exclude known incompatible ages. Unknown ages stay visible unless the user selects the stricter known-eligibility option. Date filters exclude undated programs. The map uses existing approximate curated positions, recognized public venue positions, and explicitly supplied public-location coordinates; directions open the existing external map workflow.

Recommendation preferences are private and optional. Explicit incompatible ages, expired opportunities, cancelled events, elapsed registration deadlines, and timed opportunities outside the selected Pacific days/time window are excluded. Interest and neighborhood matches increase rank. Each suggestion explains its matches and flags unstated age rules or variable schedules. An unknown rule is not represented as confirmed eligibility.

Bookmarks reuse the existing preference sync, offline device storage, import/export, and account ownership marker. Events, discovery records, approved submissions, and curated volunteer programs use stable prefixed IDs. Existing directory favorites still appear in their existing sections. Cancelled upcoming discoveries remain visible in saved opportunities with a cancellation badge. Expired, withdrawn, rejected, removed, or no-longer-available listings are omitted; this is not a permanent archive or a reservation system.

## Volunteer verification and rewards

Existing hour entries start self-reported. Linking an entry associates it with a known organization. Requesting confirmation shares the volunteer's display name, date, minutes, organization, and service notes only with approved representatives of that organization. The volunteer receives the decision, review note, representative's display name, and timestamp. An administrator must independently confirm affiliation evidence before granting representative access. A representative cannot confirm their own hours, access another organization's queue, or override an already-reviewed request. Revoking affiliation stops future confirmation access; earlier confirmations retain their historical attribution.

Totals distinguish recorded and organization-verified hours. CSV exports include verification status, reviewer, and timestamp. This is an organization confirmation record, not a guarantee of school credit. Removing an hour record cascades to its verification association.

Rewards are private and off by default. Members can opt into milestones for discussions, helpful replies, approved contributions, recorded hours, and independently confirmed hours. Self-reported and verified milestones are labeled separately. There is no public ranking, cash value, or inferred award.

## Validation

See [VERIFICATION.md](VERIFICATION.md). The test suite uses the actual append-only SQL migrations and verifies moderation privacy, administrative permissions, organization records, private preferences, cross-member separation, verification authorization, recommendation explanations, and combined search filters in addition to all existing tests.
