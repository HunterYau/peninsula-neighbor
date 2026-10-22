# Ask PV

`codex/pv-chatbot` branches from `codex/peninsula-redesign` at `ed97aec4bdd6a11f6e23c3111b79985268651a1e`, retaining the account, maps, interests and home recommendations work. The Ask PV navigation tab opens `/ask-pv`.

## Free inference choice

The default model is [Qwen3 0.6B](https://huggingface.co/Qwen/Qwen3-0.6B), quantized by MLC and run through [WebLLM](https://webllm.mlc.ai/docs/). Both use Apache-2.0 licensing. `@mlc-ai/web-llm` is pinned to 0.2.86. Thinking is disabled for short, faster answers. The model runs in a dedicated browser worker and streams actual completion deltas as they are generated; there is no simulated typing timer.

This avoids per-token charges, paid inference services, provider accounts and API keys. Hosted free tiers need credentials and impose shared quotas; source-only retrieval is quicker but cannot synthesize flexible conversational answers. On-device generation plus source retrieval is the selected balance. Existing website hosting and database quotas still apply; this does not make an unlimited hosting or performance promise.

The model download is approximately 352 MB plus its runtime. A compatible WebGPU browser and sufficient device memory are needed (the prebuilt fp16 model lists approximately 1.4 GB GPU memory). A float32 variant is selected when shader-f16 is unavailable. Download/initialization progress is shown, and files can be cached by the browser. Slow devices and connections take longer. Users can choose **Quick source answers** to skip the download entirely. Model failure falls back to this mode and says so clearly.

## Grounding and freshness

`/api/ask-pv` reads only the public community catalog: curated places and resources, official resident guides, upcoming organizer listings, and approved community listings. It also includes documented links for coyote reporting, accessibility, trail alerts, and preparedness. Intent-matched website feature guides in `lib/ask-pv-site.ts` explain implemented pages and controls, including sign-in and review requirements. Relevant website instructions are supplied first, and the prompt asks the model to present these before external options. Deterministic “On this website” links and instructions remain visible independently of generated text. Coyote guidance points to Community map → Coyote safety → Add a community sighting, and separately to the official City form; a site submission does not file a city report. This public retrieval endpoint does not read account records or perform account actions. Signed-in recommendations and supported actions use separate authenticated endpoints described below. The assistant does not read private inbox conversations, other users’ records, or service-hour records. This is not an unrestricted web search.

Question matching retrieves up to four relevant sources, with source types and original check dates. Cancelled events, expired events/deadlines, and incompatible explicitly stated ages are excluded. Relative event dates use the Pacific calendar. Unknown ages, opening hours, route access and current hazard status stay unknown. Follow-up references can reuse the preceding question; a new subject does not silently inherit it.

The model sees bounded excerpts, explicit requirements and schedules, the current date, and the resolved subject of follow-up questions. Its instructions require concise answers with numbered citations, admission of missing facts, and treating retrieved text as data rather than instructions. Sources remain available independently of the model text. This reduces hallucination; it does not certify every generated sentence. The UI tells users to check sources, particularly for changing details. Unsupported questions get an honest source-based response instead of an ungrounded model guess.

## Downloads, privacy and cancellation

The browser downloads model files directly from these pinned public repositories:

- `mlc-ai/Qwen3-0.6B-q4f16_1-MLC` at `8c14ce481d4c692769976ad52afea453a102df19`.
- `mlc-ai/Qwen3-0.6B-q4f32_1-MLC` at `9b4f0b05b08c692ea86fe151ea878406ad22f428`.

Direct downloads avoid sending hundreds of megabytes through the website's server. The model host receives normal file-download metadata; questions and conversations are not sent there. The runtime WASM comes from WebLLM's versioned official model-library URL. No inference requests go to Hugging Face or an AI provider.

Questions and the preceding question go to this website for source retrieval. Signed-in users’ completed conversations are saved to private D1 `ask_chats` rows through `/api/ask-chats`. Every read, rename, save, delete and restore is scoped to the authenticated user; the community administrator role does not grant access to another user’s chat through this API. Guest conversations are stored only in localStorage in the current browser, separately from account history; they are not silently imported into an account. People sharing a browser can see its guest history. Chat contents are not sent to the model host or written to application logs. Normal infrastructure request metadata and browser model caching still exist. Stop aborts retrieval/model operations and terminates the worker, then saves the interrupted conversation. Leaving during generation tears the worker down; an unfinished new turn is not guaranteed to be saved.

## Verification

Run `npm run check`, `npm test`, and `npm run build`. Tests cover relevance, missing evidence, publication boundaries, age and date constraints, prompt bounds, exclusion of prior generated answers from factual context, streamed control-tag removal, same-origin input validation, no account writes, and cancellation. Browser QA must separately prove real model generation, multiple streamed deltas, follow-up behavior, cancellation, source-only mode and mobile layout. A passing build or fallback answer alone does not prove the model is operational.

## Conversation workspace and history

The Ask PV workspace has a collapsible, searchable history sidebar, New chat controls, automatic titles from the first question, rename, delete and undo. Mobile history expands above the conversation rather than covering the composer. Completed, failed and explicitly stopped turns save with their answers, source links, original verification dates, website actions and follow-up subject. Reopening a conversation never regenerates its old answers or treats generated text as factual evidence; a new question retrieves fresh public site sources. The original free inference, streaming, Stop and quick source modes are preserved.

Migration `0008_busy_turbo.sql` adds `ask_chats` and its owner/update index. The table references profiles with cascading removal. History lists return summaries, and message bodies are fetched only when opening a chat. Account writes use revision checks so a stale browser tab cannot overwrite a newer chat or revive a deleted one. Deletion hides an account conversation and allows Undo; its row remains private in D1. Guest deletion removes the browser entry with a one-action Undo held in the mounted page. Only the most recent deletion has an Undo control.

Limits are 100 active conversations per account/browser and 100 messages per conversation, plus a bounded save request and the existing per-member write quota. At the message limit, visitors start a new conversation instead of silently losing older turns. Saving failures are visible and can be retried. Guest storage failure or malformed stored history does not overwrite existing entries. The model remains on-device; this feature adds no paid API or external storage service. Conversations from before this feature were not persisted and cannot be recovered.

History tests cover owner isolation (including local-account and platform-admin boundaries), reloadable messages and sources, rename/delete/undo, stale revision conflicts, same-origin writes, input/source-link validation, storage bounds and profile removal. Browser QA checks reopening after reload, continuing a restored conversation, account persistence, guest persistence, controls and desktop/mobile layout.

## Personalized account actions

Signed-in Ask PV can use the current user’s saved recommendation settings (interests, goals, neighborhood, optional age, availability, place types and ways to help) to rank real public catalog listings. Interests mentioned in the question refine the current search without silently editing the profile. All suggestions retain the listing’s eligibility, source link, source check date and an explanation of why they match. Unknown schedules and age requirements stay unknown. Fun events, volunteer opportunities, places, businesses and resources use the same existing catalog and matching rules.

Examples:

- “Recommend something fun based on my interests.”
- “Find volunteering in nature that fits my interests.”
- “Save the first one and add it to my planner.”
- “Create an activity based on my interests and add it to my planner.”
- “Create a private event called "Birthday walk" tomorrow at 2 pm for 2 hours.”
- “Help me organize a public volunteering event.”

`POST /api/ask-assistant` interprets supported intents with bounded, deterministic matching, rather than allowing model-generated SQL or arbitrary tools. Clear private bookmark and planner commands execute and return confirmed receipts. Ambiguous references ask the visitor to choose; a new recommendation request does not inherit an unrelated earlier selection. General information questions retain the existing public retrieval and on-device AI path. The local model does not directly access D1, make writes, or send private preferences to an inference provider. Signed-out visitors can still ask public information questions; account actions require sign-in.

`POST /api/ask-actions` supports explicit card actions: bookmark a current listing, add a private plan, or submit a reviewed event/volunteer draft. Server code re-reads the catalog and authenticated account, enforces source eligibility and current publication/date status, and never trusts a model’s claim that a write occurred. Listing text cannot trigger actions. Existing same-origin checks and per-member write quotas apply. Bookmark writes append atomically without replacing other saved preferences. Repeat saves do not create duplicate bookmarks or duplicate linked activity plans.

`/account/planner` now includes **My activities & calendar** above the retained day planner and reminders. The authenticated `/api/activity-plans` endpoint stores private activities in D1. Migration `0009_cloudy_gamma_corps.sql` adds this table, its profile reference with cascading removal, owner/date index, and owner/listing uniqueness. Visitors can schedule, edit notes, mark activities completed, remove/restore them, create personal activities, filter completed or undated plans, and export planned, dated activities as an `.ics` calendar. Calendar export is a download for import, not an OAuth connection or automatic external-calendar sync.

Organizer dates are kept when present; otherwise an opportunity is saved under **Needs a date**. Natural-language scheduling supports today, tomorrow, weekdays and ISO dates with explicit AM/PM times and an optional duration in hours. All schedule fields use Pacific time and validate daylight-saving gaps. A personal schedule is distinguished from an organizer’s published schedule. When a day is requested without a time for an undated activity, that requested day is retained in its notes and a time must be chosen in My planner.

Public event and volunteer creation shows an editable draft with required venue/schedule fields and a **Submit listing for review** button. Only submission creates a pending row in the existing submissions table; the ordinary administrator process controls publication. A private planner copy is optional. Plans and bookmarks do not register with external organizers, reserve a venue, award volunteer hours, or publish private plans. Completed volunteering links to the existing hours tracker; it does not invent credited hours. Coyote reports, inbox messages and authentication changes remain outside these account actions.

Action cards and confirmed receipts are saved with private chat history and reopen without re-executing writes. Buttons revalidate the current account and listing whenever used. The existing chat modes, history controls, source citations and cancellation remain; an in-flight atomic account change cannot be cancelled through Stop. General AI generation remains cancellable.
