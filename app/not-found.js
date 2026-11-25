import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="py-20">
      <h1 className="font-display text-3xl font-bold text-pine">That product isn’t in the catalog</h1>
      <p className="mt-3 text-stone">It may have been removed. Browse what’s available instead.</p>
      <Link href="/" className="mt-6 inline-block rounded-md bg-pine px-5 py-2.5 font-semibold text-birch">
        See all products
      </Link>
    </div>
  );
}
