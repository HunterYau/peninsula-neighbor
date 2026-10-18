# Peninsula Neighbor

**Your Peninsula, connected.** An everyday community platform for Palos Verdes Estates and the surrounding Peninsula, built for Neighborhood Hacks.

Peninsula Neighbor brings local discovery, practical services, neighbor-to-neighbor help, events, volunteering, and personal planning into one consistent workspace. It is a full-stack React application with a shared Cloudflare D1 database, not a set of browser-only demo forms.

## Product

| Area | Working capabilities |
| --- | --- |
| Today | Daily overview, live PVE-area weather, NWS weather-alert status, community activity, upcoming events, reminders, and preparedness progress |
| Community | Publish offers, requests, free exchanges, lost-and-found notes, recommendations, and ideas; topic and area context; server search and pagination; replies; author controls; resolved state; expiry; reporting; complementary help suggestions |
| Private inbox | Start a conversation from a post; participant-only access; unread tracking; earlier-message pagination; conversation closure; export of loaded messages |
| Events | Daily discovered organizer listings, source/freshness labels, date/area/search filters, short-lived neighbor sightings, source coverage; member-created events, capacity-limited RSVPs, and calendar export |
| Explore | 14 sourced local destinations and businesses; area/category/search/free/saved filters; interactive OpenStreetMap map with approximate listing positions; directions; bookmarks; add-to-plan |
| Local services | 23 practical resources, searchable by everyday terms such as bus, trash, power, school, study, permits, and senior support |
| Volunteer | Organizer-linked opportunities, bookmarks, a private service-hours record, and CSV export |
| Be prepared | Personal checklist, direct official guidance, weather outlook, NWS alerts with explicit feed-failure states, and printable text export |
| Local guides | New resident, family, student, outdoors, and support guides with relevant services and places |
| My planner | Day suggestions constrained by time, area, interests, free visits, and travel mode; distance-aware transfers; reordering; itinerary export; one-time and recurring reminders; calendar export |
| Saved & settings | Saved resources, display profile, larger-text preference, account sync, JSON backup/import, and v1 backup compatibility |
| Across the app | Responsive navigation, keyboard search (`⌘/Ctrl K`), labeled controls, native dialogs, reduced-motion support, installable web manifest, and an offline reminder page |

There are no invented users, fake reviews, manufactured attendance counts, or sponsored rankings. An empty community board stays empty until someone contributes.

## Run locally

Requires **Node.js 24** and npm. No paid APIs or personal API keys are required.

```sh
npm run install:ci
npm run build
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_polite_kate_bishop.sql
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0001_flippant_northstar.sql
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0002_lowly_lily_hollister.sql
npm run dev -- --hostname 127.0.0.1
```

Open the printed local URL, normally `http://127.0.0.1:5173/`. The portable starter supplies a **development-only** sign-in route at `/signin-with-chatgpt?return_to=/`. It uses a simulated identity for local development; hosted sign-in is handled by the Sites platform. Never expose the dev server publicly.

Apply each SQL migration once, in order. Local database state lives in ignored `.wrangler/state/`. A production preview can be started with `npm start` after building and migrating.

```sh
npm run check   # TypeScript
npm test        # Core logic and multi-user database/API behavior
npm run build  # Client, server, and Worker artifact
```

## Architecture

- **UI:** React 19, TypeScript, Vinext/Vite, Lucide icons, custom responsive CSS.
- **API:** same-origin route handlers; Zod validation; bound SQL statements.
- **Persistence:** Cloudflare D1; Drizzle schema and generated migrations. Personal data is scoped to the authenticated user on the server.
- **Identity:** dispatch-owned Sign in with ChatGPT; no custom password handling. Email is never included in public posts or event data.
- **Local state:** preferences are also stored on-device for convenience and offline reminders. Sign-out clears the local workspace. A new signed-in workspace can preserve anonymous device preferences.
- **Discovery:** scheduled first-party calendar imports and evidence-checked public announcements; persistent source checks, stale/cancelled states, and expiring neighbor sightings. See [the updater contract](docs/DISCOVERY.md).
- **Conditions:** server-fetched Open-Meteo and NWS data with bounded timeouts and short caching. The client does not request location permission.
- **Deployment:** the tracked Sites manifest provisions the `DB` binding. Publish through the Sites workflow; migrations are applied by the hosting platform. This full-stack version cannot be deployed to GitHub Pages as static HTML.

```text
app/ui/CommunityApp.tsx       Interface and workflows
app/api/[...path]/route.ts   Shared community API adapter
app/api/conditions/route.ts  Cached weather and weather-alert adapter
lib/api.ts                  Authorization and data operations
lib/catalog.ts              Curated local content and provenance links
lib/tools.ts                Search, planning, calendar, reminder, and matching logic
lib/validation.ts           Input and preference schemas
db/schema.ts                Database schema
drizzle/                    Immutable generated migrations
tests/                      API tests against SQLite and pure behavior tests
docs/RESEARCH.md             Research, comparison, and product priorities
docs/DEMO.md                 Demo walkthrough
docs/VERIFICATION.md         Current verification evidence and limits
```

## Responsible operation

Write actions require sign-in and same-origin requests. Authors control their posts and events. Private inbox access is limited to the two participants through the app. Either participant can close a conversation; only the closer can reopen it. Site operators retain database administration access. Private-message contents never enter public feed queries. Shared posts expire; personal records do not become public. An atomic RSVP insert protects capacity. Per-member hourly write quotas limit abuse. Reports are stored privately for the site owner to review through the D1 administration tools; there is no automatic moderation or guaranteed response. A public community pilot still needs an assigned moderation process and organizer outreach.

Messages refresh when a conversation is opened or refreshed; no email or push notification is sent. Workspace backups do not contain private messages; each conversation can export the messages currently loaded.

The app does not verify residency, certify volunteer hours, reserve outside venues, submit city requests, or send emergency notifications. Maps and travel estimates are approximate. External calendars remain with their organizers; the app does not imply that a program has a confirmed date or opening without a source. Check official information before acting.

The private hosted audience and private GitHub repository remain private unless their owner explicitly approves a change. For submission, review the current hackathon requirements, including its public-repository requirement. Do not claim interviews, resident adoption, or outcomes that have not occurred.

The original v1 source is preserved in Git history and the local `base-v1` tag. This project was created with AI assistance; disclose tools in the submission as required. All product code is inspectable. Local facts and primary sources are documented in [SOURCES.md](docs/SOURCES.md).
