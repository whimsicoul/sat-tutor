import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { updateProblemSetQuestion, deleteProblemSetQuestion, updateProblemSetExtractionStatus } from '@/lib/db';
import sql from '@/lib/db';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; qid: string }> }) {
  const session = await auth();
  if (!session || (session.user as { role?: string }).role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const { qid } = await params;

  const body = await req.json() as {
    stem?: string;
    choice_a?: string;
    choice_b?: string;
    choice_c?: string;
    choice_d?: string;
    passage?: string | null;
    question_image_url?: string | null;
    crop_top_px?: number | null;
    crop_bottom_px?: number | null;
    image_width_px?: number | null;
    image_height_px?: number | null;
  };

  const updated = await updateProblemSetQuestion(qid, body);
  if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ question: updated });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; qid: string }> }) {
  const session = await auth();
  if (!session || (session.user as { role?: string }).role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const { id, qid } = await params;

  await deleteProblemSetQuestion(qid);

  const countRow = await sql`SELECT COUNT(*)::int AS cnt FROM problem_set_questions WHERE problem_set_id = ${id}`;
  const cnt = (countRow[0]?.cnt as number) ?? 0;
  await updateProblemSetExtractionStatus(id, cnt > 0 ? 'done' : 'pending', cnt);

  return NextResponse.json({ ok: true });
}
