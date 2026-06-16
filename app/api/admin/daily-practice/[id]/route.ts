import { auth } from '@/lib/auth';
import { deleteDailyPractice, updateDailyPractice } from '@/lib/db';
import { NextResponse } from 'next/server';

const VALID_ANSWERS = new Set(['A', 'B', 'C', 'D']);

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await deleteDailyPractice(params.id);
  return NextResponse.json({ success: true });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session?.user || (role !== 'admin' && role !== 'tutor')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();

  if (body.correct_answer !== undefined && !VALID_ANSWERS.has(String(body.correct_answer).toUpperCase())) {
    return NextResponse.json({ error: 'correct_answer must be A, B, C, or D' }, { status: 400 });
  }
  if (body.correct_answer) body.correct_answer = String(body.correct_answer).toUpperCase();

  if (body.crop_top_px !== undefined) {
    const v = Number(body.crop_top_px);
    if (!Number.isInteger(v) || v < 0) {
      return NextResponse.json({ error: 'crop_top_px must be a non-negative integer' }, { status: 400 });
    }
  }
  if (body.crop_bottom_px !== undefined) {
    const v = Number(body.crop_bottom_px);
    if (!Number.isInteger(v) || v < 0) {
      return NextResponse.json({ error: 'crop_bottom_px must be a non-negative integer' }, { status: 400 });
    }
  }

  const updateFields: Parameters<typeof updateDailyPractice>[1] = {
    question:           body.question,
    choice_a:           body.choice_a,
    choice_b:           body.choice_b,
    choice_c:           body.choice_c,
    choice_d:           body.choice_d,
    correct_answer:     body.correct_answer,
    answer_explanation: body.answer_explanation,
    category:           body.category,
    skill:              body.skill,
    difficulty:         body.difficulty,
    crop_top_px:    body.crop_top_px    !== undefined ? Number(body.crop_top_px)    : undefined,
    crop_bottom_px: body.crop_bottom_px !== undefined ? Number(body.crop_bottom_px) : undefined,
  };

  const updated = await updateDailyPractice(params.id, updateFields);

  if (!updated) {
    return NextResponse.json({ error: 'Problem not found' }, { status: 404 });
  }

  return NextResponse.json(updated);
}
