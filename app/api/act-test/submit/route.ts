import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';
import {
  getActAnswerKey,
  saveActResponse,
  completeActAttempt,
  getActiveActAttempt,
} from '@/lib/db';

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = session.user.id as string;
  const { attemptId, section, answers } = await req.json() as {
    attemptId: string;
    section: string;
    answers: { questionNumber: number; answer: string }[];
  };

  if (!attemptId || !section || !Array.isArray(answers)) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  // Verify this attempt belongs to the current user and is still open
  const attempt = await getActiveActAttempt(userId, section);
  if (!attempt || String(attempt.id) !== attemptId) {
    return NextResponse.json({ error: 'Attempt not found or already completed' }, { status: 404 });
  }

  const keyRows = await getActAnswerKey(section);
  const keyMap = new Map(keyRows.map(r => [Number(r.question_number), String(r.correct_answer).toUpperCase()]));

  const results: { questionNumber: number; isCorrect: boolean; correctAnswer: string }[] = [];

  for (const { questionNumber, answer } of answers) {
    const correct = keyMap.get(questionNumber) ?? null;
    const isCorrect = correct !== null && answer.toUpperCase() === correct;
    await saveActResponse(attemptId, userId, section, questionNumber, answer.toUpperCase(), isCorrect);
    results.push({ questionNumber, isCorrect, correctAnswer: correct ?? '' });
  }

  await completeActAttempt(attemptId);

  const score = results.filter(r => r.isCorrect).length;
  return NextResponse.json({ score, total: results.length, results });
}
