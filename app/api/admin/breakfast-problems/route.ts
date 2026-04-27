import { auth } from '@/lib/auth';
import { getAllBreakfastProblems, bulkInsertBreakfastProblems } from '@/lib/db';
import { NextResponse } from 'next/server';

const VALID_ANSWERS = new Set(['A', 'B', 'C', 'D']);

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const rows = await getAllBreakfastProblems();
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { rows } = await req.json();
  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: 'rows must be a non-empty array' }, { status: 400 });
  }

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    if (!r.question || !r.choice_a || !r.choice_b || !r.choice_c || !r.choice_d || !r.correct_answer) {
      return NextResponse.json({ error: `Row ${i + 1} is missing required fields` }, { status: 400 });
    }
    if (!VALID_ANSWERS.has(r.correct_answer.toUpperCase())) {
      return NextResponse.json({ error: `Row ${i + 1}: correct_answer must be A, B, C, or D` }, { status: 400 });
    }
  }

  const inserted = await bulkInsertBreakfastProblems(rows);
  return NextResponse.json({ inserted: inserted.length }, { status: 201 });
}
