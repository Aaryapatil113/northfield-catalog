// Free, offline product assistant: answers catalog questions with keyword + typo-tolerant
// matching, a small synonym map, and a few intents (price, budget, cheapest, list, policies).
// Used when no valid ANTHROPIC_API_KEY is configured, or if the Claude API call fails.

const STOP = new Set(
  `a an the is are was be of for to do does did you your i me my it its in on at and or with can could
  have has any good best great what whats which who how much many that this there would should will
  recommend suggest about tell please like show find buy sell sells selling need want looking something
  some get item items product products thing things store shop s price prices cost costs under below
  less than cheap cheaper cheapest expensive most least dollars dollar usd hey hi hello thanks thank`
    .split(/\s+/)
    .filter(Boolean)
);

const SYNONYMS = {
  warm: ['down', 'blanket'],
  cold: ['down', 'blanket'],
  chilly: ['down', 'blanket'],
  overnight: ['blanket', 'hammock', 'headlamp'],
  coffee: ['mug'],
  tea: ['mug'],
  cup: ['mug'],
  drink: ['mug', 'bottle'],
  water: ['bottle', 'filter'],
  hydration: ['bottle', 'daypack'],
  light: ['headlamp', 'lumen'],
  lamp: ['headlamp'],
  flashlight: ['headlamp'],
  torch: ['headlamp'],
  dark: ['headlamp'],
  night: ['headlamp'],
  cook: ['stove', 'skillet'],
  cooking: ['stove', 'skillet', 'cutting'],
  kitchen: ['stove', 'skillet', 'cutting'],
  boil: ['stove'],
  pan: ['skillet'],
  fry: ['skillet'],
  chop: ['cutting', 'board'],
  sleep: ['hammock', 'blanket'],
  nap: ['hammock'],
  relax: ['hammock'],
  bag: ['daypack'],
  backpack: ['daypack'],
  pack: ['daypack'],
  laptop: ['daypack'],
  hike: ['daypack', 'headlamp', 'bottle'],
  hiking: ['daypack', 'headlamp', 'bottle'],
  write: ['journal'],
  notebook: ['journal'],
  notes: ['journal'],
  rain: ['waterproof'],
};

const POLICY_RE = /\b(return|refund|shipping|ship|deliver|delivery|discount|coupon|promo|stock|available|availability|warranty|exchange)\b/i;
const LIST_RE = /\b(what do you (sell|have|carry)|all (your )?products|everything|full catalog|catalog|categories|list)\b/i;
const PRICE_RE = /\b(price|cost|how much)\b|\$/i;
const CHEAPEST_RE = /\b(cheapest|least expensive|lowest price|most affordable)\b/i;
const PRICIEST_RE = /\b(most expensive|priciest|highest price)\b/i;
const BUDGET_RE = /\b(under|below|less than|cheaper than|up to|max(imum)?)\s*\$?\s*(\d+(\.\d+)?)/i;
const GREETING_RE = /^\s*(hi|hello|hey|yo|good (morning|afternoon|evening))\b/i;

function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .split(' ')
    .filter((t) => t.length >= 2)
    .map((t) => (t.length > 3 && t.endsWith('s') && !t.endsWith('ss') ? t.slice(0, -1) : t));
}

// Edit distance capped at 2 (enough for typo tolerance, cheap to compute).
function closeEnough(a, b) {
  if (a === b) return true;
  if (Math.min(a.length, b.length) < 4 || Math.abs(a.length - b.length) > 1) return false;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[b.length] <= 1;
}

function scoreProduct(product, queryTokens) {
  const fields = [
    { tokens: tokenize(product.name), weight: 3 },
    { tokens: tokenize(product.category || ''), weight: 2 },
    { tokens: tokenize(product.description || ''), weight: 1 },
  ];
  let score = 0;
  for (const { token, weight: qWeight } of queryTokens) {
    let best = 0;
    for (const f of fields) {
      for (const t of f.tokens) {
        if (t === token) best = Math.max(best, f.weight);
        else if (closeEnough(t, token)) best = Math.max(best, f.weight * 0.7);
      }
    }
    score += best * qWeight;
  }
  return score;
}

const money = (n) => `$${Number(n).toFixed(2)}`;
const link = (p) => `/products/${p.id}`;
const firstSentence = (s = '') => (s.match(/^.*?[.!?](\s|$)/)?.[0] ?? s).trim();

export function answerLocally(question, products) {
  const q = String(question || '').trim();
  if (!q) return 'Ask me about any product: prices, what it’s for, or what fits your budget.';

  if (POLICY_RE.test(q)) {
    return "I don't have information about shipping, returns, stock, or discounts. I can only answer questions about the products themselves and their prices.";
  }

  const budgetMatch = q.match(BUDGET_RE);
  const budget = budgetMatch ? Number(budgetMatch[3]) : null;
  const pool = budget !== null ? products.filter((p) => p.price <= budget) : products;

  // Query tokens plus synonym expansions (expansions count half).
  const base = tokenize(q).filter((t) => !STOP.has(t) && (budget === null || t !== String(budget)));
  const queryTokens = base.map((token) => ({ token, weight: 1 }));
  for (const t of base) {
    for (const s of SYNONYMS[t] ?? []) queryTokens.push({ token: s, weight: 0.5 });
  }

  const ranked = pool
    .map((p) => ({ p, score: scoreProduct(p, queryTokens) }))
    .filter((r) => r.score >= 1)
    .sort((a, b) => b.score - a.score);

  if (CHEAPEST_RE.test(q) || PRICIEST_RE.test(q)) {
    const candidates = ranked.length ? ranked.map((r) => r.p) : pool;
    if (!candidates.length) return `Nothing in the catalog is under ${money(budget)}.`;
    const sorted = [...candidates].sort((a, b) => a.price - b.price);
    const p = CHEAPEST_RE.test(q) ? sorted[0] : sorted[sorted.length - 1];
    return `The ${CHEAPEST_RE.test(q) ? 'cheapest' : 'most expensive'} option is the ${p.name} at ${money(p.price)}. ${firstSentence(p.description)} (${link(p)})`;
  }

  if (!ranked.length) {
    if (budget !== null) {
      if (!pool.length) return `Nothing in the catalog is under ${money(budget)}. Our lowest price is ${money(Math.min(...products.map((p) => p.price)))}.`;
      const list = [...pool].sort((a, b) => a.price - b.price).map((p) => `${p.name} (${money(p.price)})`).join(', ');
      return `Under ${money(budget)} we have: ${list}.`;
    }
    if (GREETING_RE.test(q)) return 'Hi! Ask me about a product, a price, or what to bring for a trip.';
    if (LIST_RE.test(q) || base.length === 0) {
      const cats = {};
      for (const p of products) (cats[p.category] ??= []).push(p.name);
      return `We carry ${products.length} products: ` + Object.entries(cats).map(([c, names]) => `${c}: ${names.join(', ')}`).join('. ') + '.';
    }
    return "I couldn't find that in our catalog. Try asking about cooking gear, lighting, sleep, packs, or drinkware.";
  }

  const top = ranked[0];
  const close = ranked.filter((r) => r.score >= top.score * 0.8).slice(0, 3);

  if (close.length === 1) {
    const p = top.p;
    const lead = PRICE_RE.test(q) ? `The ${p.name} is ${money(p.price)}.` : `I'd suggest the ${p.name} (${money(p.price)}).`;
    return `${lead} ${p.description} (${link(p)})`;
  }

  const lines = close.map(({ p }) => `${p.name}, ${money(p.price)} (${link(p)})`).join('; ');
  return `A few options match: ${lines}. Ask about any of them for details.`;
}
