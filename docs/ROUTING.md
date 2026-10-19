# Location and route handoff

## Starting point

The map initially uses the selected neighborhood's approximate center. It shows a visible choice to **Allow current location** or **Use a neighborhood instead**. Only the affirmative location action calls the browser Geolocation API (`enableHighAccuracy: true`, no cached fix, 15-second timeout). The browser enforces permission; a previously granted browser permission may not produce a second native prompt. The app still asks the visitor to choose location use.

Device accuracy and capture time are displayed. Denial, unavailable location, and timeout leave neighborhood browsing usable. Refresh requests a new fix; no continuous watch runs. Clear location, leaving the map, or a reported browser permission revocation clears the current page's position and route cache. Device starting coordinates are not written to an account, D1, local storage, or analytics. Deliberately submitted map reports are separate and persist under the report privacy policy.

## Travel distance and time

Straight-line distances remain useful for nearby sorting and radius filters; they are labeled as such. The old speed-based map travel times were removed.

For a selected known map pin, **Get directions · time & distance** explicitly sends the start and destination to the [FOSSGIS routing service](https://routing.openstreetmap.de/about.html). Its notice appears before the button, including that the provider logs requests. This is a direct HTTPS browser request with no cookies, an origin-only cross-site referrer, no redirects, and a 12-second timeout. A route requires a separate click; opening the map or selecting a place does not transmit a route request.

The provider's public frontend advertises:

- Car: `https://routing.openstreetmap.de/routed-car/route/v1/driving/`
- Foot: `https://routing.openstreetmap.de/routed-foot/route/v1/foot/`

The [OSRM route API](https://project-osrm.org/docs/v5.24.0/api/) returns route distance in meters and duration in seconds. The UI displays those service values with unit/rounding conversion, not an app-generated speed formula. It labels the result as lacking live traffic. Pin-to-network snap distances are bounded (500 m start, 250 m destination) and shown when over 50 m; approximate listing coordinates can still differ from an entrance or legal access route.

Only explicit single-route requests are made: no matrix, bulk loading, polling, or automatic retries. Requests within this page are serialized and limited to at most one per 1.1 seconds. Nearby list results use a five-minute memory cache keyed by start, destination and mode. The open route panel also shows its calculation timestamp; refresh directions when conditions change. Changing the selected destination, start, or mode aborts obsolete requests, and an obsolete response cannot replace the new route. Failures leave Google Maps available. Attribution and an “Improve the map” link appear beside routing results. This public community service is for light use; a larger deployment should use a dedicated or self-hosted routing provider that permits its expected load.

## Google Maps

**Open in Google Maps** appears on result cards, in details, and next to the map when a place is selected. It launches the documented [Maps Directions URL](https://developers.google.com/maps/documentation/urls/get-started) with a public destination and driving/walking mode. A permitted device location is included as the origin; the UI explains that opening the link shares that start with Google. Without it, origin is omitted so Google Maps can choose or request the starting point. Below the map, **Open this area in Google Maps** opens the currently visible map area.

Maps URLs require no API key. Traffic-aware Google route times remain in Google Maps; embedding Google's Routes API data inside this site would require a separately configured billing-enabled API project. No Google API key or paid service was added.

## Validation

Unit coverage includes location permission errors and fresh-fix options, coordinate order and separate routing profiles, explicit/omitted Google origins, response validation, credential omission, redirect rejection, and rate limiting. Live verification uses public neighborhood/venue coordinates, never the owner's personal location.

## Community map expansion

The map now draws route lines, shows turn instructions and estimated arrival, supports a manually selected map starting point, and offers a wheelchair-aware Valhalla profile with optional real mapped ramp waypoints. Read [the community-map policy](COMMUNITY-MAPS.md) for route limitations, known-barrier handling, source snapshots, report privacy and official emergency handoffs.
