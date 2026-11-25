import { getProducts } from '@/lib/store';
import ProductGrid from '@/components/ProductGrid';

// Render per request so admin edits appear immediately (a static build would freeze the catalog).
export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const products = await getProducts();
  return <ProductGrid products={products} />;
}
