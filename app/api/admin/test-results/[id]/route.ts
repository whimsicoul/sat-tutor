import { auth } from '@/lib/auth';
import sql from '@/lib/db';
import { NextResponse } from 'next/server';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session || (session.user as { role?: string }).role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await sql`DELETE FROM test_results WHERE id = ${params.id}`;

  return new NextResponse(null, { status: 204 });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session || (session.user as { role?: string }).role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { notes, notesVisibleToStudent } = await req.json();

  const [updated] = await sql`
    UPDATE test_results
    SET
      notes                     = ${notes ?? null},
      notes_visible_to_student  = ${notesVisibleToStudent === true}
    WHERE id = ${params.id}
    RETURNING id, notes, notes_visible_to_student
  `;

  if (!updated) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json(updated);
}
