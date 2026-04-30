import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { deleteSessionSeries } from '@/lib/db';

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if ((session.user as { role?: string }).role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await deleteSessionSeries(params.id);
  return NextResponse.json({ seriesId: params.id });
}
