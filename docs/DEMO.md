# Two-minute demo

1. Open Discover. Explain the problem: information is spread across local city, library, and volunteer websites.
2. Open Explore. Search “library”, filter to Palos Verdes Estates, and save Malaga Cove Library with the heart.
3. Switch to Local map. Open a numbered place and follow its official source or add it to My day.
4. Open My day. Suggest a three-hour afternoon, change the stop order, and download the itinerary. Saved favorites remain below.
5. Open Give back. Filter to Library & learning and follow a genuine organizer opportunity.
6. Open What's on. Browse an official calendar, then add a personal event and export its `.ics` file.
7. Open Neighbor board. Save an offer such as “Extra native plant seedlings”, filter to Offer, and reload. Explain that it is saved locally and has not been posted publicly.
8. Open Local resources & sources. Export a data backup.

## What to say honestly

The app is a functional static prototype. Its discovery and planning features work. Shared community posting and live data ingestion are future work. It does not book places, sign users up for volunteer events, confirm access, or calculate live travel times.

## Manual verification checklist

- Desktop and narrow screen layouts: readable text, no horizontal overflow, reachable navigation.
- Search + category + area + saved filters combine correctly; clear filters recovers from empty results.
- Place dialogs open via cards and map pins; Escape closes them and keyboard focus returns.
- Saving a place updates its accessible pressed state and survives reload.
- Adding, removing, reordering, generating, and downloading an itinerary work.
- A post containing HTML displays as text; filtering, deletion, and reload work.
- Personal event persists, exports a valid calendar file, and can be removed.
- Export/import backup round-trip retains data; malformed files are rejected.
- Links resolve to official sources; dynamic dates are checked with organizers.
