import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { adminUpdateSessionStatus } from '@/lib/db';

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session || (session.user as { role?: string }).role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { status } = await req.json();
  if (status !== 'approved' && status !== 'denied') {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }

  const updated = await adminUpdateSessionStatus(params.id, status);
  if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json(updated);
}
