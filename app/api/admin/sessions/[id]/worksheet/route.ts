import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getSessionById, setSessionWorksheet, getAllWorksheets } from '@/lib/db';
import sql from '@/lib/db';

async function requireAdmin() {
  const session = await auth();
  if (!session) return null;
  if ((session.user as { role?: string }).role !== 'admin') return null;
  return session;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const sessionRow = await getSessionById(id);
  if (!sessionRow) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const [attached, available] = await Promise.all([
    sql`
      SELECT w.id, w.title FROM worksheets w
      JOIN sessions s ON s.worksheet_id = w.id
      WHERE s.id = ${id}
      LIMIT 1
    `,
    getAllWorksheets(),
  ]);

  return NextResponse.json({
    attached: (attached[0] as { id: string; title: string } | undefined) ?? null,
    available,
  });
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const sessionRow = await getSessionById(id);
  if (!sessionRow) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { worksheetId } = (await req.json()) as { worksheetId: string | null };

  if (worksheetId !== null) {
    const [ws] = await sql`SELECT id FROM worksheets WHERE id = ${worksheetId}`;
    if (!ws) return NextResponse.json({ error: 'Worksheet not found' }, { status: 404 });
  }

  await setSessionWorksheet(id, worksheetId);
  return NextResponse.json({ ok: true });
}
