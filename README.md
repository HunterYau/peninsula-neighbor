# Peninsula Neighbor

**A little closer to home.** A community website for Palos Verdes Estates and the surrounding Palos Verdes Peninsula, built for Neighborhacks.

Local opportunities are scattered between city websites, the library district, and conservation organizations. Peninsula Neighbor brings useful starting points together and helps residents turn discovery into a plan.

## What works

- **Discover:** a responsive community homepage with an original coastal illustration.
- **Explore:** eight curated local destinations, full-text search, city and category filters, bookmarks, and an interactive schematic map.
- **My day:** generate an itinerary by area, interest, and available time; add places, reorder stops, remove stops, and export an itinerary.
- **What's on:** official calendar links plus personal events with portable `.ics` calendar export.
- **Give back:** volunteer directory with category filters and direct organizer links.
- **Neighbor board:** create, filter, and remove personal offers, requests, lost-and-found notes, and ideas.
- **Your data:** persistent browser storage plus JSON backup export/import with validation.
- **Local resources:** transparent source attribution and direct official links.

## Run locally

No dependencies, API keys, account, or build service are needed.

```sh
python3 scripts/build.py
python3 -m http.server 4173 --directory dist
```

Open `http://localhost:4173`. You can also open `dist/index.html` directly for a quick preview; a local HTTP server gives browser storage a stable origin. The generated `bundle.js` allows the page to work without JavaScript module loading from a server.

With Node 20+ installed:

```sh
npm run build
npm run check
npm test
```

## Deploy

The site is static. Publish `dist/` with GitHub Pages, Cloudflare Pages, Netlify, or any static host. No server-side runtime is needed. The included GitHub Actions workflow deploys `dist/` to GitHub Pages when Pages is configured to use **GitHub Actions** in repository settings. Hash-based routes work under a repository subpath.

The `.openai/hosting.json` manifest also records the optional private Sites hosting project. It contains no credentials.

## Project structure

```text
dist/
  index.html        # Accessible page shell
  styles.css        # Responsive layout and visual system
  data.js           # Curated places, source URLs, and opportunity directory
  core.js           # Search, planner, storage validation, calendar serialization
  app.js            # Views, forms, dialog, storage, and interactions
  bundle.js         # Generated portable build; do not edit directly
  assets/           # Original SVG illustration and identity
scripts/build.py    # Dependency-free bundler
tests/core.test.js   # Behavioral tests using the Node standard library
docs/DEMO.md        # Demo walkthrough and honest project scope
docs/SOURCES.md     # Content provenance and maintenance notes
```

## Data and scope

This is a working browser-local hackathon prototype. **Posts and events are not published to other neighbors.** Bookmarks, plans, posts, and personal events live in `localStorage` on the current origin. There are no user accounts, shared database, live closure feed, or live event aggregation. Calendar links go directly to organizers for current dates. The map is an illustrated guide, not a routing or navigation service; durations and the 20-minute transfer allowance are estimates.

Changing device, browser, or hostname creates separate local storage. Export a backup before moving between deployments. Storage failures are handled in memory with a visible notice. Imports accept only the supported backup version, validate records, limit size, and merge by record ID. User content is escaped before rendering.

Directory information was curated October 17, 2026 from official city, library, and organization websites. Check organizers for current hours, access, availability, and volunteer eligibility. See [sources](docs/SOURCES.md).

## Accessibility and privacy

Semantic landmarks, a skip link, keyboard controls, visible focus indicators, labeled forms, native modal focus handling, reduced-motion support, and responsive mobile layouts are included. Fonts use local system fallbacks. The app loads no third-party resources; external links open organizer websites. The app requests no location access and sends no board or planner content to a server.

## Next steps for a public community pilot

Before enabling shared posts: add authentication, a shared database, moderation/reporting, clear deletion controls, and abuse prevention. Verify local needs with residents and organizers. Add organizer-approved event ingestion only with a reliable update and expiration process.

Built with AI assistance. Review the applicable hackathon's current rules and disclose tools as required. This project is independent of the cities, PVLD, and other linked organizations.
