import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import sql from '@/lib/db';
import { setSessionWorksheet, getWorksheetsByTutor } from '@/lib/db';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authSession = await auth();
  const role = (authSession?.user as { role?: string } | undefined)?.role;
  if (!authSession || role !== 'tutor') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;

  const [sessionRow] = await sql`
    SELECT id, student_id FROM sessions WHERE id = ${id} AND tutor_id = ${authSession.user.id}
  `;
  if (!sessionRow) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const [attached, available] = await Promise.all([
    sql`
      SELECT w.id, w.title FROM worksheets w
      JOIN sessions s ON s.worksheet_id = w.id
      WHERE s.id = ${id}
      LIMIT 1
    `,
    getWorksheetsByTutor(authSession.user.id),
  ]);

  return NextResponse.json({
    attached: (attached[0] as { id: string; title: string } | undefined) ?? null,
    available: (available as { id: string; title: string; student_id: string }[]).filter(
      (w) => w.student_id === sessionRow.student_id
    ),
  });
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authSession = await auth();
  const role = (authSession?.user as { role?: string } | undefined)?.role;
  if (!authSession || role !== 'tutor') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;

  const [sessionRow] = await sql`
    SELECT id, student_id FROM sessions WHERE id = ${id} AND tutor_id = ${authSession.user.id}
  `;
  if (!sessionRow) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { worksheetId } = (await req.json()) as { worksheetId: string | null };

  if (worksheetId !== null) {
    const [ws] = await sql`
      SELECT id FROM worksheets WHERE id = ${worksheetId} AND created_by = ${authSession.user.id}
    `;
    if (!ws) return NextResponse.json({ error: 'Worksheet not found' }, { status: 404 });
  }

  await setSessionWorksheet(id, worksheetId);
  return NextResponse.json({ ok: true });
}
