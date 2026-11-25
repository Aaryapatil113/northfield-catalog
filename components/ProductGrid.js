'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Fuse from 'fuse.js';
import { trackEvent } from '@/lib/analytics';

const SEARCH_DEBOUNCE_MS = 800;

export default function ProductGrid({ products }) {
  const [query, setQuery] = useState('');

  const fuse = useMemo(
    () =>
      new Fuse(products, {
        keys: [
          { name: 'name', weight: 0.6 },
          { name: 'description', weight: 0.3 },
          { name: 'category', weight: 0.1 },
        ],
        threshold: 0.4,
        // Without this, Fuse only scores matches near the start of a field,
        // so words late in long descriptions never match (see BUG-001).
        ignoreLocation: true,
        minMatchCharLength: 2,
      }),
    [products]
  );

  const q = query.trim();
  const results = q.length >= 2 ? fuse.search(q).map((r) => r.item) : products;

  // Debounced so GA gets one "search" event per query, not one per keystroke.
  useEffect(() => {
    if (q.length < 2) return;
    const t = setTimeout(() => {
      trackEvent('search', { search_term: q, results_count: results.length });
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
    // results.length is derived from q; intentionally keyed on q only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  return (
    <>
      <section className="py-12 md:py-16">
        <h1 className="max-w-3xl font-display text-4xl font-bold leading-[1.05] text-pine md:text-6xl">
          Gear for the trail, the campsite, and the camp kitchen.
        </h1>
        <label htmlFor="search" className="mt-8 block text-sm text-stone">
          Search by name or what you need it for. Typos are fine.
        </label>
        <input
          id="search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Try “keeps coffee hot” or “hedlamp”"
          className="mt-2 w-full max-w-2xl rounded-md border-2 border-pine bg-white px-4 py-3.5 text-lg placeholder:text-stone/70 focus:outline-none focus-visible:border-signal"
          autoComplete="off"
        />
        <p className="mt-2 text-sm text-stone" aria-live="polite">
          {q.length >= 2 ? `${results.length} of ${products.length} products match` : `${products.length} products`}
        </p>
      </section>

      {results.length === 0 ? (
        <div className="rounded-lg border border-dashed border-pine/30 p-10">
          <p className="font-display text-xl font-semibold text-pine">Nothing matches “{q}”.</p>
          <p className="mt-1 text-stone">Try a broader word like “cooking” or “sleep”, or ask the assistant.</p>
        </div>
      ) : (
        <ul className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((p) => (
            <li key={p.id}>
              <Link href={`/products/${p.id}`} className="group block">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.image} alt="" className="aspect-[3/2] w-full rounded-md bg-pine/10 object-cover" />
                <div className="mt-3 flex items-baseline justify-between gap-4">
                  <h2 className="font-display text-lg font-semibold leading-snug text-ink group-hover:text-pine group-hover:underline">
                    {p.name}
                  </h2>
                  <span className="shrink-0 font-semibold">${p.price.toFixed(2)}</span>
                </div>
                <p className="mt-1 line-clamp-2 text-sm text-stone">{p.description}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
