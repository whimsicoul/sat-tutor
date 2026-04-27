import { auth } from '@/lib/auth';
import { saveBreakfastResponse } from '@/lib/db';
import { NextResponse } from 'next/server';
import sql from '@/lib/db';

interface AnswerInput {
  assignmentId: string;
  problemId: string;
  studentAnswer: string;
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'student') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { answers } = await req.json() as { answers: AnswerInput[] };
  if (!Array.isArray(answers) || answers.length === 0) {
    return NextResponse.json({ error: 'answers must be a non-empty array' }, { status: 400 });
  }

  const studentId = session.user.id;
  const problemIds = answers.map((a) => a.problemId);

  const correctRows = await sql.query(
    'SELECT id, correct_answer FROM breakfast_problems WHERE id = ANY($1::uuid[])',
    [problemIds]
  ) as { id: string; correct_answer: string }[];

  const correctMap = new Map(correctRows.map((r) => [r.id, r.correct_answer]));

  const results: { problemId: string; isCorrect: boolean; correctAnswer: string }[] = [];
  let anyInserted = false;

  for (const a of answers) {
    const correctAnswer = correctMap.get(a.problemId);
    if (!correctAnswer) continue;
    const isCorrect = a.studentAnswer.toUpperCase() === correctAnswer;
    const row = await saveBreakfastResponse(
      a.assignmentId,
      studentId,
      a.problemId,
      a.studentAnswer,
      isCorrect
    );
    if (row) anyInserted = true;
    results.push({ problemId: a.problemId, isCorrect, correctAnswer });
  }

  if (!anyInserted && results.length > 0) {
    return NextResponse.json({ error: 'Already submitted' }, { status: 409 });
  }

  return NextResponse.json({ results });
}
