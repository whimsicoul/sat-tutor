import { auth } from '@/lib/auth';
import { deleteHomework } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.user.role !== 'tutor' && session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await deleteHomework(params.id);
  return NextResponse.json({ success: true });
}
