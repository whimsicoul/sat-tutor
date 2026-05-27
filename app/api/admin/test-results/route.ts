import { auth } from '@/lib/auth';
import sql from '@/lib/db';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const session = await auth();
  if (!session || (session.user as { role?: string }).role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const {
    studentId,
    testName,
    testDate,
    scoreType,
    totalScore,
    mathScore,
    readingWritingScore,
    actEnglishScore,
    actReadingScore,
    actScienceScore,
    notes,
    pdfUrl,
  } = await req.json();

  if (!studentId || !testName || !testDate) {
    return NextResponse.json({ error: 'studentId, testName, and testDate are required' }, { status: 400 });
  }

  const resolvedScoreType = scoreType === 'act' ? 'act' : 'sat';

  const [result] = await sql`
    INSERT INTO test_results (
      student_id, test_name, test_date, score_type,
      total_score, math_score, reading_writing_score,
      act_english_score, act_reading_score, act_science_score,
      notes, pdf_url
    )
    VALUES (
      ${studentId}, ${testName}, ${testDate}, ${resolvedScoreType},
      ${totalScore ?? null}, ${mathScore ?? null}, ${resolvedScoreType === 'sat' ? (readingWritingScore ?? null) : null},
      ${resolvedScoreType === 'act' ? (actEnglishScore ?? null) : null},
      ${resolvedScoreType === 'act' ? (actReadingScore ?? null) : null},
      ${resolvedScoreType === 'act' ? (actScienceScore ?? null) : null},
      ${notes ?? null}, ${pdfUrl ?? null}
    )
    RETURNING id, student_id, test_name, test_date, score_type,
              total_score, math_score, reading_writing_score,
              act_english_score, act_reading_score, act_science_score,
              notes, pdf_url, created_at
  `;

  const [student] = await sql`SELECT name FROM users WHERE id = ${studentId}`;

  return NextResponse.json({ ...result, student_name: student.name });
}
