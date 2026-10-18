# Local content and data sources

Directory curated October 17, 2026. Recheck source pages before a public pilot. Summaries use original wording; no business ranking or invented review is included.

| Direct source | Used for |
| --- | --- |
| [PVE Recreation](https://www.pvestates.org/services/recreation) | Farnham Martin Park, Lunada Bay Plaza, and Paseo Del Mar bluff paths |
| [PVLD Locations](https://www.pvld.org/locations) | Malaga Cove, Peninsula Center, and Miraleste libraries |
| [PVLD Services](https://www.pvld.org/services) | Library and study-resource starting point |
| [PVLD Volunteering](https://www.pvld.org/volunteer) | Library volunteer application, age 14+, and Book Room role |
| [PVLD Calendar](https://pvld.libnet.info/events) | Direct program-calendar link |
| [Point Vicente visitor page](https://www.rpvca.gov/1204/Visit-Point-Vicente-Interpretive-Center) | Interpretive center and docent information |
| [Vicente Bluffs](https://www.rpvca.gov/1158/Vicente-Bluffs-Reserve) | Reserve description and source map |
| [Ladera Linda facility](https://rpvca.gov/Facilities/Facility/Details/Ladera-Linda-Community-Park-9) | Park and facility information |
| [Abalone Cove](https://www.rpvca.gov/1178/Abalone-Cove-Shoreline-Park-Reserve) | Coastal park and access restrictions |
| [RPV Trail Alerts](https://www.rpvca.gov/trailalerts) | Current access starting point |
| [PVE Maintenance](https://www.pvestates.org/services/public-works/maintenance) | Public works, sewer-overflow channel, and outage channel |
| [PVE Public Works FAQ](https://www.pvestates.org/services/public-works/faq-s) | Collection/recycling and maintenance questions |
| [PVE Tree Requests](https://www.pvestates.org/how-do-i/get-my-tree-trimmed) | Public tree concern process |
| [PVE Permits](https://www.pvestates.org/services/permits) | Permit and application starting point |
| [PVE Public Safety](https://www.pvestates.org/services/public-safety) | Emergency resources, non-emergency police line, and official Peninsula links |
| [PVE organizations](https://www.pvestates.org/community/organizational-links-new) | Community and senior-support starting points |
| [PV Transit](https://www.palosverdes.com/pvtransit/) | Local transit agency |
| [LA Metro](https://www.metro.net/riding/trip-planner/) | Regional trip planning |
| [PVPUSD](https://www.pvpusd.net/) | School district starting point |
| [211 LA](https://211la.org/) | Community support starting point |
| [LA County Animal Care](https://animalcare.lacounty.gov/) | Pet and shelter resources |
| [PVPLC](https://pvplc.org/) | Conservation and organizer-linked volunteering |
| [Peninsula Chamber](https://business.palosverdeschamber.com/list) | Additional local business directory |
| [Yellow Vase](https://www.yellowvase.com/) | Malaga Cove café listing |
| [Malaga Cove Ranch Market](https://www.malagacoveranchmarket.com/) | Market listing |
| [Lunada Market](https://lunadamarket.com/) | Local market and kitchen listing |
| [Peninsula Shopping Center](https://peninsulashoppingcenter.com/) | Shopping directory listing |
| [PVPReady](https://www.pvpready.gov/), [Alert SouthBay](https://www.alertsouthbay.com/), [Ready.gov](https://www.ready.gov/) | Direct preparedness guidance |

## Map

The map uses [Leaflet](https://leafletjs.com/) and [OpenStreetMap](https://www.openstreetmap.org/copyright), with visible attribution. Map tiles are requested only when map view is opened. No tiles are prefetched or included in offline caches. Map requests go to the public tile service and have its own usage/privacy terms; there is no location-permission request. A larger public pilot should choose an appropriate production tile provider.

## Live integrations

- [Open-Meteo documentation](https://open-meteo.com/en/docs): PVE-area forecast, Fahrenheit and mph, timezone America/Los_Angeles. The app credits Open-Meteo. Review API usage terms before commercial use.
- [NWS API documentation](https://www.weather.gov/documentation/services-web-api): active weather alerts for a fixed public PVE-area point. These do not replace local evacuation notifications. `null` means unavailable; an empty successful response is described precisely.

Visit durations and travel estimates are product estimates. Coordinates are approximate area positions used for discovery and planning, not surveying or safe navigation. Do not mark an outdoor place open merely because it appears in the directory. No public dated events or organizer openings are fabricated or copied into a stale feed.

Update `lib/catalog.ts` to maintain entries. Keep factual changes source-backed and update the curation date after reviewing the directory. Public-source examples and judging priorities are in [RESEARCH.md](RESEARCH.md).
