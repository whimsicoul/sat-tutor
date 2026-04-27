import { auth } from '@/lib/auth';
import { deleteBreakfastProblem } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await deleteBreakfastProblem(params.id);
  return NextResponse.json({ success: true });
}
