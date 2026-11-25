import { NextResponse } from 'next/server';
import { getProducts, createProduct, validateProduct, storageMode } from '@/lib/store';
import { isAdminRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const products = await getProducts();
  return NextResponse.json({ products, storageMode });
}

export async function POST(request) {
  if (!(await isAdminRequest(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  const { data, error } = validateProduct(body);
  if (error) return NextResponse.json({ error }, { status: 400 });

  try {
    const product = await createProduct(data);
    return NextResponse.json({ product }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: `Could not save: ${err.message}` }, { status: 500 });
  }
}
