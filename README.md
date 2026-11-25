# Northfield Goods — demo product catalog

A small Next.js catalog built to exercise the things a website QA/digital intern touches:
fuzzy search, an AI-style product assistant, a basic CMS, and GA4 event tracking.

| Feature | Where |
|---|---|
| Catalog + detail pages | `app/page.js`, `app/products/[id]/page.js` |
| Fuzzy search (Fuse.js) | `components/ProductGrid.js` |
| Product assistant chatbot | `components/ChatWidget.js`, `app/api/chat/route.js`, `lib/localAssistant.js` |
| Password-protected CMS | `app/admin/*`, `app/api/products/*`, `middleware.js` |
| GA4 page views + custom events | `components/Analytics.js`, `lib/analytics.js` |
| Storage (file locally, Upstash Redis on Vercel) | `lib/store.js` |

## Everything here is free

- **Chatbot:** by default it uses a built-in catalog assistant (keyword + typo-tolerant matching, synonyms, and intents for price, budget, cheapest/most expensive, and policy questions). If you add a Claude API key, it switches to Claude automatically and falls back to the built-in assistant if the API fails. The widget shows which mode answered.
- **GA4:** free.
- **Vercel Hobby + Upstash Redis free tier:** free.

## Run locally

```bash
npm install
cp .env.example .env.local   # set ADMIN_PASSWORD; everything else is optional
npm run dev
```

Open http://localhost:3000. Admin is at `/admin`. Locally, edits are written to `data/products.json`.

## Deploy to Vercel

1. Push this folder to a new GitHub repo (`.env.local` is git-ignored, so secrets stay local).
2. In Vercel: **Add New → Project →** import the repo.
3. Add environment variables: `ADMIN_PASSWORD`, plus `NEXT_PUBLIC_GA_ID` and `NEXT_PUBLIC_GA_DEBUG=true` if using GA.
4. For admin edits that persist: in the project's **Storage** tab, add **Upstash for Redis** (free plan) and connect it to the project.
5. Redeploy so the new env vars apply.

## GA4 events

| Event | When | Parameters |
|---|---|---|
| `page_view` | Every route change (sent manually) | `page_path`, `page_location`, `page_title` |
| `search` | 800 ms after typing stops, query ≥ 2 chars | `search_term`, `results_count` |
| `chat_message_sent` | User sends a chat message | `message_length`, `turn` |

Chat message text is deliberately **not** sent to GA (it could contain personal info).

In GA4 → Admin → Data streams → Enhanced measurement, turn **off** "Page changes based on browser history events", otherwise page views are double-counted alongside the manual ones.

## Known limitations

- Fuse.js search and the built-in assistant are fuzzy, not truly semantic: they handle typos and a hand-written synonym list ("cold" → down blanket), not open-ended meaning.
- Admin auth is a single shared password with a hashed cookie, no rate limiting.
- In Claude mode, the whole catalog goes into every request. Fine for 10 products, not 10,000.
- `npm audit` reports advisories against Next.js 14. Fixing them requires a major upgrade to Next 15+; deferred for this demo.
