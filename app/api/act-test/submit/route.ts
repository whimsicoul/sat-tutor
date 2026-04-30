import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';
import {
  getActAnswerKey,
  saveActResponse,
  completeActAttempt,
  getActiveActAttempt,
  actRawToScale,
  getActScoredRawForStudent,
  insertActCompositeResult,
} from '@/lib/db';

const COMPOSITE_SECTIONS = ['english', 'math', 'reading'] as const;

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

  const attempt = await getActiveActAttempt(userId, section);
  if (!attempt || String(attempt.id) !== attemptId) {
    return NextResponse.json({ error: 'Attempt not found or already completed' }, { status: 404 });
  }

  const keyRows = await getActAnswerKey(section);
  const keyMap = new Map(keyRows.map(r => [
    Number(r.question_number),
    {
      correct: String(r.correct_answer).toUpperCase(),
      isScored: Boolean(r.is_scored),
      category: r.reporting_category as string | null,
    },
  ]));

  const results: {
    questionNumber: number;
    isCorrect: boolean;
    isScored: boolean;
    correctAnswer: string;
    reportingCategory: string | null;
  }[] = [];

  for (const { questionNumber, answer } of answers) {
    const key = keyMap.get(questionNumber);
    const isScored = key?.isScored ?? false;
    const isCorrect = isScored && answer.toUpperCase() === key!.correct;
    await saveActResponse(attemptId, userId, section, questionNumber, answer.toUpperCase(), isCorrect);
    results.push({
      questionNumber,
      isCorrect,
      isScored,
      correctAnswer: key?.correct ?? '',
      reportingCategory: key?.category ?? null,
    });
  }

  await completeActAttempt(attemptId);

  // Raw and scale scores (scored questions only)
  const scoredResults = results.filter(r => r.isScored);
  const rawScore = scoredResults.filter(r => r.isCorrect).length;
  const scoredTotal = scoredResults.length;
  const scaleScore = actRawToScale(section, rawScore);

  // Subcategory breakdown
  const subcategoryMap = new Map<string, { correct: number; total: number }>();
  for (const r of scoredResults) {
    const cat = r.reportingCategory ?? 'Other';
    const entry = subcategoryMap.get(cat) ?? { correct: 0, total: 0 };
    entry.total += 1;
    if (r.isCorrect) entry.correct += 1;
    subcategoryMap.set(cat, entry);
  }
  const subcategories = Object.fromEntries(subcategoryMap);

  // Composite score: check if all three composite sections now have completed attempts
  let compositeScore: number | null = null;
  if ((COMPOSITE_SECTIONS as readonly string[]).includes(section)) {
    const sectionRaws = await getActScoredRawForStudent(userId);
    const completedSections = new Set(sectionRaws.map(r => r.section));

    // Inject the current section's raw (in case DB hasn't refreshed yet)
    const currentRawMap = new Map(sectionRaws.map(r => [r.section, r.raw_correct]));
    currentRawMap.set(section, rawScore);

    const allThreeDone = COMPOSITE_SECTIONS.every(s => completedSections.has(s) || s === section);
    if (allThreeDone) {
      const engScale = actRawToScale('english', currentRawMap.get('english') ?? 0);
      const mathScale = actRawToScale('math', currentRawMap.get('math') ?? 0);
      const readScale = actRawToScale('reading', currentRawMap.get('reading') ?? 0);
      compositeScore = Math.round((engScale + mathScale + readScale) / 3);
      await insertActCompositeResult(userId, 'ACT1 Practice', compositeScore, engScale, mathScale, readScale);
    }
  }

  return NextResponse.json({
    score: rawScore,
    total: scoredTotal,
    scaleScore,
    subcategories,
    results,
    compositeScore,
  });
}
