import { NextResponse } from 'next/server';
import { getProduct, updateProduct, deleteProduct, validateProduct } from '@/lib/store';
import { isAdminRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(_request, { params }) {
  const product = await getProduct(params.id);
  if (!product) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ product });
}

export async function PUT(request, { params }) {
  if (!(await isAdminRequest(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  const { data, error } = validateProduct(body);
  if (error) return NextResponse.json({ error }, { status: 400 });

  try {
    const product = await updateProduct(params.id, data);
    if (!product) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ product });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: `Could not save: ${err.message}` }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  if (!(await isAdminRequest(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const ok = await deleteProduct(params.id);
    if (!ok) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: `Could not delete: ${err.message}` }, { status: 500 });
  }
}
