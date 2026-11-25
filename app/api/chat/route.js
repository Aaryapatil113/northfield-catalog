import { NextResponse } from 'next/server';
import { getProducts } from '@/lib/store';
import { answerLocally } from '@/lib/localAssistant';

export const dynamic = 'force-dynamic';

const MAX_TURNS = 12;
const MAX_CHARS = 1000;

function buildSystemPrompt(products) {
  // Catalog is read per request (not at module load) so admin edits show up in answers.
  const catalog = products.map(({ id, name, price, category, description }) => ({
    id,
    name,
    price_usd: price,
    category,
    description,
    url: `/products/${id}`,
  }));
  return `You are the shopping assistant for Northfield Goods, a small outdoor and camp-kitchen store.

Answer questions using ONLY the product catalog below. Rules:
- If a product or detail is not in the catalog, say you don't have that information. Never invent products, prices, specs, stock levels, shipping, or discount policies.
- Quote prices exactly as listed, in USD.
- When recommending, name the product and include its url path.
- Keep answers short: 1–4 sentences, plain text, no markdown headings.
- If asked about something unrelated to the store, briefly steer back to the products.

Catalog (JSON):
${JSON.stringify(catalog, null, 2)}`;
}

function sanitizeMessages(raw) {
  if (!Array.isArray(raw)) return null;
  let msgs = raw
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_CHARS) }))
    .filter((m) => m.content.trim());
  // The Messages API requires the first message to be from the user.
  while (msgs.length && msgs[0].role !== 'user') msgs.shift();
  msgs = msgs.slice(-MAX_TURNS);
  while (msgs.length && msgs[0].role !== 'user') msgs.shift();
  if (!msgs.length || msgs[msgs.length - 1].role !== 'user') return null;
  return msgs;
}

async function askClaude(apiKey, messages, products) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL || 'claude-haiku-5-5',
      max_tokens: 500,
      system: buildSystemPrompt(products),
      messages,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Anthropic API ${res.status}: ${data?.error?.message ?? 'unknown error'}`);
  return (data.content ?? [])
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('\n')
    .trim();
}

export async function POST(request) {
  const body = await request.json().catch(() => null);
  const messages = sanitizeMessages(body?.messages);
  if (!messages) {
    return NextResponse.json({ error: 'Send at least one user message.' }, { status: 400 });
  }

  const products = await getProducts();
  const question = messages[messages.length - 1].content;
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();

  // Claude mode only when a key is configured; any API failure falls back to
  // the free catalog assistant instead of showing users an error (BUG-004).
  if (apiKey) {
    try {
      const reply = await askClaude(apiKey, messages, products);
      if (reply) return NextResponse.json({ reply, mode: 'claude' });
    } catch (err) {
      console.error('Claude unavailable, using catalog assistant:', err.message);
    }
  }

  return NextResponse.json({ reply: answerLocally(question, products), mode: 'local' });
}
