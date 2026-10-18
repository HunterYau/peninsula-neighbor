# Photography and event images

## Local photography

Four real photographs are bundled in `public/photos/`. The source file pages, original/download URLs, authors, licenses, and resized dimensions are recorded in [the asset manifest](../public/photos/credits.json). These are historical/place photographs, not live camera views or pictures of current events.

| Image | Photographer | License | Used for |
| --- | --- | --- | --- |
| Point Vicente Lighthouse on Cliff | Nhostetler | CC BY-SA 3.0 | Home header, Point Vicente area/place previews |
| Malaga cove | Cardinalngold | Public domain | Explore neighborhood banner and local guide introductions |
| Malaga Cove Library | Sgerbic | Public domain | Library previews and detail, new resident and student guide introductions |
| Abalone Cove - D600 Long Exposure | n4rwhals | CC BY-SA 2.0 | Abalone Cove preview and detail, Volunteer introduction, outdoors guide |

Files are Wikimedia's 1280px resized versions. CSS crops some display frames; other than resizing and display crops, the photographs are unchanged. The sunset image retains its original photographer watermark. Credits and source/license links appear alongside or over each photograph. CC BY-SA photographs retain their respective source licenses; no ownership or endorsement is claimed. The Commons file pages are authoritative attribution references.

Topic banners name the pictured location and provide neighborhood context. They do not depict a current volunteer activity or imply that a listed event takes place at that location. The Today page gives its three featured places larger photo previews; the shared banners stack their image and text on small screens.

## Event imagery

Imported event images are optional, source-linked organizer photos, flyers, or artwork. They are not substituted with a random landscape or generated picture of an event. The initial research found imagery on PVLD's Unraveled and ACOTAR pages and RPV's Pumpkin Decorating event. These organizers' remotely hosted images remain on their original hosts, with visible credit and a link to the corresponding event page. No open license is asserted for organizer promotional material, and no copies of those images are bundled in this repository.

- `lib/photos.ts` defines shared image validation, local-photo metadata, and place associations.
- `app/ui/Photo.tsx` provides lazy loading, explicit alt text, credits, no-referrer requests, reserved image space, and a broken-image fallback.
- Event details preserve full artwork with `object-fit: contain`; landscape previews use a display crop.
- Member event and community submission forms accept an optional public image URL, accurate description, author/organizer credit, original source, and a permission confirmation. New submissions and their images remain private until administrator approval.
- `lib/event-photos.ts` checks a bounded batch of up to eight upcoming official event pages during the existing daily update. Source robots policies, fixed source-host access, response limits, manual redirects, timeouts, and a 25-second overall image-check budget apply. Completed checks are cached for seven days.
- Event JSON-LD images or event-page social images are considered; recognizable logos/default images are excluded. A browser image is never fetched as an arbitrary URL by the server. Failed remote images degrade to a labeled placeholder.
- The update endpoint supports `photos:[{source,url,photo:{src,alt,credit,source}}]` for an existing imported event. Null explicitly removes the image. Image-only patches do not claim the event's date/details were reverified; subsequent calendar imports with no image preserve an existing image.
- Public image links must use HTTPS with no credentials, non-default port, literal IP, localhost, or local/internal hostname. Bundled image paths use the fixed `/photos/<name>.jpg` shape. Image and credit URLs are rendered as data, never injected HTML.

The existing daily task retrieves its current instructions from `/api/discovery/instructions` (`discovery-v2-photos`). Its cadence and access policy are unchanged. Event imagery availability depends on what organizers publish and keep accessible.
