import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import sql from '@/lib/db';
import { adminUpdateSessionStatus, adminUpdateSessionTutor } from '@/lib/db';

export async function DELETE(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session || (session.user as { role?: string }).role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const [existing] = await sql`SELECT id FROM sessions WHERE id = ${params.id}`;
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await sql`DELETE FROM sessions WHERE id = ${params.id}`;
  return new NextResponse(null, { status: 204 });
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session || (session.user as { role?: string }).role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json() as { status?: string; tutorId?: string };

  // Reassign tutor
  if (body.tutorId) {
    const [tutor] = await sql`SELECT id FROM users WHERE id = ${body.tutorId} AND role = 'tutor'`;
    if (!tutor) return NextResponse.json({ error: 'Tutor not found' }, { status: 404 });
    const updated = await adminUpdateSessionTutor(params.id, body.tutorId);
    if (!updated) return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    return NextResponse.json(updated);
  }

  // Update status
  if (body.status !== undefined) {
    if (body.status !== 'approved' && body.status !== 'denied') {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }
    try {
      const updated = await adminUpdateSessionStatus(params.id, body.status);
      if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      return NextResponse.json(updated);
    } catch (err) {
      console.error('[PATCH /api/admin/sessions/[id]]', err);
      return NextResponse.json({ error: String(err) }, { status: 500 });
    }
  }

  return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
}
