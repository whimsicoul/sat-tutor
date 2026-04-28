import { auth } from '@/lib/auth';
import { deleteBreakfastProblem, updateBreakfastProblem } from '@/lib/db';
import { NextResponse } from 'next/server';

const VALID_ANSWERS = new Set(['A', 'B', 'C', 'D']);

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await deleteBreakfastProblem(params.id);
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

  const updated = await updateBreakfastProblem(params.id, {
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
  });

  if (!updated) {
    return NextResponse.json({ error: 'Problem not found' }, { status: 404 });
  }

  return NextResponse.json(updated);
}
