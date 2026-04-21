import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { adminBulkUpdateSessionStatus } from '@/lib/db';

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session || (session.user as { role?: string }).role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { ids, status } = await req.json();
  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: 'ids must be a non-empty array' }, { status: 400 });
  }
  if (status !== 'approved' && status !== 'denied') {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }

  const updated = await adminBulkUpdateSessionStatus(ids, status);
  return NextResponse.json({ updated });
}
