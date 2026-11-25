# QA test plan — Northfield Goods catalog

**Build under test:** `<Vercel URL>` · commit `<sha>`
**Tester:** Aarya · **Date:** `<date>`
**Environments:** Safari macOS (latest), Chrome desktop (latest), Chrome responsive mode at 375 px

Status key: Pass / Fail / Blocked. Record the actual result for every case, not just failures.

| ID | Area | Test case | Steps | Expected result | Actual | Status |
|---|---|---|---|---|---|---|
| TC-01 | Catalog | Homepage lists all products | Open `/` | 10 products show with image, name, price (2 decimals), short description; no console errors | | |
| TC-02 | Catalog | Detail page and missing product | Click any product; then visit `/products/does-not-exist` | Detail page shows the same name/price as the card; bad ID shows the "isn't in the catalog" page with a link home | | |
| TC-03 | Cross-browser | Page renders styled in Safari and Chrome | Open `/` in Safari and Chrome; hard refresh each | Green header, custom fonts, floating yellow "Ask a question" button; no red error overlay | | |
| TC-04 | Search | Typo tolerance | Search `hedlamp`, then `skilet` | Lumen headlamp is the top result; cast iron skillet is the top result | | |
| TC-05 | Search | Matches words late in a description | Search `cup holders` (near the end of the mug description) | Summit mug is returned | | |
| TC-06 | Search | No-result state | Search `snowboard` | Count shows 0 matches and the empty-state message appears | | |
| TC-07 | Chatbot | Grounded answer | Ask "How much is the hammock and how much weight does it hold?" | Reply says $58.00 and 400 lbs and links `/products/canopy-hammock` | | |
| TC-08 | Chatbot | Refuses to invent | Ask "Do you sell tents?" and "What's your return policy?" | Says it doesn't have that product/information; invents nothing | | |
| TC-09 | Chatbot | Reflects CMS changes | In admin, change the mug price to $26.00; ask the bot "price of the mug" | Bot answers $26.00, not $24.00 | | |
| TC-10 | CMS | Auth protection | In a private window, visit `/admin`; then run `fetch('/api/products',{method:'POST'})` in the console | `/admin` redirects to login; the API call returns 401 | | |
| TC-11 | CMS | Add, edit, delete, validate | Sign in; add a product; edit its price; try saving with an empty name and a price of `-5`; delete it | Add/edit appear on `/` after refresh; invalid saves show a specific error and don't save; delete removes it | | |
| TC-12 | Analytics | Events reach GA4 | With GA configured and `NEXT_PUBLIC_GA_DEBUG=true`, open GA4 DebugView; navigate between 2 pages, search `mug`, send one chat message | One `page_view` per navigation, exactly one `search` with `search_term=mug`, one `chat_message_sent`; no message text in any parameter | | |

## Exit criteria
All cases Pass, or each Fail has a bug in BUG_LOG.md with a severity and a decision (fixed / deferred with reason).
