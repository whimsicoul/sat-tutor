import { auth } from '@/lib/auth';
import { deleteSatDate } from '@/lib/db';
import { NextResponse } from 'next/server';
import sql from '@/lib/db';

export async function DELETE(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || (session.user as { role?: string }).role !== 'student') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  // Ensure this date belongs to the requesting student
  const [row] = await sql`SELECT student_id FROM sat_test_dates WHERE id = ${id} LIMIT 1`;
  if (!row || row.student_id !== session.user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  await deleteSatDate(id);
  return NextResponse.json({ success: true });
}
