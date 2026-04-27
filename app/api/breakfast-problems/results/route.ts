import { auth } from '@/lib/auth';
import {
  getBreakfastResultsForTutorStudents,
  getLastSessionDatePerStudent,
  getAllBreakfastResults,
} from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  const session = await auth();
  const role = session?.user?.role;

  if (role === 'tutor') {
    const tutorId = session!.user.id;
    const [results, lastSessionDates] = await Promise.all([
      getBreakfastResultsForTutorStudents(tutorId),
      getLastSessionDatePerStudent(tutorId),
    ]);
    return NextResponse.json({ results, lastSessionDates });
  }

  if (role === 'admin') {
    const results = await getAllBreakfastResults();
    return NextResponse.json({ results });
  }

  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}
