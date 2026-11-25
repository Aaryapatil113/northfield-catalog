// Product storage with two backends:
// 1. Upstash Redis (REST) when KV_* / UPSTASH_* env vars are set -> persistent on Vercel
// 2. JSON file otherwise -> data/products.json locally, /tmp on Vercel (ephemeral!)
// See BUG_LOG.md BUG-003 for why the file backend alone is not enough on Vercel.
import { promises as fs } from 'fs';
import path from 'path';
import seed from '../data/products.json';

const KV_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const KEY = 'catalog:products';
const FILE = process.env.VERCEL
  ? '/tmp/products.json'
  : path.join(process.cwd(), 'data', 'products.json');

export const storageMode = KV_URL && KV_TOKEN ? 'redis' : process.env.VERCEL ? 'tmp-file' : 'file';

async function readAll() {
  if (storageMode === 'redis') {
    const res = await fetch(`${KV_URL}/get/${KEY}`, {
      headers: { Authorization: `Bearer ${KV_TOKEN}` },
      cache: 'no-store',
    });
    if (!res.ok) throw new Error(`Redis read failed: ${res.status}`);
    const { result } = await res.json();
    return result ? JSON.parse(result) : structuredClone(seed);
  }
  try {
    return JSON.parse(await fs.readFile(FILE, 'utf8'));
  } catch (err) {
    if (err.code === 'ENOENT') return structuredClone(seed);
    throw err;
  }
}

async function writeAll(products) {
  const body = JSON.stringify(products, null, 2);
  if (storageMode === 'redis') {
    const res = await fetch(`${KV_URL}/set/${KEY}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${KV_TOKEN}` },
      body,
      cache: 'no-store',
    });
    if (!res.ok) throw new Error(`Redis write failed: ${res.status}`);
    return;
  }
  await fs.writeFile(FILE, body, 'utf8');
}

function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 40);
}

// Returns { data } or { error } so API routes can send 400s with a clear message.
export function validateProduct(input) {
  const name = String(input?.name ?? '').trim();
  const description = String(input?.description ?? '').trim();
  const category = String(input?.category ?? '').trim() || 'Uncategorized';
  const price = Number(input?.price);
  const image =
    String(input?.image ?? '').trim() ||
    `https://placehold.co/600x400/1F3A2E/F5F7F4?text=${encodeURIComponent(name.split(' ')[0] || 'Product')}`;

  if (!name) return { error: 'Name is required.' };
  if (name.length > 80) return { error: 'Name must be 80 characters or fewer.' };
  if (!description) return { error: 'Description is required.' };
  if (description.length > 600) return { error: 'Description must be 600 characters or fewer.' };
  if (!Number.isFinite(price) || price < 0) return { error: 'Price must be a number of 0 or more.' };
  if (!/^https?:\/\//.test(image)) return { error: 'Image must be an http(s) URL.' };

  return { data: { name, description, category, price: Math.round(price * 100) / 100, image } };
}

export async function getProducts() {
  return readAll();
}

export async function getProduct(id) {
  const all = await readAll();
  return all.find((p) => p.id === id) ?? null;
}

export async function createProduct(data) {
  const all = await readAll();
  const id = `${slugify(data.name)}-${Math.random().toString(36).slice(2, 6)}`;
  const product = { id, ...data };
  all.push(product);
  await writeAll(all);
  return product;
}

export async function updateProduct(id, data) {
  const all = await readAll();
  const i = all.findIndex((p) => p.id === id);
  if (i === -1) return null;
  all[i] = { ...all[i], ...data, id };
  await writeAll(all);
  return all[i];
}

export async function deleteProduct(id) {
  const all = await readAll();
  const next = all.filter((p) => p.id !== id);
  if (next.length === all.length) return false;
  await writeAll(next);
  return true;
}
