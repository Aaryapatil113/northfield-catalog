import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getProduct } from '@/lib/store';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }) {
  const product = await getProduct(params.id);
  return { title: product ? `${product.name} | Northfield Goods` : 'Product not found | Northfield Goods' };
}

export default async function ProductPage({ params }) {
  const product = await getProduct(params.id);
  if (!product) notFound();

  return (
    <article className="pt-8">
      <Link href="/" className="text-sm text-stone hover:text-pine">
        ← All products
      </Link>
      <div className="mt-6 grid gap-10 md:grid-cols-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={product.image} alt={product.name} className="w-full rounded-lg bg-pine/10" />
        <div>
          <p className="text-sm text-stone">{product.category}</p>
          <h1 className="mt-1 font-display text-4xl font-bold leading-tight text-pine">{product.name}</h1>
          <p className="mt-4 font-display text-3xl font-semibold">${product.price.toFixed(2)}</p>
          <p className="mt-6 max-w-prose leading-relaxed">{product.description}</p>
          <button
            type="button"
            className="mt-8 rounded-md bg-pine px-6 py-3 font-semibold text-birch hover:bg-pine/90"
          >
            Add to cart
          </button>
          <p className="mt-3 text-sm text-stone">Demo store: checkout isn’t connected.</p>
        </div>
      </div>
    </article>
  );
}
