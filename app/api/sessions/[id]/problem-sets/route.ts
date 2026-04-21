import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import sql from '@/lib/db';
import { setSessionProblemSets } from '@/lib/db';

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session || role !== 'tutor') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Verify this session belongs to the tutor
  const [existing] = await sql`
    SELECT id FROM sessions WHERE id = ${params.id} AND tutor_id = ${session.user.id}
  `;
  if (!existing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const { problemSetIds } = await req.json();
  if (!Array.isArray(problemSetIds)) {
    return NextResponse.json({ error: 'problemSetIds must be an array' }, { status: 400 });
  }

  await setSessionProblemSets(params.id, problemSetIds);
  return NextResponse.json({ success: true });
}
