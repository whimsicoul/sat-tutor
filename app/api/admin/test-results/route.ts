import { auth } from '@/lib/auth';
import sql from '@/lib/db';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const session = await auth();
  if (!session || (session.user as { role?: string }).role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { studentId, testName, testDate, totalScore, mathScore, readingWritingScore, notes } = await req.json();

  if (!studentId || !testName || !testDate) {
    return NextResponse.json({ error: 'studentId, testName, and testDate are required' }, { status: 400 });
  }

  const [result] = await sql`
    INSERT INTO test_results (student_id, test_name, test_date, total_score, math_score, reading_writing_score, notes)
    VALUES (${studentId}, ${testName}, ${testDate}, ${totalScore ?? null}, ${mathScore ?? null}, ${readingWritingScore ?? null}, ${notes ?? null})
    RETURNING id, student_id, test_name, test_date, total_score, math_score, reading_writing_score, notes, created_at
  `;

  const [student] = await sql`SELECT name FROM users WHERE id = ${studentId}`;

  return NextResponse.json({ ...result, student_name: student.name });
}
