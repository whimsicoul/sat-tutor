import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import sql from '@/lib/db';
import { emailTutorSessionStatusChanged } from '@/lib/email';

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session || (role !== 'student' && role !== 'tutor')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const [existing] = role === 'student'
    ? await sql`SELECT id FROM sessions WHERE id = ${params.id} AND student_id = ${session.user.id}`
    : await sql`SELECT id FROM sessions WHERE id = ${params.id} AND tutor_id = ${session.user.id}`;
  if (!existing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  await sql`DELETE FROM sessions WHERE id = ${params.id}`;
  return new NextResponse(null, { status: 204 });
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session || role !== 'student') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { status } = await req.json();
  if (status !== 'approved' && status !== 'denied') {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }

  // Verify ownership
  const [existing] = await sql`
    SELECT * FROM sessions WHERE id = ${params.id} AND student_id = ${session.user.id}
  `;
  if (!existing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const [updated] = await sql`
    UPDATE sessions SET status = ${status}
    WHERE id = ${params.id}
    RETURNING *
  `;

  try {
    const [student] = await sql`SELECT name FROM users WHERE id = ${session.user.id}`;
    const [tutor] = await sql`SELECT email FROM users WHERE id = ${existing.tutor_id}`;
    await emailTutorSessionStatusChanged({
      tutorEmail: tutor.email as string,
      studentName: student.name as string,
      status,
      proposedTime: new Date(existing.proposed_time as string),
    });
  } catch {
    // Email failure is non-fatal
  }

  return NextResponse.json(updated);
}
