# Peninsula redesign

Implementation branch: `codex/peninsula-redesign`. The original GitHub `main` is preserved. The existing ChatGPT Site is published from the exact commit on the redesign branch through the Sites source and deployment workflow. Sites has a separate source repository with its own configured `main`; it does not automatically track the GitHub feature branch. Future changes must be published through that workflow.

## Focused pages

- `/`: short introduction, community map, weather and useful resource links.
- `/map`: existing interactive map, directions and safety layers.
- `/discover`: search, places, events and local guides, each on a subpage.
- `/resources`: 29 official-source guides in five topics, search, city filters and bookmarks. Detail URLs use `/resources/guide/:id`; topic URLs use `/resources/topic/:id`.
- `/community`: board, organizations, submissions and volunteering.
- `/volunteer`, `/volunteer/match`, `/volunteer/hours`: programs, matching and private hour records.
- `/account`: saved items/settings, planner, inbox and interests/activity.
- `/preparedness`: existing household planning tools.
- `/admin`: server-authorized owner administration.

Legacy hash links are translated to canonical URLs; Back/Forward navigation remains supported. Unknown pages and unknown resource guides return 404.

## Secure account entry

`/sign-in?next=...` now defaults to real Peninsula Neighbor email/password login and signup. ChatGPT sign-in is an alternative underneath, preserving its top-level dispatch-owned anchor and hosted provider choices. Salted password hashes and hashed session tokens live in D1; protected cookies can remember devices. See [account storage, recovery and identity boundaries](ACCOUNTS.md).

The return URL goes through `/welcome`, where display name, area and interests are optional. No selected interests is valid. Skip records completion without altering preferences. Saving updates the current member's profile and interests atomically, preserving saved places, preparedness, age, availability and reward settings. Subsequent sign-ins skip completed onboarding. My interests remains editable. Return paths are restricted to local paths and reject recursive authentication destinations.

Migration `0006_green_adam_warlock.sql` adds a member-scoped onboarding completion record. Hosting applies generated migrations during deployment; existing data is retained.

## Content and design

Official-source summaries were researched on October 20, 2026. They describe starting points, preparation and eligibility where published, with direct official links and check dates. They do not replace city forms, applications or live service availability. All 29 guides participate in Smart Search and saved listings. The resources directory also links to all four Peninsula city websites.

Local photos use the existing bundled, licensed assets and visible credits documented in PHOTOS.md. The new `app/redesign.css` uses muted sage, stone and dark green surfaces, responsive cards and contextual navigation. No paid API, video service or new dependency is required.

## Verification

- TypeScript check and all 74 tests pass, including identity scope, optional interests, skipping without preference changes, settings preservation, safe redirects, old links, official provenance/search and saved guide integration.
- Local HTTP checks: root, search, topic/detail guides, matching, hours, interests and welcome return 200; unknown page and unknown guide return 404.
- Chrome desktop and 390px phone inspection: home, sign-in, resource detail, saved filter, mobile navigation and interactive map render correctly. Local development sign-in reaches onboarding; Skip reaches My Space; a bookmarked guide appears in the saved filter after navigation. No browser console warnings or errors were captured in that flow.
- Hosted identity is owned by the platform. Local development uses its simulated account; no new external provider account was created during QA.
