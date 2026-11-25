# Bug log — Northfield Goods catalog

Each entry: what happened, how to reproduce it, the root cause, the fix, and how the fix was verified.
Severity: **High** = feature broken for users · **Medium** = wrong results or data loss in some cases · **Low** = cosmetic/minor.

---

## BUG-001 — Search misses words that appear late in product descriptions

| | |
|---|---|
| **Area** | Smart search |
| **Severity** | Medium |
| **Found by** | TC-05 |
| **Status** | Fixed in `components/ProductGrid.js` |

**Steps to reproduce (before fix)**
1. Remove `ignoreLocation: true` from the Fuse options.
2. Search `cup holders`.

**Expected:** Summit Insulated Trail Mug is returned.
**Actual:** No results, even though "cup holders" is in the mug's description.

**Root cause:** Fuse.js scores matches by distance from the start of a field (`location: 0`, `distance: 100` by default). With `threshold: 0.4`, a match more than ~40 characters into a field scores too poorly to be returned, so long descriptions were effectively only searched in their first sentence.

**Fix:** Set `ignoreLocation: true`. Weighted keys (name 0.6, description 0.3, category 0.1) keep name matches ranked first.

**Verification:** `cup holders` returns the mug; `hedlamp` still ranks the headlamp first (no regression on typo matching).

---

## BUG-002 — Page loads unstyled with a runtime error in Safari

| | |
|---|---|
| **Area** | Frontend / cross-browser |
| **Severity** | High |
| **Found by** | Smoke test in Safari (now TC-03) |
| **Status** | Fixed in `app/layout.js` and `components/Analytics.js` |

**Steps to reproduce (before fix)**
1. Root layout renders an explicit `<head>` element containing a conditional inline GA script.
2. Run `npm run dev` and open `/` in Safari.

**Expected:** Styled page with custom fonts and a floating chat button.
**Actual:** Browser-default styling (Times font, blue underlined links, chat button inline at the bottom left) and a Next.js overlay: `TypeError: null is not an object (evaluating 'instance.parentNode.removeChild')`. Search still worked, so the JavaScript was running; only styling and layout were lost.

**Root cause (suspected):** React failed to hydrate the root layout: the server HTML and the browser DOM didn't match at `<head>`. React then re-rendered the whole document on the client and, during that rebuild, tried to remove a node that no longer existed and dropped the stylesheet. The hand-written `<head>` block was the most likely trigger; Safari features or extensions that modify the page can cause the same mismatch.

**Fix:** Removed the explicit `<head>` block; GA setup moved into the client-side `<Analytics/>` component, and `gtag.js` loads via `next/script`. Added `suppressHydrationWarning` to `<html>` and `<body>` to tolerate attributes added by browser extensions. Cleared the `.next` build cache.

**Verification:** After the fix, the homepage and product pages render fully styled in Safari with no error overlay. Search, the detail page, and the chat widget all work.

---

## BUG-003 — Admin changes disappear on the Vercel deployment

| | |
|---|---|
| **Area** | CMS / storage |
| **Severity** | High |
| **Found by** | TC-11 on the deployed site |
| **Status** | Fixed in `lib/store.js` (requires Upstash Redis on Vercel) |

**Steps to reproduce (before fix)**
1. Deploy with storage writing to `data/products.json` (the path used locally).
2. Sign in to `/admin` and add a product.

**Expected:** Product is saved and appears on the homepage.
**Actual:** Save fails with `EROFS: read-only file system`. Writing to `/tmp` instead "succeeds", but the product disappears after a cold start or shows on some refreshes and not others.

**Root cause:** Vercel serverless functions have a read-only filesystem except `/tmp`, which is per-instance and wiped on cold starts. Locally there's one long-running process with a writable disk, so this can't be seen in development.

**Fix:** Storage adapter: Upstash Redis (REST API) when its env vars are present, a file otherwise. When the deployment falls back to `/tmp`, the admin page shows a warning that edits are temporary instead of failing silently.

**Verification:** With Redis connected, added a product, redeployed, and it was still listed. Without Redis, the warning banner appears on `/admin`.

---

## BUG-004 — Chatbot shows a raw "API 401" error when the API key is invalid

| | |
|---|---|
| **Area** | AI chatbot |
| **Severity** | High |
| **Found by** | TC-07 |
| **Status** | Fixed in `app/api/chat/route.js` |

**Steps to reproduce (before fix)**
1. Set `ANTHROPIC_API_KEY` in `.env.local` to an invalid value.
2. Open the chat widget and ask "what's the price of the hammock?"

**Expected:** The user gets an answer, or at least a helpful message.
**Actual:** "The assistant is unavailable right now (API 401)." Server log: `authentication_error: invalid x-api-key`. The chatbot was completely unusable, and the error exposed an internal status code to customers.

**Root cause:** The chatbot depended entirely on one external API. Any configuration problem (missing, invalid, or expired key; no credits; provider outage) took the feature down, and the error was passed straight to the UI.

**Fix:** Added a built-in catalog assistant (`lib/localAssistant.js`) with keyword and typo-tolerant matching, synonyms, and intents for price, budget, cheapest/most expensive, and policy questions. The API route uses Claude only when a key is set and falls back to the built-in assistant on any failure, logging the reason server-side. The widget shows which mode answered.

**Verification:** With an invalid key, the hammock question returns "$58.00… rated to 400 lbs" and the server logs the fallback. Tested 14 questions, including "Do you sell tents?" (correctly says not in catalog), "What's your return policy?" (says it has no policy info), "anything under $30?", and the typo "hedlamp".

---

### Other issues noticed, not logged in detail
- Homepage could be statically rendered at build time, freezing the catalog; fixed with `dynamic = 'force-dynamic'`.
- GA `search` event fired on every keystroke (`m`, `mu`, `mug`); fixed with an 800 ms debounce.
- Page views double-counted when GA4 enhanced measurement's history-change tracking is on alongside manual `page_view` events; documented in README.
- `npm audit` reports 1 high and 1 critical advisory against Next.js 14.2.35; the fix requires Next 15+, deferred for this demo.
