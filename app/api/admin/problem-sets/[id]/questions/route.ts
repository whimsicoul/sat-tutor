import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  getProblemSetQuestionsAdmin,
  insertProblemSetQuestion,
  getProblemSetById,
  updateProblemSetExtractionStatus,
} from '@/lib/db';
import sql from '@/lib/db';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || (session.user as { role?: string }).role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const { id } = await params;
  const questions = await getProblemSetQuestionsAdmin(id);
  return NextResponse.json({ questions });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || (session.user as { role?: string }).role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const { id } = await params;
  const ps = await getProblemSetById(id);
  if (!ps) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await req.json() as {
    questionNumber: number;
    stem: string;
    choice_a: string;
    choice_b: string;
    choice_c: string;
    choice_d: string;
    passage?: string | null;
    question_image_url?: string | null;
    crop_top_px?: number | null;
    crop_bottom_px?: number | null;
    image_width_px?: number | null;
    image_height_px?: number | null;
  };

  if (!body.questionNumber || !body.stem || !body.choice_a || !body.choice_b || !body.choice_c || !body.choice_d) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const question = await insertProblemSetQuestion(id, body.questionNumber, {
    stem: body.stem,
    choice_a: body.choice_a,
    choice_b: body.choice_b,
    choice_c: body.choice_c,
    choice_d: body.choice_d,
    passage: body.passage,
    question_image_url: body.question_image_url,
    crop_top_px: body.crop_top_px,
    crop_bottom_px: body.crop_bottom_px,
    image_width_px: body.image_width_px,
    image_height_px: body.image_height_px,
  });

  const countRow = await sql`SELECT COUNT(*)::int AS cnt FROM problem_set_questions WHERE problem_set_id = ${id}`;
  const cnt = (countRow[0]?.cnt as number) ?? 0;
  await updateProblemSetExtractionStatus(id, 'done', cnt);

  return NextResponse.json({ question }, { status: 201 });
}
