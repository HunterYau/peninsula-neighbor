# Community maps and source policy

Implemented 2026-10-19. All new services use existing D1 storage and free public map/routing services, with no paid API key.

## Main map and directions

The Today page contains a working map and a prominent full-map entry. `#map` opens Explore; `#map?layer=access`, `coyotes`, `emergency`, and `report` link to layers. Leaflet supports dragging, touch pinch zoom, wheel zoom, keyboard controls, numbered marker clustering, distance scale, search-in-view, and a larger map mode (Escape exits). Listings have a Directions button. Driving and walking use FOSSGIS/OSRM; routes contain real provider distance, duration, GeoJSON geometry, and maneuver instructions. Estimated arrival is current device time plus the estimated duration, without live traffic. Starting points may be a labeled approximate neighborhood center, a user-selected map point, or permission-gated device location. Coordinates stay in page memory and are sent to the external routing service only on a directions request. Google Maps remains an optional handoff.

## Accessible route finder

- Real curb ramps (`kerb=lowered/flush`, `ramp:wheelchair=yes`) and accessible entrances (`entrance` plus `wheelchair=yes`) come from a bounded Peninsula Overpass query. Source node URLs and relevant tags are retained. Missing tags mean unknown.
- `lib/data/access-snapshot.json` is a dated, real initial snapshot of 1,214 OSM nodes retrieved October 19, 2026; it is not demonstration data or a city inspection. First use places it in D1's source cache. Refresh is attempted daily on use; stale data is labeled. Public source retries have a cooldown.
- Two city-documented facilities are separate facility-level pins: [Ladera Linda's ramp project](https://rpvca.gov/982/Ladera-Linda-Community-Park-Project) and [Rancho Caninos' accessibility listing](https://www.rpvca.gov/facilities/facility/details/Rancho-Caninos-Dog-Park-15). These are not precise entrance/ramp coordinates.
- Valhalla uses pedestrian costing with `type=wheelchair` and a strong stairs penalty. Users can choose a real mapped curb ramp near the destination as a waypoint. Returned instructions explicitly mentioning stairs are withheld. Routes near approved community access-barrier reports are also withheld.
- This is **wheelchair-aware routing, not guaranteed step-free routing**. The provider does not reliably enforce curb height or maximum slope, and a stairs penalty is not an absolute prohibition. Unknown surfaces, unrecorded stairs, current closures, and building interiors are not certified. Google Maps handoff is ordinary walking directions, not accessibility verification.
- Routing docs: [Valhalla route API](https://valhalla.github.io/valhalla/api/route/api-reference/), [costing implementation](https://github.com/valhalla/valhalla/blob/master/src/sif/pedestriancost.cc), [public-server usage](https://github.com/valhalla/valhalla#demo-server), [OSM copyright](https://www.openstreetmap.org/copyright).

## Coyote safety

Current official reporting and map links were checked against [RPV](https://www.rpvca.gov/335/Coyotes), [PVE](https://www.pvestates.org/services/police-department/coyote-information), and [Rolling Hills Estates](https://www.rollinghillsestates.gov/departments/public-safety/coyote-management). These communities use the Peninsula reporting system.

- Official form: https://survey123.arcgis.com/share/20a3860beb1e402193f11bc79cab69a7
- Official map: https://cityofrpv.maps.arcgis.com/apps/webappviewer/index.html?id=d41a82b9087448c4ab0ba189c81e9025
- Public city-system layer: https://services6.arcgis.com/ujpK9Y5GvE6XyZF1/arcgis/rest/services/RPV_Coyote_Sightings_-_3_view/FeatureServer/0

The adapter requests only IDs, observation/report dates and geometry, within explicit Peninsula bounds. It never fetches reporter contact data, address fields or comments. Only aggregate cells leave the server. Both observation and submission must be at least 24 hours old; only the preceding 30 days are included. Geometry is reduced to approximately 1 km cells, with pagination and numeric bounds checks. Cached summaries show the source-check time and can be older during an outage. City-system and website-community reports are shown separately to avoid implicit endorsement or double counting. Density indicates **reporting activity, not population or danger**. Empty areas are not an all-clear.

Community coyote reports require sign-in and administrator review, plus the same time delay. The site never files a city report automatically. Official reporting links and [CDFW safety guidance](https://wildlife.ca.gov/HWC/Coyotes) remain prominent.

## Emergency readiness

Five fire-station locations come from the official LA County facility directory, cross-checked with [RPV's Fire Department directory](https://www.rpvca.gov/1378/Fire-Department). They are not labeled open shelters or confirmed supply pickup sites. Current shelter and disaster-service status is handed off to the [Red Cross locator](https://www.redcross.org/get-help/disaster-relief-and-recovery-services/find-an-open-shelter.html). Evacuation zones and incidents use [PVPReady](https://www.pvpready.gov/), notifications use [Alert SouthBay](https://www.alertsouthbay.com/), and landslide/trail conditions link to current city information. The site does not invent hazard boundaries, choose evacuation routes, or promise emergency inventory. [Local supplies and preparation](https://www.rpvca.gov/234/Emergency-Preparedness-Tips) and [PVP CERT](https://www.pvpcert.org/) are included.

Household checklists are generated entirely in the browser, including people, pets, mobility/transport, equipment power, and children. Choices and checklist state are not transmitted or saved to an account; users can download their own text copy. Existing preparedness progress remains available.

## Reports, moderation and analytical views

`map_reports` stores authenticated community submissions. Authors can view and withdraw their own reports. All submissions start pending. `map-admin` requires the configured administrator identity on every request; hiding a tab is not the access boundary. Coyote and neighborhood problem coordinates/descriptions never appear in public responses. Approved access features may appear publicly with their source and community-review label. Approval does not represent an accessibility inspection.

The private problem map aggregates approved reports for broken sidewalks, dangerous intersections, fallen trees, inaccessible locations, illegal dumping, and recurring hazards. The admin-only coverage analysis awards 20 points for each of five categories with at least one local catalog record: events, accessibility features, volunteering, emergency resources, and stated youth eligibility. It excludes cancelled/expired entries and region-wide listings with no local assignment. OSM area assignments use nearest-center estimates rather than legal city boundaries. This measures catalog breadth, not population-normalized access, need, or proven inequity; missing data can cause a low score. It is hidden in an expandable admin panel.

## Volunteer match engine

Age, interests, area, Pacific days/time window and desired hours are used against current listed volunteer opportunities. Each result explains matches and missing eligibility information. Only actual dated session intervals produce potential hours; flexible programs show unknown hours and organizer-confirmation requirements. Planning does not create a completed or verified service record. Existing organization verification is retained.

## Storage and validation

Schema changes are append-only migration `0005_tiresome_moira_mactaggert.sql`. Source caches retain their last successful timestamp, with explicit failure states. Endpoints validate JSON size, types, region bounds, report age, compatible categories, URLs, ownership, same-origin mutations, write limits, and administrator access. Tests cover moderation visibility, delayed/coarse aggregation, privacy, official-source field selection, real OSM parsing, wheelchair request/geometry/stairs handling, barrier proximity, volunteer matching, and coverage semantics.
