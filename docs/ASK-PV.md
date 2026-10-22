# Ask PV

`codex/pv-chatbot` branches from `codex/peninsula-redesign` at `ed97aec4bdd6a11f6e23c3111b79985268651a1e`, retaining the account, maps, interests and home recommendations work. The Ask PV navigation tab opens `/ask-pv`.

## Free inference choice

The default model is [Qwen3 0.6B](https://huggingface.co/Qwen/Qwen3-0.6B), quantized by MLC and run through [WebLLM](https://webllm.mlc.ai/docs/). Both use Apache-2.0 licensing. `@mlc-ai/web-llm` is pinned to 0.2.86. Thinking is disabled for short, faster answers. The model runs in a dedicated browser worker and streams actual completion deltas as they are generated; there is no simulated typing timer.

This avoids per-token charges, paid inference services, provider accounts and API keys. Hosted free tiers need credentials and impose shared quotas; source-only retrieval is quicker but cannot synthesize flexible conversational answers. On-device generation plus source retrieval is the selected balance. Existing website hosting and database quotas still apply; this does not make an unlimited hosting or performance promise.

The model download is approximately 352 MB plus its runtime. A compatible WebGPU browser and sufficient device memory are needed (the prebuilt fp16 model lists approximately 1.4 GB GPU memory). A float32 variant is selected when shader-f16 is unavailable. Download/initialization progress is shown, and files can be cached by the browser. Slow devices and connections take longer. Users can choose **Quick source answers** to skip the download entirely. Model failure falls back to this mode and says so clearly.

## Grounding and freshness

`/api/ask-pv` reads only the public community catalog: curated places and resources, official resident guides, upcoming organizer listings, and approved community listings. It also includes documented links for coyote reporting, accessibility, trail alerts, and preparedness. Intent-matched website feature guides in `lib/ask-pv-site.ts` explain implemented pages and controls, including sign-in and review requirements. Relevant website instructions are supplied first, and the prompt asks the model to present these before external options. Deterministic “On this website” links and instructions remain visible independently of generated text. Coyote guidance points to Community map → Coyote safety → Add a community sighting, and separately to the official City form; a site submission does not file a city report. Ask PV guides visitors but does not submit forms, read account data, or change settings. It never reads profiles, private discussions, messages, pending submissions, saved items or volunteer records. This is not an unrestricted web search.

Question matching retrieves up to four relevant sources, with source types and original check dates. Cancelled events, expired events/deadlines, and incompatible explicitly stated ages are excluded. Relative event dates use the Pacific calendar. Unknown ages, opening hours, route access and current hazard status stay unknown. Follow-up references can reuse the preceding question; a new subject does not silently inherit it.

The model sees bounded excerpts, explicit requirements and schedules, the current date, and the resolved subject of follow-up questions. Its instructions require concise answers with numbered citations, admission of missing facts, and treating retrieved text as data rather than instructions. Sources remain available independently of the model text. This reduces hallucination; it does not certify every generated sentence. The UI tells users to check sources, particularly for changing details. Unsupported questions get an honest source-based response instead of an ungrounded model guess.

## Downloads, privacy and cancellation

The browser downloads model files directly from these pinned public repositories:

- `mlc-ai/Qwen3-0.6B-q4f16_1-MLC` at `8c14ce481d4c692769976ad52afea453a102df19`.
- `mlc-ai/Qwen3-0.6B-q4f32_1-MLC` at `9b4f0b05b08c692ea86fe151ea878406ad22f428`.

Direct downloads avoid sending hundreds of megabytes through the website's server. The model host receives normal file-download metadata; questions and conversations are not sent there. The runtime WASM comes from WebLLM's versioned official model-library URL. No inference requests go to Hugging Face or an AI provider.

Questions and the preceding question go to this website for source retrieval. The conversation lives in the mounted page and is not stored in D1, the account, localStorage or server logs by application code. Reloading or leaving the chat clears it. Normal infrastructure request metadata and browser model caching still exist. Stop aborts retrieval/model operations and terminates the worker, releasing GPU resources; Clear also removes the displayed conversation. Navigation tears the worker down.

## Verification

Run `npm run check`, `npm test`, and `npm run build`. Tests cover relevance, missing evidence, publication boundaries, age and date constraints, prompt bounds, exclusion of prior generated answers from factual context, streamed control-tag removal, same-origin input validation, no account writes, and cancellation. Browser QA must separately prove real model generation, multiple streamed deltas, follow-up behavior, cancellation, source-only mode and mobile layout. A passing build or fallback answer alone does not prove the model is operational.
