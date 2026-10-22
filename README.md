# Peninsula Neighbor

**Your Peninsula, connected.** A community website for Palos Verdes Estates and the surrounding Palos Verdes Peninsula, built for Neighborhood Hacks.

[Open the live website](https://peninsula-neighbor.hunteryau.chatgpt.site/) · [Try Ask PV](https://peninsula-neighbor.hunteryau.chatgpt.site/ask-pv) · [Explore the community map](https://peninsula-neighbor.hunteryau.chatgpt.site/map)

The current visual design is on **`codex/pv-civic-design`**, branched from `codex/pv-chatbot`. It retains the chatbot, accounts, maps, expanded interests, home recommendations, and forecast-matched weather icons. The presentation uses a coastal-blue and navy civic masthead, warm gold accents, regional photography, and a responsive navigation layout. The original `codex/pv-chatbot` appearance remains on its branch; `main` retains the earlier version.

The civic appearance is inspired by regional municipal websites. Peninsula Neighbor remains an independent community project and does not claim government affiliation or use a city seal. Styling is isolated in `app/civic.css`; presentation markup and the original lighthouse illustration are the other visual changes. The civic design retains account authorization, database schema, map logic, recommendations, and AI behavior. The Administrator page also provides a central map-report queue, so pending coyote sightings can be reviewed without opening map analytics.

## Features

| Feature | What it does |
| --- | --- |
| Home | Local photography, prominent map access, PVE-area weather, alert status, and a full-width scrollable recommendations list |
| Smart search | Search events, volunteering, businesses, places, and resources; filter by location, distance, date, category, and participant age |
| Community map | Pan, zoom, clustered pins, place details, bookmarks, starting-point selection, route lines, turn instructions, distance, travel time, arrival estimates, and Google Maps links |
| Accessible route finder | Mapped ramps and entrances, wheelchair-aware route planning, optional ramp waypoints, and community access-barrier reports |
| Coyote safety | Separate city and reviewed community report summaries, approximate cells (website reports appear immediately after approval), safety guidance, and links to official reporting |
| Emergency readiness | Official resource locations, evacuation information links, household preparedness checklists, and downloadable plans |
| Ask PV | Free on-device AI with streamed answers, local sources, follow-ups, website guidance, Stop/Clear controls, and a source-only mode |
| Personalized recommendations | Match interests, goals, preferred places, ways to help, neighborhood, optional age, and availability; explain each match |
| Volunteer matching | Enter age, interests, schedule, and desired hours to find current opportunities and see potential service-hour estimates |
| Volunteer hours | Record completed service, associate an organization, export CSV, and request confirmation; self-reported and organization-verified totals stay separate |
| Community board | Offers, questions, assistance requests, discussions, replies, reporting, and author controls |
| Private inbox | Participant-only conversations, unread tracking, message pagination, closure, and export of loaded messages |
| Events | Organizer listings with source/check dates, community events, capacity-limited RSVPs, calendar export, and expiring public pop-up sightings |
| Community submissions | Submit events, volunteer opportunities, businesses, and resources for administrator approval; track status and withdraw submissions |
| Organization profiles | Contact details, source links, associated opportunities, and administrator-reviewed representative affiliations |
| Accounts and saved items | Custom email/password accounts, alternative ChatGPT sign-in, remembered sessions, profiles, interests, bookmarks, and activity history |
| Resident guide | 29 original guides based on city, library, and transit sources, with shareable pages, official links, check dates, and bookmarks |
| Personal planner | Day suggestions, time/area/interest filters, itinerary ordering, reminders, and calendar/text export |
| Optional rewards | Private participation and volunteer milestones, with distinct self-reported and verified achievements |
| Administrator tools | A central review queue for coyote sightings, accessibility/map reports, listings and affiliations; private neighborhood problem patterns and catalog coverage analysis |

The interface supports desktop and mobile layouts, keyboard search (`⌘/Ctrl K`), labeled controls, larger text, and reduced motion. Local photographs and organizer imagery retain their source credits. Empty community areas stay empty until people contribute; the app does not seed invented users, reviews, or attendance.

## Ask PV: local information and website guidance

Ask PV uses **Qwen3 0.6B** (about 600 million parameters), quantized by MLC and run through **WebLLM** in a browser worker. Compatible WebGPU hardware is required for AI mode. The first use downloads several hundred megabytes of model files from pinned Hugging Face revisions; later visits can use the browser cache. Inference runs on the visitor’s device and streams actual generated tokens. No paid inference API, provider account, or API key is required.

Questions go to the website’s read-only retrieval endpoint, which finds up to four relevant public sources. These include directory entries, resident guides, organizer listings, public community listings, and descriptions of implemented website features. The model receives reference notes and is instructed to use them, admit missing information, and explain relevant website options before external options. Source links, labels, and check dates remain visible independently of generated text.

For example, asking where to report a coyote sighting explains **Community map → Coyote safety → Add a community sighting**, including sign-in and administrator review, before mentioning the separate official City report. Clickable **On this website** cards also point to saved items, interests, volunteer hours, submissions, discussions, and other relevant pages.

**Quick source answers** skips the model download and quotes matched information. Unsupported questions receive an explicit missing-information response. AI can still make mistakes; it does not browse the whole internet for each question, independently verify every sentence, access private accounts, or submit forms for users. Chats stay in the mounted page and are not saved to an account or D1.

See [Ask PV implementation, downloads, privacy, and limitations](docs/ASK-PV.md).

## Maps, location, and weather

Maps use **Leaflet and OpenStreetMap**, with attribution and no map API key. Only listings with known coordinates receive pins. Visitors can allow current location, select a neighborhood, or choose a map starting point. Browser location permission is requested after an affirmative click; a neighborhood center is clearly labeled as approximate. Device coordinates stay in the page until a visitor requests routing, which sends the origin and destination to the route provider.

Nearest sorting uses labeled straight-line distance. On-demand routes use FOSSGIS/OSRM road and footpath data for route distance and estimated time, with timeouts and short page-memory caching. Google Maps links let visitors continue there for directions and traffic-aware estimates. Route availability and accessible passage are not guaranteed: missing slopes, curb heights, closures, and ramps remain unknown.

The home weather card and five-day outlook use the same forecast descriptions to choose their images: clear skies, clouds, rain/showers, thunderstorms, fog, and snow receive matching icons. Loading and unavailable data use neutral symbols. Weather comes from Open-Meteo with National Weather Service hourly/daily forecasts as backup; NWS alerts load separately. Sources and forecast times are shown in Pacific time. Failed refreshes may retain a clearly marked forecast for up to an hour; an alert-feed failure is never shown as “no alerts.” Weather is a PVE-area forecast, not a measurement at the visitor’s position.

Coyote reports require care: community submissions need administrator review and appear immediately after approval in roughly 1 km cells. City-system summaries retain a separate 24-hour delay. A site report **does not file an official city report**. Map cells show reporting activity, not coyote population or whether a route is safe. Emergency maps and checklists do not provide live evacuation, road, or shelter status.

See [routing and location](docs/ROUTING.md) and [community map sources and limitations](docs/COMMUNITY-MAPS.md).

## Accounts, recommendations, and moderation

The default `/sign-in` page offers custom email/password login and account creation, with passwords hidden initially. ChatGPT sign-in appears underneath; additional provider choices are on its hosted sign-in page. Password accounts and ChatGPT identities remain separate even when their email addresses match.

Cloudflare D1 stores account records, salted password hashes, hashed session tokens, member preferences, bookmarks, community content, and volunteer records. Protected cookies support Remember me for up to 30 days. Signup supplies a private recovery code; email verification and email password resets are not configured. Private records are scoped to the authenticated member, and email addresses are excluded from public posts and events.

Recommendation preferences are optional and editable under **My space → My interests & activity**. Matching uses explicit preferences and listing information, rather than an LLM or paid recommendation service. Known incompatible ages, expired/cancelled opportunities, and timed activities outside the selected availability are filtered out. Unknown requirements remain unknown. Rewards are private and off by default.

New listing submissions, community events, sightings, map reports, and organization affiliations enter administrator review. Discussions publish directly and can be reported. Legacy listings retain their provenance labels. Approval means administrator review, not city endorsement. Only the configured platform administrator can access `/admin`; a custom password account cannot gain administrator access through an email match. `COMMUNITY_ADMIN_EMAIL` is a runtime secret, never a browser profile setting.

Approved organization representatives can confirm other volunteers’ hours for their organization. That confirmation is recorded separately from self-reported hours and does not guarantee school credit. Operators retain database administration access; application privacy controls do not hide records from the database operator.

See [account storage and recovery](docs/ACCOUNTS.md) and [community workflows and authorization](docs/COMMUNITY-FEATURES.md).

## Event discovery and information quality

The shared discovery feed stores allowlisted organizer calendars and evidence-checked public announcements, alongside reviewed community contributions. Listings retain source URLs, actual check times, eligibility and registration details when known, and stale/cancelled labels. Passed events and deadlines are excluded from current recommendations and Ask PV retrieval.

**Deployment status reviewed October 21, 2026:** the linked daily discovery task is paused. Existing imported listings remain available according to their dates and freshness. Reloading the feed does not trigger a new internet search. The updater was designed for owner-private Sites authorization; review that authorization before enabling unattended updates on a public Site. Do not assume automatic daily crawling is active.

Coverage is limited to accessible public sources. Private groups and private parties are not monitored, and undisclosed schedules, coordinates, age rules, and current hazard conditions are not invented. Community reports and administrator review are distinguished from official information. See [the discovery contract](docs/DISCOVERY.md) and [local sources](docs/SOURCES.md).

## Run locally

Use **Node.js 24** and npm. Start from this implementation branch:

```sh
git clone --branch codex/pv-civic-design https://github.com/HunterYau/peninsula-neighbor.git
cd peninsula-neighbor
```

Install dependencies and build, then apply the SQL migrations below **once, in order, for a fresh local database**. For an existing database, apply only migrations that have not already been applied. Local data lives in ignored `.wrangler/state/`.

```sh
npm run install:ci
npm run build
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_polite_kate_bishop.sql
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0001_flippant_northstar.sql
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0002_lowly_lily_hollister.sql
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0003_parched_bastion.sql
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0004_smiling_rawhide_kid.sql
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0005_tiresome_moira_mactaggert.sql
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0006_green_adam_warlock.sql
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0007_needy_grey_gargoyle.sql
npm run dev -- --hostname 127.0.0.1
```


Open the printed URL, normally `http://127.0.0.1:5173/`. The portable development server has a development-only simulated sign-in at `/signin-with-chatgpt?return_to=/`; production hosted sign-in is handled by Sites. The simulated local identity has local review access. Keep the development server local. After building and migrating, `npm start` runs a local production preview.

### Checks

```sh
npm run check   # TypeScript
npm test        # Core logic and database/API behavior
npm run build  # Client, server, and Worker output
```

GitHub Actions runs these checks on pushes to `main`, `codex/peninsula-redesign`, and `codex/pv-chatbot`, and on pull requests. Browser checks are still needed for GPU inference, real token streaming, responsive layouts, and interactive map behavior.

## Architecture and deployment

| Layer | Implementation |
| --- | --- |
| Interface | React 19, TypeScript, Vinext/Vite, Lucide icons, custom CSS |
| API | Same-origin route handlers, Zod validation, bound SQL queries, server authorization |
| Database | Cloudflare D1 with Drizzle schema and generated migrations |
| Identity | Custom password accounts and Sites-managed ChatGPT sign-in |
| Maps | Leaflet/OpenStreetMap, FOSSGIS/OSRM routes, external Google Maps actions |
| AI | WebLLM 0.2.86, pinned MLC Qwen3 0.6B model downloads, on-device generation |
| Hosting | Sites on Cloudflare Workers; `.openai/hosting.json` retains the existing project ID and `DB` binding |

**Pushing to GitHub does not publish the website.** GitHub stores the source branch; Sites uses a separate managed source repository. Website changes must be built, synchronized, saved as a version, and deployed through the Sites workflow. Hosted deployments apply generated migrations. This full-stack application needs a Worker and D1; it cannot run as static HTML on GitHub Pages.

The application requires no paid AI or map API keys. Hosting, storage, and public data services retain their own quotas and terms; this is not a promise of unlimited free infrastructure. Do not commit credentials, runtime secrets, recovery codes, or local database files.

### Source map

```text
app/civic.css                Civic presentation layer
app/ui/CommunityApp.tsx       Main interface and integrated workflows
app/ui/AskPV.tsx              Chat, streaming UI, website actions, and sources
app/ui/WeatherIcon.ts         Shared forecast-matched weather icons
app/api/[...path]/route.ts    Community API adapter
app/api/ask-pv/route.ts        Public read-only chat retrieval endpoint
app/api/conditions/route.ts    Weather and alert endpoint
lib/ask-pv.ts                 Retrieval, prompt construction, and source handling
lib/ask-pv-site.ts            Website feature guidance and routes
lib/ask-pv-client.ts          Browser model loading, streaming, and cancellation
lib/api.ts                   Authorization and data operations
lib/catalog.ts               Curated places and provenance
lib/weather.ts               Weather providers, validation, fallback, and caching
lib/personalization.ts       Interest and goal choices
lib/tools.ts                 Search, planning, reminders, and matching
lib/navigation.ts            Canonical website routes
lib/validation.ts            Input validation
db/schema.ts                Database schema
drizzle/                    Generated SQL migrations
tests/                      Logic and database/API checks
```

### Further documentation

- [Ask PV](docs/ASK-PV.md)
- [Accounts, sessions, and recovery](docs/ACCOUNTS.md)
- [Community workflows and permissions](docs/COMMUNITY-FEATURES.md)
- [Community maps](docs/COMMUNITY-MAPS.md)
- [Routing and location privacy](docs/ROUTING.md)
- [Event discovery](docs/DISCOVERY.md)
- [Redesign and routes](docs/REDESIGN.md)
- [Photo credits](docs/PHOTOS.md)
- [Source directory](docs/SOURCES.md)
- [Demo walkthrough](docs/DEMO.md)
- [Verification notes](docs/VERIFICATION.md)

Some supporting documents describe earlier implementation milestones; the current source and dated deployment status above take precedence for current behavior. The original version remains in Git history and the local `base-v1` tag. This project was created with AI assistance; disclose tools according to the hackathon’s submission requirements.
