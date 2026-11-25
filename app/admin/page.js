'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const EMPTY = { name: '', price: '', category: '', description: '', image: '' };

export default function AdminPage() {
  const router = useRouter();
  const [products, setProducts] = useState([]);
  const [storageMode, setStorageMode] = useState('');
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState(null);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function load() {
    const res = await fetch('/api/products', { cache: 'no-store' });
    const data = await res.json();
    setProducts(data.products);
    setStorageMode(data.storageMode);
  }

  useEffect(() => {
    load();
  }, []);

  function startEdit(p) {
    setEditingId(p.id);
    setForm({ ...p, price: String(p.price) });
    setStatus('');
    setError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function reset() {
    setEditingId(null);
    setForm(EMPTY);
  }

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setStatus('');
    const res = await fetch(editingId ? `/api/products/${editingId}` : '/api/products', {
      method: editingId ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (res.status === 401) return router.push('/admin/login');
    if (!res.ok) return setError(data.error || 'Save failed.');
    setStatus(editingId ? `Saved changes to “${data.product.name}”.` : `Added “${data.product.name}”.`);
    reset();
    load();
  }

  async function remove(p) {
    if (!confirm(`Delete “${p.name}”? This can’t be undone.`)) return;
    const res = await fetch(`/api/products/${p.id}`, { method: 'DELETE' });
    if (res.status === 401) return router.push('/admin/login');
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return setError(data.error || 'Delete failed.');
    }
    setStatus(`Deleted “${p.name}”.`);
    if (editingId === p.id) reset();
    load();
  }

  async function logout() {
    await fetch('/api/logout', { method: 'POST' });
    router.push('/admin/login');
  }

  const field = (key) => ({
    value: form[key],
    onChange: (e) => setForm((f) => ({ ...f, [key]: e.target.value })),
  });

  return (
    <div className="py-10">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-bold text-pine">Manage catalog</h1>
        <button onClick={logout} className="text-sm text-stone hover:text-pine">
          Sign out
        </button>
      </div>

      {storageMode === 'tmp-file' && (
        <p className="mt-4 rounded-md bg-signal/30 px-4 py-3 text-sm">
          Storage is temporary on this deployment: edits will disappear when the server restarts. Connect Upstash
          Redis to keep them.
        </p>
      )}

      <form onSubmit={save} className="mt-6 grid gap-4 rounded-lg border border-pine/15 bg-white p-5 md:grid-cols-2">
        <h2 className="font-display text-xl font-semibold md:col-span-2">
          {editingId ? `Edit “${products.find((p) => p.id === editingId)?.name ?? ''}”` : 'Add a product'}
        </h2>
        <label className="block">
          <span className="text-sm text-stone">Name</span>
          <input {...field('name')} required className="mt-1 w-full rounded-md border border-pine/30 px-3 py-2" />
        </label>
        <label className="block">
          <span className="text-sm text-stone">Price (USD)</span>
          <input
            {...field('price')}
            required
            type="number"
            min="0"
            step="0.01"
            className="mt-1 w-full rounded-md border border-pine/30 px-3 py-2"
          />
        </label>
        <label className="block">
          <span className="text-sm text-stone">Category</span>
          <input {...field('category')} className="mt-1 w-full rounded-md border border-pine/30 px-3 py-2" />
        </label>
        <label className="block">
          <span className="text-sm text-stone">Image URL (leave blank for a placeholder)</span>
          <input {...field('image')} className="mt-1 w-full rounded-md border border-pine/30 px-3 py-2" />
        </label>
        <label className="block md:col-span-2">
          <span className="text-sm text-stone">Description</span>
          <textarea
            {...field('description')}
            required
            rows={3}
            className="mt-1 w-full rounded-md border border-pine/30 px-3 py-2"
          />
        </label>
        {error && <p className="text-sm text-red-700 md:col-span-2">{error}</p>}
        {status && <p className="text-sm text-pine md:col-span-2">{status}</p>}
        <div className="flex gap-3 md:col-span-2">
          <button disabled={saving} className="rounded-md bg-pine px-5 py-2.5 font-semibold text-birch disabled:opacity-40">
            {saving ? 'Saving…' : editingId ? 'Save changes' : 'Add product'}
          </button>
          {editingId && (
            <button type="button" onClick={reset} className="rounded-md px-4 py-2.5 text-stone hover:text-ink">
              Cancel
            </button>
          )}
        </div>
      </form>

      <table className="mt-10 w-full text-left text-sm">
        <thead className="border-b border-pine/20 text-stone">
          <tr>
            <th className="py-2 font-normal">Product</th>
            <th className="py-2 font-normal">Category</th>
            <th className="py-2 font-normal">Price</th>
            <th className="py-2" />
          </tr>
        </thead>
        <tbody>
          {products.map((p) => (
            <tr key={p.id} className="border-b border-pine/10">
              <td className="py-3 font-medium">{p.name}</td>
              <td className="py-3 text-stone">{p.category}</td>
              <td className="py-3">${p.price.toFixed(2)}</td>
              <td className="space-x-3 py-3 text-right">
                <button onClick={() => startEdit(p)} className="text-pine underline">
                  Edit
                </button>
                <button onClick={() => remove(p)} className="text-red-700 underline">
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
